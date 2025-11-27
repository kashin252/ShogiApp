import { ShogiGame } from './game';
import { SearchResult, PIECE_VALUES } from '../types/game.types';
import { generateMoves } from './moveGenerator';
import { makeMove, unmakeMove } from './makeMove';
import { isInCheck } from './check';
import { evaluate } from './evaluate';
import { TT_MASK, TT_EXACT, TT_LOWER, TT_UPPER } from './constants';
import { decodeDrop, decodeCaptured, decodeTo, decodeFrom, decodePiece, decodePromote } from './move';

// ========================================
// グローバル変数
// ========================================
let nodes = 0;
let startTime = 0;
let timeLimit = 0;
let stopped = false;

// ========================================
// 各深さ(ply)ごとの配列（再帰で上書きされないように）
// ========================================
const MAX_PLY = 64;

const plyMoves: Int32Array[] = [];
const plyScores: Int32Array[] = [];
for (let i = 0; i < MAX_PLY; i++) {
  plyMoves.push(new Int32Array(512));
  plyScores.push(new Int32Array(512));
}

// 静止探索用
const quiesceMoves: Int32Array[] = [];
const quiesceScores: Int32Array[] = [];
for (let i = 0; i < 8; i++) {
  quiesceMoves.push(new Int32Array(256));
  quiesceScores.push(new Int32Array(256));
}

// ========================================
// Killer Move テーブル
// ========================================
const killers = new Int32Array(MAX_PLY * 2);

function clearKillers(): void {
  killers.fill(0);
}

function updateKillers(ply: number, move: number): void {
  const idx = ply * 2;
  if (killers[idx] !== move) {
    killers[idx + 1] = killers[idx];
    killers[idx] = move;
  }
}

function isKiller(ply: number, move: number): boolean {
  const idx = ply * 2;
  return killers[idx] === move || killers[idx + 1] === move;
}

// ========================================
// 【追加】History Heuristic テーブル
// ========================================
const history = new Int32Array(81 * 81);

function clearHistory(): void {
  history.fill(0);
}

function updateHistory(from: number, to: number, depth: number): void {
  // depth^2 で更新（深い探索ほど重要）
  history[from * 81 + to] += depth * depth;

  // オーバーフロー防止
  if (history[from * 81 + to] > 1000000) {
    for (let i = 0; i < history.length; i++) {
      history[i] = Math.floor(history[i] / 2);
    }
  }
}

function getHistoryScore(from: number, to: number): number {
  return history[from * 81 + to];
}

// ========================================
// 指し手のスコアリング（並び替え用）- 強化版
// ========================================
function getMoveScore(
  move: number,
  ttMove: number,
  ply: number
): number {
  // 1. 置換表の手は最優先
  if (move === ttMove) return 10000000;

  let score = 0;
  const captured = decodeCaptured(move);
  const piece = decodePiece(move);
  const promote = decodePromote(move);
  const drop = decodeDrop(move);

  // 2. 駒を取る手（MVV-LVA）
  if (captured > 0) {
    score += 1000000 + PIECE_VALUES[captured] * 10 - PIECE_VALUES[piece];
  }

  // 3. 【追加】成る手にボーナス
  if (promote) {
    score += 500000;
  }

  // 4. Killer手
  if (isKiller(ply, move)) {
    const idx = ply * 2;
    if (killers[idx] === move) {
      score += 900000;  // 1番目のKiller
    } else {
      score += 800000;  // 2番目のKiller
    }
  }

  // 5. 【追加】History Heuristic
  if (!drop) {
    score += getHistoryScore(decodeFrom(move), decodeTo(move));
  }

  return score;
}

// ========================================
// ソート（選択ソート - 上位のみ効率的にソート）
// ========================================
function sortMovesByScore(
  moves: Int32Array,
  scores: Int32Array,
  count: number
): void {
  // 選択ソート（全体をソートするより、上位を早く見つけるのに効率的）
  for (let i = 0; i < count - 1; i++) {
    let best = i;
    for (let j = i + 1; j < count; j++) {
      if (scores[j] > scores[best]) {
        best = j;
      }
    }
    if (best !== i) {
      // スワップ
      const tm = moves[i];
      moves[i] = moves[best];
      moves[best] = tm;

      const ts = scores[i];
      scores[i] = scores[best];
      scores[best] = ts;
    }
  }
}

