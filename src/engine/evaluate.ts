import type { GameState } from '../types/game.types';
import {
  PIECE_VALUES,
  FU, KYO, KEI, GIN, KIN, KAKU, HI, OU,
  TO, NKYO, NKEI, NGIN, UMA, RYU, ZOU, TAISHI
} from '../types/game.types';
import { getPstBonus, KING_NEIGHBORS, PST_OU_OPENING, PST_OU_ENDGAME } from './pst';

// PST 関連の定数と関数は ./pst.ts に移動しました

// ========================================
// 局面フェーズ計算（0=終盤、256=序盤）
// ========================================
function getPhase(game: GameState): number {
  let phase = 0;

  // 盤上の駒
  for (let sq = 0; sq < 81; sq++) {
    const v = game.board[sq];
    if (v === 0) continue;

    const pt = v > 0 ? v : -v;

    // 大駒が減ると終盤に近づく
    if (pt === HI || pt === RYU) phase += 44;
    else if (pt === KAKU || pt === UMA) phase += 32;
    else if (pt === KIN || pt === GIN) phase += 18;
    else if (pt === KYO || pt === KEI) phase += 8;
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
// 角の利き計算
// ========================================
function kakuAttacks(sq: number, board: Int8Array): number[] {
  const moves: number[] = [];
  const r = Math.floor(sq / 9);
  const c = sq % 9;
  const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  for (const [dr, dc] of dirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
      const nsq = nr * 9 + nc;
      moves.push(nsq);
      if (board[nsq] !== 0) break;
      nr += dr;
      nc += dc;
    }
  }
  return moves;
}

// ========================================
// 飛車の利き計算
// ========================================
function hiAttacks(sq: number, board: Int8Array): number[] {
  const moves: number[] = [];
  const r = Math.floor(sq / 9);
  const c = sq % 9;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [dr, dc] of dirs) {
    let nr = r + dr;
    let nc = c + dc;
    while (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
      const nsq = nr * 9 + nc;
      moves.push(nsq);
      if (board[nsq] !== 0) break;
      nr += dr;
      nc += dc;
    }
  }
  return moves;
}

// ========================================
// 玉の安全度評価
// ========================================
function evalKingSafety(
  game: GameState,
  kingSq: number,
  side: number,
  phase: number
): number {
  if (kingSq < 0) return -500; // 玉がない（異常事態）

  let safety = 0;
  const kr = Math.floor(kingSq / 9);
  const kc = kingSq % 9;
  const sign = side === 0 ? 1 : -1;
  const enemySide = 1 - side;

  // 1. 周囲の味方駒（守り駒）- KING_NEIGHBORS を使用
  let goldSilverNear = 0;
  const neighbors = KING_NEIGHBORS[kingSq];

  for (let i = 0; i < neighbors.length; i++) {
    const nsq = neighbors[i];
    const v = game.board[nsq];
    if (v * sign > 0) {
      const pt = Math.abs(v);
      if (pt === KIN || pt === GIN || pt === TO || pt === NKYO || pt === NKEI || pt === NGIN) {
        goldSilverNear++;
      }
    }
  }
  safety += goldSilverNear * 45;

  // 2. 玉の位置評価
  const idx = side === 0 ? kingSq : 80 - kingSq;
  const openingBonus = PST_OU_OPENING[idx];
  const endgameBonus = PST_OU_ENDGAME[idx];
  safety += ((openingBonus * phase) + (endgameBonus * (256 - phase))) >> 8;

  // 3. 玉の前方の空きマスのチェック（簡略化）
  const forward = side === 0 ? -9 : 9;
  const frontSq = kingSq + forward;
  if (frontSq >= 0 && frontSq < 81 && game.board[frontSq] === 0) {
    safety -= 20;
  }

  // 4. 敵の大駒による脅威（持ち駒のみチェックし、盤上はPSTでカバー）
  if (game.hand[enemySide][HI] > 0) safety -= 40;
  if (game.hand[enemySide][KAKU] > 0) safety -= 30;
  if (game.hand[enemySide][KIN] > 0) safety -= 15;

  return safety;
}

