import { ShogiGame } from './game';
import { PIECE_VALUES, FU, KYO, KEI, GIN, KIN, KAKU, HI, OU, TO, NKYO, NKEI, NGIN, UMA, RYU } from '../types/game.types';
import { PST_FU, PST_KYO, PST_KEI, PST_GIN, PST_KIN, PST_KAKU, PST_HI, PST_OU } from './pst';

const PST_MAP: { [key: number]: Int16Array } = {
  [FU]: PST_FU,
  [KYO]: PST_KYO,
  [KEI]: PST_KEI,
  [GIN]: PST_GIN,
  [KIN]: PST_KIN,
  [KAKU]: PST_KAKU,
  [HI]: PST_HI,
  [OU]: PST_OU,
  [TO]: PST_KIN,
  [NKYO]: PST_KIN,
  [NKEI]: PST_KIN,
  [NGIN]: PST_KIN,
  [UMA]: PST_KAKU,
  [RYU]: PST_HI,
};

export function evaluate(game: ShogiGame): number {
  let score = 0;

  // 盤上の駒
  for (let sq = 0; sq < 81; sq++) {
    const v = game.board[sq];
    if (v === 0) continue;

    const pt = v > 0 ? v : -v;
    const sign = v > 0 ? 1 : -1;

    // 駒の価値
    score += sign * PIECE_VALUES[pt];

    // PST (位置評価)
    const pst = PST_MAP[pt];
    if (pst) {
      // 先手ならそのまま、後手なら180度回転した位置(80-sq)を参照
      const pstIdx = v > 0 ? sq : 80 - sq;
      score += sign * pst[pstIdx];
    }
  }

  // 持ち駒
  const handBonus = 1.1;
  for (let p = 1; p <= 16; p++) {
    score += game.hand[0][p] * PIECE_VALUES[p] * handBonus;
    score -= game.hand[1][p] * PIECE_VALUES[p] * handBonus;
  }

  // 手番ボーナス
  const tempoBonus = 20;
  score += game.turn === 0 ? tempoBonus : -tempoBonus;

  return game.turn === 0 ? score : -score;
}