import { ShogiGame } from './game';
import {
  PIECE_VALUES,
  FU, KYO, KEI, GIN, KIN, KAKU, HI, OU,
  TO, NKYO, NKEI, NGIN, UMA, RYU, ZOU, TAISHI
} from '../types/game.types';

// ========================================
// PST（Piece-Square Tables）- 詳細版
// ========================================

// 歩：前方中央が強い
const PST_FU = new Int8Array([
  45, 50, 55, 60, 65, 60, 55, 50, 45,  // 1段目（敵陣）
  35, 40, 45, 50, 55, 50, 45, 40, 35,  // 2段目
  30, 35, 40, 45, 50, 45, 40, 35, 30,  // 3段目
  10, 15, 20, 25, 30, 25, 20, 15, 10,  // 4段目
  5, 8, 10, 15, 20, 15, 10, 8, 5,  // 5段目
  0, 3, 5, 8, 10, 8, 5, 3, 0,  // 6段目
  0, 0, 0, 0, 0, 0, 0, 0, 0,  // 7段目（初期位置）
  0, 0, 0, 0, 0, 0, 0, 0, 0,  // 8段目
  0, 0, 0, 0, 0, 0, 0, 0, 0   // 9段目
]);

// 香車：敵陣に近いほど良い
const PST_KYO = new Int8Array([
  30, 30, 30, 30, 30, 30, 30, 30, 30,
  25, 25, 25, 25, 25, 25, 25, 25, 25,
  20, 20, 20, 20, 20, 20, 20, 20, 20,
  15, 15, 15, 15, 15, 15, 15, 15, 15,
  10, 10, 10, 10, 10, 10, 10, 10, 10,
  5, 5, 5, 5, 5, 5, 5, 5, 5,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  20, 10, 10, 10, 10, 10, 10, 10, 20
]);

// 桂馬：跳ねられる位置が良い
const PST_KEI = new Int8Array([
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  10, 15, 20, 25, 30, 25, 20, 15, 10,
  5, 10, 15, 20, 25, 20, 15, 10, 5,
  0, 5, 10, 15, 20, 15, 10, 5, 0,
  0, 0, 5, 10, 15, 10, 5, 0, 0,
  0, 0, 0, 5, 5, 5, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0
]);

// 銀：前方中央が強い
const PST_GIN = new Int8Array([
  -5, -5, 0, 5, 10, 5, 0, -5, -5,
  0, 5, 10, 15, 20, 15, 10, 5, 0,
  5, 10, 15, 20, 25, 20, 15, 10, 5,
  5, 10, 15, 18, 20, 18, 15, 10, 5,
  0, 5, 10, 12, 15, 12, 10, 5, 0,
  0, 0, 5, 8, 10, 8, 5, 0, 0,
  0, 0, 0, 5, 5, 5, 0, 0, 0,
  -5, -5, 0, 0, 0, 0, 0, -5, -5,
  -10, -10, -5, -5, -5, -5, -5, -10, -10
]);

// 金：玉の近くにいると良い
const PST_KIN = new Int8Array([
  -10, -10, 0, 5, 5, 5, 0, -10, -10,
  0, 5, 10, 15, 15, 15, 10, 5, 0,
  5, 10, 15, 18, 20, 18, 15, 10, 5,
  5, 8, 12, 15, 18, 15, 12, 8, 5,
  0, 5, 10, 12, 15, 12, 10, 5, 0,
  0, 0, 5, 8, 10, 8, 5, 0, 0,
  5, 5, 10, 12, 15, 12, 10, 5, 5,
  5, 10, 10, 15, 15, 15, 10, 10, 5,
  0, 5, 5, 10, 10, 10, 5, 5, 0
]);

// 角：中央が強い
const PST_KAKU = new Int8Array([
  20, 15, 10, 10, 10, 10, 10, 15, 20,
  15, 25, 15, 15, 15, 15, 15, 25, 15,
  10, 15, 30, 20, 20, 20, 30, 15, 10,
  10, 15, 20, 35, 25, 35, 20, 15, 10,
  10, 15, 20, 25, 40, 25, 20, 15, 10,
  10, 15, 20, 35, 25, 35, 20, 15, 10,
  10, 15, 30, 20, 20, 20, 30, 15, 10,
  15, 25, 15, 15, 15, 15, 15, 25, 15,
  20, 15, 10, 10, 10, 10, 10, 15, 20
]);

// 飛車：敵陣2段目が強い、自陣では端が良い（中央はペナルティ）
const PST_HI = new Int8Array([
  25, 20, 15, 10, 10, 10, 15, 20, 25,   // 1段目（敵陣）
  30, 25, 20, 15, 15, 15, 20, 25, 30,   // 2段目
  20, 20, 15, 12, 12, 12, 15, 20, 20,   // 3段目
  15, 15, 12, 10, 10, 10, 12, 15, 15,   // 4段目
  10, 10, 10, 5, 5, 5, 10, 10, 10,   // 5段目
  5, 5, 5, 0, 0, 0, 5, 5, 5,   // 6段目
  5, 0, -5, -10, -15, -10, -5, 0, 5,   // 7段目（自陣中央はマイナス）
  10, 5, 0, -10, -20, -10, 0, 5, 10,   // 8段目
  20, 15, 10, 0, -10, 0, 10, 15, 20    // 9段目（初期位置付近が良い）
]);