// ========================================
// 駒の働き評価（攻撃性重視版）
// ========================================
function evalPieceMobility(
  game: GameState,
  sq: number,
  pt: number,
  side: number,
  enemyKingSq: number
): number {
  let mobility = 0;
  const r = Math.floor(sq / 9);
  const c = sq % 9;
  const sign = side === 0 ? 1 : -1;
  const enemySign = -sign;

  // ========================================
  // 角・馬の評価
  // ========================================
  if (pt === KAKU || pt === UMA) {
    const attacks = kakuAttacks(sq, game.board);
    mobility += attacks.length * 4;

    // 敵陣への利き
    for (const aSq of attacks) {
      const ar = Math.floor(aSq / 9);
      if ((side === 0 && ar <= 2) || (side === 1 && ar >= 6)) {
        mobility += 5;  // 敵陣に利きがある
      }
      // 敵玉の周辺に利き
      if (enemyKingSq >= 0) {
        const ekr = Math.floor(enemyKingSq / 9);
        const ekc = enemyKingSq % 9;
        const dist = Math.abs(ar - ekr) + Math.abs((aSq % 9) - ekc);
        if (dist <= 2) {
          mobility += 8;  // 敵玉付近に利き
        }
      }
    }
  }

  // ========================================
  // 飛車・龍の評価（攻撃性重視）
  // ========================================
  if (pt === HI || pt === RYU) {
    const attacks = hiAttacks(sq, game.board);
    mobility += attacks.length * 3;

    // 1. 敵陣への位置ボーナス（前線にいるほど高評価）
    if (side === 0) {
      // 先手：上にいるほど良い
      mobility += (8 - r) * 8;  // 1段目 = +64, 9段目 = 0
    } else {
      // 後手：下にいるほど良い
      mobility += r * 8;  // 9段目 = +64, 1段目 = 0
    }

    // 2. 敵陣侵入ボーナス
    if ((side === 0 && r <= 2) || (side === 1 && r >= 6)) {
      mobility += 50;  // 敵陣にいる
      if ((side === 0 && r <= 1) || (side === 1 && r >= 7)) {
        mobility += 30;  // 敵陣2段目以深
      }
    }

    // 3. 敵玉との位置関係
    if (enemyKingSq >= 0) {
      const ekr = Math.floor(enemyKingSq / 9);
      const ekc = enemyKingSq % 9;

      // 同じ筋・同じ段にいると攻撃的
      if (c === ekc) {
        mobility += 40;  // 玉と同じ筋（縦の利き）
      }
      if (r === ekr) {
        mobility += 30;  // 玉と同じ段（横の利き）
      }

      // 敵玉に近いほどボーナス
      const distToKing = Math.abs(r - ekr) + Math.abs(c - ekc);
      if (distToKing <= 4) {
        mobility += (5 - distToKing) * 15;
      }
    }

    // 4. 敵陣への利きをカウント
    let enemyTerritoryAttacks = 0;
    let attacksOnEnemyPieces = 0;
    for (const aSq of attacks) {
      const ar = Math.floor(aSq / 9);

      // 敵陣への利き
      if ((side === 0 && ar <= 2) || (side === 1 && ar >= 6)) {
        enemyTerritoryAttacks++;
      }

      // 敵駒を狙っている
      const target = game.board[aSq];
      if (target * enemySign > 0) {
        attacksOnEnemyPieces++;
        const targetPt = Math.abs(target);
        // 大きな駒を狙っているほど高評価
        if (targetPt === OU) {
          mobility += 100;  // 王手の利き！
        } else if (targetPt === RYU || targetPt === UMA) {
          mobility += 30;
        } else if (targetPt === HI || targetPt === KAKU) {
          mobility += 25;
        } else if (targetPt === KIN || targetPt === GIN) {
          mobility += 15;
        }
      }
    }
    mobility += enemyTerritoryAttacks * 8;
    mobility += attacksOnEnemyPieces * 10;

    // 5. 成り飛車（龍）はさらにボーナス
    if (pt === RYU) {
      mobility += 40;
    }
  }

  // ========================================
  // 成駒の敵陣侵入ボーナス
  // ========================================
  if (pt === UMA || pt === RYU) {
    if ((side === 0 && r <= 2) || (side === 1 && r >= 6)) {
      mobility += 30;
    }
  }

  return mobility;
}

// ========================================
// 評価関数本体
// ========================================
export function evaluate(game: GameState): number {
  // 1. 増分計算されたベーススコアを使用 (駒価値 + PST)
  let score = game.materialScore + game.pstScore;

  const phase = getPhase(game);
  const senteKingSq = game.kingSq[0];
  const goteKingSq = game.kingSq[1];

  // 2. 玉の安全度（重要なので残すが、中身を最適化済み）
  if (senteKingSq !== -1) score += evalKingSafety(game, senteKingSq, 0, phase);
  if (goteKingSq !== -1) score -= evalKingSafety(game, goteKingSq, 1, phase);

  // 手番ボーナス
  const tempoBonus = 15;
  score += game.turn === 0 ? tempoBonus : -tempoBonus;

  return game.turn === 0 ? score : -score;
}