import { ShogiGame } from './game';
import { PIECE_VALUES } from '../types/game.types';

export function evaluate(game: ShogiGame): number {
  let score = 0;

  // 盤上の駒
  for (let sq = 0; sq < 81; sq++) {
    const v = game.board[sq];
    if (v === 0) continue;

    const pt = v > 0 ? v : -v;
    const sign = v > 0 ? 1 : -1;
    score += sign * PIECE_VALUES[pt];
  }

  // 持ち駒
  const handBonus = 1.12;
  for (let p = 1; p <= 16; p++) {
    score += game.hand[0][p] * PIECE_VALUES[p] * handBonus;
    score -= game.hand[1][p] * PIECE_VALUES[p] * handBonus;
  }

  // 手番ボーナス
  const tempoBonus = 15;
  score += game.turn === 0 ? tempoBonus : -tempoBonus;

  return game.turn === 0 ? score : -score;
}