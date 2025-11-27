import { ShogiGame } from './game';
import { FU, KYO, KEI, GIN, KIN, KAKU, HI, OU, TO, NKYO, NKEI, NGIN, UMA, RYU, ZOU, TAISHI } from '../types/game.types';
import { PROMOTE_MAP, UNPROMOTE } from './constants';
import { encodeMove } from './move';
import {
  ATTACK_FU_S, ATTACK_FU_G, ATTACK_KEI_S, ATTACK_KEI_G,
  ATTACK_GIN_S, ATTACK_GIN_G, ATTACK_KIN_S, ATTACK_KIN_G,
  ATTACK_OU, ATTACK_ZOU_S, ATTACK_ZOU_G,
  kyoAttacks, kakuAttacks, hiAttacks
} from './attackTables';

export function generateMoves(game: ShogiGame, moves: Int32Array): number {
  let idx = 0;
  const side = game.turn;
  const sign = side === 0 ? 1 : -1;
  const enemySign = -sign;

  // 盤上の駒の移動
  for (let sq = 0; sq < 81; sq++) {
    const v = game.board[sq];
    if (v === 0 || (v > 0) !== (side === 0)) continue;

    const pt = v * sign;
    const r = Math.floor(sq / 9);

    // Helper to add moves
    const addMoves = (targets: number[]) => {
      for (let i = 0; i < targets.length; i++) {
        const to = targets[i];
        const tv = game.board[to];
        if (tv !== 0 && (tv > 0) === (side === 0)) continue;

        const toR = Math.floor(to / 9);
        const captured = tv === 0 ? 0 : UNPROMOTE[tv * enemySign];

        const canPromote =
          PROMOTE_MAP[pt] !== 0 &&
          ((side === 0 && (r <= 2 || toR <= 2)) || (side === 1 && (r >= 6 || toR >= 6)));

        const mustPromote =
          ((pt === FU || pt === KYO) &&
            ((side === 0 && toR === 0) || (side === 1 && toR === 8))) ||
          (pt === KEI && ((side === 0 && toR <= 1) || (side === 1 && toR >= 7)));

        if (mustPromote) {
          moves[idx++] = encodeMove(sq, to, true, false, pt, captured);
        } else {
          moves[idx++] = encodeMove(sq, to, false, false, pt, captured);
          if (canPromote) {
            moves[idx++] = encodeMove(sq, to, true, false, pt, captured);
          }
        }
      }
    };

    switch (pt) {
      case FU:
        const fuTo = side === 0 ? ATTACK_FU_S[sq] : ATTACK_FU_G[sq];
        if (fuTo >= 0) addMoves([fuTo]);
        break;
      case KYO:
        addMoves(kyoAttacks(sq, side, game.board));
        break;
      case KEI:
        addMoves(side === 0 ? ATTACK_KEI_S[sq] : ATTACK_KEI_G[sq]);
        break;
      case GIN:
        addMoves(side === 0 ? ATTACK_GIN_S[sq] : ATTACK_GIN_G[sq]);
        break;
      case KIN:
      case TO:
      case NKYO:
      case NKEI:
      case NGIN:
        addMoves(side === 0 ? ATTACK_KIN_S[sq] : ATTACK_KIN_G[sq]);
        break;
      case KAKU:
        addMoves(kakuAttacks(sq, game.board));
        break;
      case HI:
        addMoves(hiAttacks(sq, game.board));
        break;
      case UMA:
        addMoves(kakuAttacks(sq, game.board));
        addMoves(ATTACK_OU[sq]);
        break;
      case RYU:
        addMoves(hiAttacks(sq, game.board));
        addMoves(ATTACK_OU[sq]);
        break;
      case OU:
      case TAISHI:
        addMoves(ATTACK_OU[sq]);
        break;
      case ZOU:
        addMoves(side === 0 ? ATTACK_ZOU_S[sq] : ATTACK_ZOU_G[sq]);
        break;
    }
  }

  // 持ち駒打ち
  const dropPieces = [FU, KYO, KEI, GIN, KIN, KAKU, HI];
  for (let pi = 0; pi < dropPieces.length; pi++) {
    const pt = dropPieces[pi];
    if (game.hand[side][pt] === 0) continue;

    // 二歩チェック用
    let fuCols = 0;
    if (pt === FU) {
      for (let sq = 0; sq < 81; sq++) {
        if (game.board[sq] === sign * FU) {
          fuCols |= 1 << (sq % 9);
        }
      }
    }

    for (let sq = 0; sq < 81; sq++) {
      if (game.board[sq] !== 0) continue;

      const r = Math.floor(sq / 9);
      const c = sq % 9;

      if (pt === FU || pt === KYO) {
        if ((side === 0 && r === 0) || (side === 1 && r === 8)) continue;
      }
      if (pt === KEI) {
        if ((side === 0 && r <= 1) || (side === 1 && r >= 7)) continue;
      }

      if (pt === FU && fuCols & (1 << c)) continue;

      moves[idx++] = encodeMove(127, sq, false, true, pt, 0);
    }
  }

  return idx;
}