// 玉：序盤は端で囲う
const PST_OU_OPENING = new Int8Array([
  -50, -40, -30, -30, -30, -30, -30, -40, -50,
  -40, -30, -20, -20, -20, -20, -20, -30, -40,
  -30, -20, -10, -10, -10, -10, -10, -20, -30,
  -30, -20, -10, -5, -5, -5, -10, -20, -30,
  -30, -20, -10, -5, 0, -5, -10, -20, -30,
  -20, -10, 0, 5, 5, 5, 0, -10, -20,
  -10, 0, 10, 15, 10, 15, 10, 0, -10,
  0, 15, 20, 10, 5, 10, 20, 15, 0,
  20, 30, 25, 10, 0, 10, 25, 30, 20
]);

// 玉：終盤は中央へ
const PST_OU_ENDGAME = new Int8Array([
  -30, -20, -10, -5, 0, -5, -10, -20, -30,
  -20, -10, 0, 5, 10, 5, 0, -10, -20,
  -10, 0, 10, 15, 20, 15, 10, 0, -10,
  -5, 5, 15, 20, 25, 20, 15, 5, -5,
  0, 10, 20, 25, 30, 25, 20, 10, 0,
  -5, 5, 15, 20, 25, 20, 15, 5, -5,
  -10, 0, 10, 15, 20, 15, 10, 0, -10,
  -20, -10, 0, 5, 10, 5, 0, -10, -20,
  -30, -20, -10, -5, 0, -5, -10, -20, -30
]);

// 象：中央前方が強い
const PST_ZOU = new Int8Array([
  0, 5, 10, 15, 20, 15, 10, 5, 0,
  5, 15, 20, 25, 30, 25, 20, 15, 5,
  10, 20, 25, 30, 35, 30, 25, 20, 10,
  10, 18, 22, 28, 32, 28, 22, 18, 10,
  5, 12, 18, 22, 25, 22, 18, 12, 5,
  0, 8, 12, 15, 18, 15, 12, 8, 0,
  0, 5, 8, 10, 12, 10, 8, 5, 0,
  0, 0, 5, 5, 8, 5, 5, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0
]);

// 王の周囲8マスの利きテーブル
const KING_NEIGHBORS: number[][] = [];
for (let sq = 0; sq < 81; sq++) {
  const r = Math.floor(sq / 9);
  const c = sq % 9;
  const neighbors: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
        neighbors.push(nr * 9 + nc);
      }
    }
  }
  KING_NEIGHBORS.push(neighbors);
}

// ========================================
// PST参照（後手は盤面反転）
// ========================================
function getPstBonus(pt: number, sq: number, side: number): number {
  const idx = side === 0 ? sq : (80 - sq);

  switch (pt) {
    case FU:
      return PST_FU[idx];
    case KYO:
      return PST_KYO[idx];
    case KEI:
      return PST_KEI[idx];
    case GIN:
      return PST_GIN[idx];
    case KIN:
    case TO:
    case NKYO:
    case NKEI:
    case NGIN:
      return PST_KIN[idx];
    case KAKU:
      return PST_KAKU[idx];
    case HI:
      return PST_HI[idx];
    case UMA:
      return PST_KAKU[idx] + 20;  // 馬は角+ボーナス
    case RYU:
      return PST_HI[idx] + 25;    // 龍は飛+ボーナス
    case ZOU:
      return PST_ZOU[idx];
    case TAISHI:
      return PST_ZOU[idx] + 15;   // 太子は象+ボーナス
    default:
      return 0;
  }
}

