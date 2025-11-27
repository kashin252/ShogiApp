import { ShogiGame } from './game';
import { SearchResult } from '../types/game.types';
import { generateMoves } from './moveGenerator';
import { makeMove, unmakeMove } from './makeMove';
import { isInCheck } from './check';
import { evaluate } from './evaluate';
import { TT_MASK, TT_EXACT, TT_LOWER, TT_UPPER } from './constants';
import { decodeDrop, decodeCaptured } from './move';

let nodes = 0;
let startTime = 0;
let timeLimit = 0;
let stopped = false;

function quiesce(game: ShogiGame, alpha: number, beta: number, depth: number): number {
  nodes++;

  const standPat = evaluate(game);
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;
  if (depth <= -3) return standPat;

  const moves = new Int32Array(256);
  const cnt = generateMoves(game, moves);

  for (let i = 0; i < cnt; i++) {
    const m = moves[i];
    if (decodeDrop(m)) continue;
    if (decodeCaptured(m) === 0) continue;

    makeMove(game, m);
    if (isInCheck(game, 1 - game.turn)) {
      unmakeMove(game, m);
      continue;
    }

    const score = -quiesce(game, -beta, -alpha, depth - 1);
    unmakeMove(game, m);

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

  if (depth <= 0) {
    return quiesce(game, alpha, beta, 0);
  }

  const moves = new Int32Array(512);
  const cnt = generateMoves(game, moves);

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

    const score = -alphaBeta(game, depth - 1, -beta, -alpha, true);

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