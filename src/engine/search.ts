import { ShogiGame } from './game';
import { SearchResult, PIECE_VALUES } from '../types/game.types';
import { generateMoves } from './moveGenerator';
import { makeMove, unmakeMove } from './makeMove';
import { isInCheck } from './check';
import { evaluate } from './evaluate';
import { TT_MASK, TT_EXACT, TT_LOWER, TT_UPPER } from './constants';
import { decodeDrop, decodeCaptured, decodeTo, decodeFrom, decodePiece } from './move';

let nodes = 0;
let startTime = 0;
let timeLimit = 0;
let stopped = false;

// Move Ordering Heuristics
function getMoveScore(game: ShogiGame, move: number, ttMove: number): number {
  if (move === ttMove) return 2000000; // TT move first

  const captured = decodeCaptured(move);
  const piece = decodePiece(move);

  // MVV-LVA (Most Valuable Victim - Least Valuable Aggressor)
  if (captured > 0) {
    return 1000000 + captured * 100 - piece;
  }

  // Killer Moves (TODO: Implement Killer Heuristic properly)

  // History Heuristic (TODO: Implement History Heuristic properly)

  return 0;
}

function quiesce(game: ShogiGame, alpha: number, beta: number, depth: number): number {
  nodes++;

  if ((nodes & 4095) === 0) {
    if (Date.now() - startTime > timeLimit) {
      stopped = true;
      return 0;
    }
  }

  const standPat = evaluate(game);
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;
  if (depth <= -3) return standPat;

  const moves = new Int32Array(256);
  const cnt = generateMoves(game, moves);

  // Sort captures
  const scoredMoves: { move: number; score: number }[] = [];
  for (let i = 0; i < cnt; i++) {
    const m = moves[i];
    if (decodeDrop(m)) continue;
    if (decodeCaptured(m) === 0) continue;
    scoredMoves.push({ move: m, score: decodeCaptured(m) });
  }
  scoredMoves.sort((a, b) => b.score - a.score);

  for (let i = 0; i < scoredMoves.length; i++) {
    const m = scoredMoves[i].move;

    makeMove(game, m);
    if (isInCheck(game, 1 - game.turn)) {
      unmakeMove(game, m);
      continue;
    }

    const score = -quiesce(game, -beta, -alpha, depth - 1);
    unmakeMove(game, m);

    if (stopped) return 0;

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}

function alphaBeta(
  game: ShogiGame,
  depth: number,
  alpha: number,
  beta: number,
  nullOk: boolean
): number {
  nodes++;

  if ((nodes & 4095) === 0) {
    if (Date.now() - startTime > timeLimit) {
      stopped = true;
      return 0;
    }
  }

  if (stopped) return 0;

  const inCheck = isInCheck(game, game.turn);
  if (inCheck) depth++; // Check Extension

  if (depth <= 0) {
    return quiesce(game, alpha, beta, 0);
  }

  const origAlpha = alpha;

  // TT probe
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

  // Null Move Pruning (Disabled for stability)
  /*
  if (nullOk && !inCheck && depth >= 3 && beta <= 20000) {
    // Make null move (swap turn)
    game.turn = (1 - game.turn) as 0 | 1;
    game.currentHash ^= 123456789; // Simple hash update for null move

    const score = -alphaBeta(game, depth - 3, -beta, -beta + 1, false);

    game.turn = (1 - game.turn) as 0 | 1;
    game.currentHash ^= 123456789;

    if (stopped) return 0;
    if (score >= beta) return beta;
  }
  */

  const moves = new Int32Array(512);
  const cnt = generateMoves(game, moves);

  // Move Ordering
  const scoredMoves: { move: number; score: number }[] = [];
  for (let i = 0; i < cnt; i++) {
    scoredMoves.push({ move: moves[i], score: getMoveScore(game, moves[i], ttBestMove) });
  }
  scoredMoves.sort((a, b) => b.score - a.score);

  let bestMove = 0;
  let bestScore = -100000;
  let legalMoves = 0;

  for (let i = 0; i < scoredMoves.length; i++) {
    const m = scoredMoves[i].move;

    makeMove(game, m);
    if (isInCheck(game, 1 - game.turn)) {
      unmakeMove(game, m);
      continue;
    }
    legalMoves++;

    // LMR (Late Move Reduction)
    let score = 0;
    if (legalMoves > 4 && depth >= 3 && i > 0 && !inCheck && decodeCaptured(m) === 0 && m !== ttBestMove) {
      score = -alphaBeta(game, depth - 2, -beta, -alpha, true);
    } else {
      score = -alphaBeta(game, depth - 1, -beta, -alpha, true);
    }

    // Re-search if LMR failed
    if (score > alpha && score < beta && legalMoves > 4 && depth >= 3 && i > 0 && !inCheck && decodeCaptured(m) === 0 && m !== ttBestMove) {
      score = -alphaBeta(game, depth - 1, -beta, -alpha, true);
    }

    unmakeMove(game, m);

    if (stopped) return 0;

    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
      if (score > alpha) {
        alpha = score;
        if (score >= beta) {
          break;
        }
      }
    }
  }

  if (legalMoves === 0) {
    return -15000 + game.ply;
  }

  // TT store
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

export function iterativeDeepening(game: ShogiGame, maxTime: number): SearchResult {
  nodes = 0;
  startTime = Date.now();
  timeLimit = maxTime;
  stopped = false;

  let bestMove = 0;
  let bestScore = 0;
  let completedDepth = 0;

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

  for (let depth = 1; depth <= 30; depth++) {
    const score = alphaBeta(game, depth, -100000, 100000, true);

    if (stopped) break;

    const ttIdx = (((game.currentHash | 0) & TT_MASK) >>> 0);
    if (game.ttHash[ttIdx] === game.currentHash && game.ttMove[ttIdx] !== 0) {
      bestMove = game.ttMove[ttIdx];
    }

    bestScore = score;
    completedDepth = depth;

    if (Math.abs(score) > 14000) break;

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