// ========================================
// 静止探索（Quiescence Search）
// ========================================
function quiesce(
  game: ShogiGame,
  alpha: number,
  beta: number,
  depth: number,
  qDepth: number
): number {
  nodes++;

  // 時間チェック
  if ((nodes & 4095) === 0) {
    if (Date.now() - startTime > timeLimit) {
      stopped = true;
      return 0;
    }
  }

  // 現在の評価値
  const standPat = evaluate(game);
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  // 深さ制限
  if (qDepth >= 4) return standPat;

  const moves = quiesceMoves[qDepth];
  const scores = quiesceScores[qDepth];
  const cnt = generateMoves(game, moves);

  // 駒を取る手だけ抽出
  let captureCount = 0;
  for (let i = 0; i < cnt; i++) {
    const m = moves[i];
    if (decodeDrop(m)) continue;
    const captured = decodeCaptured(m);
    if (captured === 0) continue;

    moves[captureCount] = m;
    scores[captureCount] = PIECE_VALUES[captured];
    captureCount++;
  }

  // ソート
  sortMovesByScore(moves, scores, captureCount);

  for (let i = 0; i < captureCount; i++) {
    const m = moves[i];

    makeMove(game, m);

    if (isInCheck(game, 1 - game.turn)) {
      unmakeMove(game, m);
      continue;
    }

    const score = -quiesce(game, -beta, -alpha, depth - 1, qDepth + 1);
    unmakeMove(game, m);

    if (stopped) return 0;

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}

// ========================================
// アルファベータ探索（PVS + LMR + Null Move）
// ========================================
function alphaBeta(
  game: ShogiGame,
  depth: number,
  alpha: number,
  beta: number,
  nullOk: boolean,
  ply: number
): number {
  nodes++;

  // 時間チェック
  if ((nodes & 4095) === 0) {
    if (Date.now() - startTime > timeLimit) {
      stopped = true;
      return 0;
    }
  }

  if (stopped) return 0;

  const origAlpha = alpha;

  // ========================================
  // 置換表の参照
  // ========================================
  const ttIdx = (((game.currentHash | 0) & TT_MASK) >>> 0);
  let ttBestMove = 0;

  if (game.ttHash[ttIdx] === game.currentHash) {
    ttBestMove = game.ttMove[ttIdx];

    if (game.ttDepth[ttIdx] >= depth) {
      const flag = game.ttFlag[ttIdx];
      const sc = game.ttScore[ttIdx];
      if (flag === TT_EXACT) return sc;
      if (flag === TT_LOWER && sc >= beta) return sc;
      if (flag === TT_UPPER && sc <= alpha) return sc;
    }
  }

  // 深さ0なら静止探索へ
  if (depth <= 0) {
    return quiesce(game, alpha, beta, 0, 0);
  }

  const inCheck = isInCheck(game, game.turn);

  // ========================================
  // Null Move Pruning
  // ========================================
  if (nullOk && !inCheck && depth >= 3) {
    const savedHash = game.currentHash;
    game.turn = (1 - game.turn) as 0 | 1;
    game.currentHash ^= 0x12345678;
    game.ply++;

    const nullScore = -alphaBeta(game, depth - 3, -beta, -beta + 1, false, ply + 1);

    game.ply--;
    game.turn = (1 - game.turn) as 0 | 1;
    game.currentHash = savedHash;

    if (stopped) return 0;

    if (nullScore >= beta) {
      return beta;
    }
  }

  // ========================================
  // 手を生成してスコアリング
  // ========================================
  const moves = plyMoves[ply];
  const scores = plyScores[ply];
  const cnt = generateMoves(game, moves);

  for (let i = 0; i < cnt; i++) {
    scores[i] = getMoveScore(moves[i], ttBestMove, ply);
  }

  sortMovesByScore(moves, scores, cnt);

  // ========================================
  // 各手を試す（PVS）
  // ========================================
  let bestMove = 0;
  let bestScore = -100000;
  let legalMoves = 0;

  for (let i = 0; i < cnt; i++) {
    const m = moves[i];

    makeMove(game, m);

    if (isInCheck(game, 1 - game.turn)) {
      unmakeMove(game, m);
      continue;
    }

    legalMoves++;

    let score: number;
    const isCapture = decodeCaptured(m) > 0;
    const isPromote = decodePromote(m);

    if (legalMoves === 1) {
      // ========================================
      // 【追加】PVS: 最初の手はフルウィンドウ
      // ========================================
      score = -alphaBeta(game, depth - 1, -beta, -alpha, true, ply + 1);
    } else {
      // ========================================
      // 【追加】PVS + LMR: 2手目以降
      // ========================================
      const canLMR = legalMoves >= 4 && depth >= 3 && !inCheck && !isCapture && !isPromote;

      if (canLMR) {
        // LMR: まず浅く探索（ゼロウィンドウ）
        score = -alphaBeta(game, depth - 2, -alpha - 1, -alpha, true, ply + 1);
      } else {
        // PVS: ゼロウィンドウで探索
        score = -alphaBeta(game, depth - 1, -alpha - 1, -alpha, true, ply + 1);
      }

      // 良さそうなら再探索（フルウィンドウ）
      if (score > alpha && score < beta && !stopped) {
        score = -alphaBeta(game, depth - 1, -beta, -alpha, true, ply + 1);
      }
    }

    unmakeMove(game, m);

    if (stopped) return 0;

    if (score > bestScore) {
      bestScore = score;
      bestMove = m;

      if (score > alpha) {
        alpha = score;

        if (score >= beta) {
          // ベータカット時にKiller・Historyを更新
          if (!isCapture) {
            updateKillers(ply, m);

            // 【追加】History更新
            if (!decodeDrop(m)) {
              updateHistory(decodeFrom(m), decodeTo(m), depth);
            }
          }
          break;
        }
      }
    }
  }

  // 合法手がない = 詰み
  if (legalMoves === 0) {
    return -15000 + ply;
  }

  // ========================================
  // 置換表に保存
  // ========================================
  let flag = TT_EXACT;
  if (bestScore <= origAlpha) flag = TT_UPPER;
  else if (bestScore >= beta) flag = TT_LOWER;

  game.ttHash[ttIdx] = game.currentHash;
  game.ttDepth[ttIdx] = depth;
  game.ttScore[ttIdx] = bestScore;
  game.ttFlag[ttIdx] = flag;
  game.ttMove[ttIdx] = bestMove;

  return bestScore;
}

// ========================================
// 反復深化（メインエントリポイント）
// ========================================
export function iterativeDeepening(game: ShogiGame, maxTime: number): SearchResult {
  nodes = 0;
  startTime = Date.now();
  timeLimit = maxTime;
  stopped = false;

  // テーブルをクリア
  clearKillers();
  clearHistory();

  let bestMove = 0;
  let bestScore = 0;
  let completedDepth = 0;

  // 合法手を生成
  const moves = new Int32Array(512);
  const cnt = generateMoves(game, moves);

  const legal: number[] = [];
  for (let i = 0; i < cnt; i++) {
    makeMove(game, moves[i]);
    if (!isInCheck(game, 1 - game.turn)) {
      legal.push(moves[i]);
    }
    unmakeMove(game, moves[i]);
  }

  if (legal.length === 0) {
    return { move: 0, score: 0, depth: 0, nodes: 0, time: 0 };
  }

  if (legal.length === 1) {
    return { move: legal[0], score: 0, depth: 1, nodes: 1, time: 0 };
  }

  bestMove = legal[0];

  // 反復深化ループ
  for (let depth = 1; depth <= 30; depth++) {
    const score = alphaBeta(game, depth, -100000, 100000, true, 0);

    if (stopped) break;

    // 置換表から最善手を取得
    const ttIdx = (((game.currentHash | 0) & TT_MASK) >>> 0);
    if (game.ttHash[ttIdx] === game.currentHash && game.ttMove[ttIdx] !== 0) {
      bestMove = game.ttMove[ttIdx];
    }

    bestScore = score;
    completedDepth = depth;

    // ========================================
    // 【追加】詰み発見後、最短詰みを探すため追加探索
    // ========================================
    if (Math.abs(score) > 14000) {
      for (let extra = 1; extra <= 2; extra++) {
        const extraScore = alphaBeta(game, depth + extra, -100000, 100000, true, 0);

        if (stopped) break;

        const ttIdx2 = (((game.currentHash | 0) & TT_MASK) >>> 0);
        if (game.ttHash[ttIdx2] === game.currentHash && game.ttMove[ttIdx2] !== 0) {
          bestMove = game.ttMove[ttIdx2];
        }

        bestScore = extraScore;
        completedDepth = depth + extra;
      }
      break;
    }

    // 時間の半分を使ったら終了
    const elapsed = Date.now() - startTime;
    if (elapsed > maxTime * 0.5) break;
  }

  const elapsed = Date.now() - startTime;

  return {
    move: bestMove,
    score: bestScore,
    depth: completedDepth,
    nodes,
    time: elapsed,
  };
}