// ========================================
// 局面フェーズ計算（0=終盤、256=序盤）
// ========================================
function getPhase(game: ShogiGame): number {
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
  game: ShogiGame,
  kingSq: number,
  side: number,
  phase: number
): number {
  if (kingSq < 0) return -10000;

  let safety = 0;
  const kr = Math.floor(kingSq / 9);
  const kc = kingSq % 9;
  const sign = side === 0 ? 1 : -1;
  const enemySign = -sign;
  const enemySide = 1 - side;

  // 1. 周囲の味方駒（守り駒）
  let defenders = 0;
  let goldSilverNear = 0;
  const neighbors = KING_NEIGHBORS[kingSq];

  for (let i = 0; i < neighbors.length; i++) {
    const nsq = neighbors[i];
    const v = game.board[nsq];
    if (v * sign > 0) {
      defenders++;
      const pt = v * sign;
      if (pt === KIN || pt === GIN || pt === TO || pt === NKYO || pt === NKEI || pt === NGIN) {
        goldSilverNear++;
      }
    }
  }
  safety += defenders * 25 + goldSilverNear * 20;

  // 2. 玉の位置評価（フェーズで補間）
  const idx = side === 0 ? kingSq : 80 - kingSq;
  const openingBonus = PST_OU_OPENING[idx];
  const endgameBonus = PST_OU_ENDGAME[idx];
  // phase が大きい = 序盤、phase が小さい = 終盤
  safety += ((openingBonus * phase) + (endgameBonus * (256 - phase))) >> 8;

  // 3. 玉の前方の空きマス（危険）
  const forward = side === 0 ? -1 : 1;
  let openFiles = 0;
  for (let dc = -1; dc <= 1; dc++) {
    const nc = kc + dc;
    if (nc < 0 || nc > 8) continue;
    const nr = kr + forward;
    if (nr >= 0 && nr < 9 && game.board[nr * 9 + nc] === 0) {
      openFiles++;
    }
  }
  safety -= openFiles * 15;

  // 4. 敵の大駒との距離
  for (let sq = 0; sq < 81; sq++) {
    const v = game.board[sq];
    if (v * enemySign > 0) {
      const pt = v * enemySign;
      if (pt === HI || pt === RYU || pt === KAKU || pt === UMA) {
        const r = Math.floor(sq / 9);
        const c = sq % 9;
        const dist = Math.abs(kr - r) + Math.abs(kc - c);
        if (dist <= 3) {
          safety -= (4 - dist) * 30;
        }
      }
    }
  }

  // 5. 敵の持ち駒による脅威
  if (game.hand[enemySide][HI] > 0) safety -= 40;
  if (game.hand[enemySide][KAKU] > 0) safety -= 35;

  // 6. 【追加】自分の飛車と玉の距離（序盤は離れている方が良い）
  // 序盤（phase > 200）では飛車と玉が近いとペナルティ
  if (phase > 150) {
    for (let sq = 0; sq < 81; sq++) {
      const v = game.board[sq];
      if (v * sign > 0) {
        const pt = v * sign;
        if (pt === HI || pt === RYU) {
          const r = Math.floor(sq / 9);
          const c = sq % 9;
          const dist = Math.abs(kr - r) + Math.abs(kc - c);

          // 距離3以下だとペナルティ（序盤ほど大きい）
          if (dist <= 4) {
            const penalty = (5 - dist) * 25 * (phase - 150) / 106;
            safety -= penalty;
          }
        }
      }
    }
  }
  if (game.hand[enemySide][KIN] > 0) safety -= 20;
  if (game.hand[enemySide][GIN] > 0) safety -= 15;

  return safety;
}

// ========================================
// 駒の働き評価（攻撃性重視版）
// ========================================
function evalPieceMobility(
  game: ShogiGame,
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
export function evaluate(game: ShogiGame): number {
  let score = 0;
  let senteKingSq = -1;
  let goteKingSq = -1;

  const phase = getPhase(game);

  // 1パス目：玉の位置を特定 + 基本評価
  for (let sq = 0; sq < 81; sq++) {
    const v = game.board[sq];
    if (v === 0) continue;

    const side = v > 0 ? 0 : 1;
    const pt = v > 0 ? v : -v;
    const sign = v > 0 ? 1 : -1;

    // 玉の位置を記録
    if (pt === OU) {
      if (side === 0) senteKingSq = sq;
      else goteKingSq = sq;
    }

    // 1. 基本駒価値
    score += sign * PIECE_VALUES[pt];

    // 2. 位置ボーナス（PST）
    score += sign * getPstBonus(pt, sq, side);
  }

  // 2パス目：駒の働き（敵玉の位置を使う）
  for (let sq = 0; sq < 81; sq++) {
    const v = game.board[sq];
    if (v === 0) continue;

    const side = v > 0 ? 0 : 1;
    const pt = v > 0 ? v : -v;
    const sign = v > 0 ? 1 : -1;

    // 敵玉の位置を渡す
    const enemyKingSq = side === 0 ? goteKingSq : senteKingSq;

    // 3. 駒の働き（攻撃性評価）
    score += sign * evalPieceMobility(game, sq, pt, side, enemyKingSq);
  }

  // 持ち駒（使える駒は価値が高い）
  const handBonus = 1.12;
  for (let p = 1; p <= 16; p++) {
    score += game.hand[0][p] * PIECE_VALUES[p] * handBonus;
    score -= game.hand[1][p] * PIECE_VALUES[p] * handBonus;
  }

  // 玉の安全度
  score += evalKingSafety(game, senteKingSq, 0, phase);
  score -= evalKingSafety(game, goteKingSq, 1, phase);

  // 手番ボーナス（先に指せる方が有利）
  const tempoBonus = 15;
  score += game.turn === 0 ? tempoBonus : -tempoBonus;

  return game.turn === 0 ? score : -score;
}