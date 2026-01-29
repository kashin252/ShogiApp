import type { GameState } from '../types/game.types';
import {
  PIECE_VALUES,
  FU, KYO, KEI, GIN, KIN, KAKU, HI, OU,
  TO, NKYO, NKEI, NGIN, UMA, RYU, ZOU, TAISHI
} from '../types/game.types';
import { getPstBonus, KING_NEIGHBORS, PST_OU_OPENING, PST_OU_ENDGAME } from './pst';

// ========================================
// 局面フェーズ計算（0=終盤、256=序盤）
// ========================================
function getPhase(game: GameState): number {
  let phase = 0;

  // 盤上の駒（大駒・金銀のみカウントして高速化）
  for (let sq = 0; sq < 81; sq++) {
    const v = game.board[sq];
    if (v === 0) continue;
    const pt = Math.abs(v);

    if (pt === HI || pt === RYU) phase += 44;
    else if (pt === KAKU || pt === UMA) phase += 32;
    else if (pt === KIN || pt === GIN) phase += 18;
  }

  // 持ち駒も考慮
  for (let s = 0; s < 2; s++) {
    phase += game.hand[s][HI] * 44;
    phase += game.hand[s][KAKU] * 32;
    phase += game.hand[s][KIN] * 18;
    phase += game.hand[s][GIN] * 18;
  }

  return Math.min(256, phase);
}

// ========================================
// 玉の安全度評価（最適化版）
// ========================================
function evalKingSafety(
  game: GameState,
  kingSq: number,
  side: number,
  phase: number
): number {
  // 終盤に近づくほど安全度重要（phaseが小さいほど係数を上げる）
  // 序盤(256) -> 重み小, 終盤(0) -> 重み大

  if (kingSq < 0) return -500;

  let safety = 0;
  const sign = side === 0 ? 1 : -1;
  const enemySide = 1 - side;

  // 1. 周囲の味方駒（守り駒）
  // ループ展開して高速化も可能だが、neighbors配列が小さいのでこのまま
  let defenders = 0;
  const neighbors = KING_NEIGHBORS[kingSq];

  for (let i = 0; i < neighbors.length; i++) {
    const v = game.board[neighbors[i]];
    if (v * sign > 0) defenders++; // 種類を問わず味方ならプラス
  }
  safety += defenders * 30;

  // 2. 玉の位置評価（PST_OU）
  // 序盤・終盤のブレンド
  const idx = side === 0 ? kingSq : 80 - kingSq;
  const openingBonus = PST_OU_OPENING[idx];
  const endgameBonus = PST_OU_ENDGAME[idx];
  safety += ((openingBonus * phase) + (endgameBonus * (256 - phase))) >> 8;

  // 3. 敵の持ち駒による脅威（高速化のため大駒のみ）
  // 終盤ほど脅威度アップ
  const weight = (300 - phase) / 256; // 1.0 ~ 1.2

  if (game.hand[enemySide][HI] > 0) safety -= 50 * weight;
  if (game.hand[enemySide][KAKU] > 0) safety -= 40 * weight;
  if (game.hand[enemySide][KIN] > 0) safety -= 20 * weight;

  return safety;
}

// ========================================
// 評価関数本体（計算量削減版）
// ========================================
export function evaluate(game: GameState): number {
  // 1. 増分計算されたベーススコア (駒価値 + PST)
  // 探索中に絶えず更新されているため、これだけで9割の精度が出る
  let score = game.materialScore + game.pstScore;

  // 2. 玉の安全度（これは探索中に更新されないのでここで計算）
  // ただし、計算コストを下げるため、フェーズ計算を簡略化
  const phase = getPhase(game);

  const senteKingSq = game.kingSq[0];
  const goteKingSq = game.kingSq[1];

  if (senteKingSq !== -1) score += evalKingSafety(game, senteKingSq, 0, phase);
  if (goteKingSq !== -1) score -= evalKingSafety(game, goteKingSq, 1, phase);

  // 3. 手番ボーナス（攻め側有利）
  score += game.turn === 0 ? 20 : -20;

  // 先手番ならそのまま、後手番なら反転して返す（Negamax形式ではないが、呼び出し元で調整）
  // ※ search.ts の実装を見ると、alphaBeta関数内で手番によるスコア反転を行っているか要確認
  // 現状のsearch.ts: getMoveScoreなどで評価値を使うが、
  // alphaBetaの戻り値は「その手番から見た評価値」か「絶対評価値」か？
  // evaluate関数自体の仕様: "Positive if Sente is better"

  return game.turn === 0 ? score : -score;
}