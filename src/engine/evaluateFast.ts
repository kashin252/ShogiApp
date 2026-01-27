import { ShogiGame } from './game';
import {
    PIECE_VALUES,
    FU, KYO, KEI, GIN, KIN, KAKU, HI, OU,
    TO, NKYO, NKEI, NGIN, UMA, RYU, ZOU, TAISHI
} from '../types/game.types';

// ========================================
// 高速版PST（シンプル版）
// ========================================

// 歩：前方中央が強い（簡略化）
const PST_FU = new Int8Array([
    40, 45, 50, 55, 60, 55, 50, 45, 40,
    30, 35, 40, 45, 50, 45, 40, 35, 30,
    20, 25, 30, 35, 40, 35, 30, 25, 20,
    10, 12, 15, 20, 25, 20, 15, 12, 10,
    5, 6, 8, 12, 15, 12, 8, 6, 5,
    0, 2, 4, 6, 8, 6, 4, 2, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0
]);

// 銀・金：中央前方が良い
const PST_MINOR = new Int8Array([
    0, 5, 10, 15, 20, 15, 10, 5, 0,
    5, 10, 15, 20, 25, 20, 15, 10, 5,
    5, 10, 15, 18, 22, 18, 15, 10, 5,
    3, 6, 10, 12, 15, 12, 10, 6, 3,
    0, 3, 6, 8, 10, 8, 6, 3, 0,
    0, 0, 3, 5, 7, 5, 3, 0, 0,
    0, 0, 2, 4, 6, 4, 2, 0, 0,
    0, 0, 0, 2, 3, 2, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0
]);

// 大駒：中央と敵陣が良い
const PST_MAJOR = new Int8Array([
    25, 20, 15, 15, 20, 15, 15, 20, 25,
    30, 25, 20, 18, 22, 18, 20, 25, 30,
    20, 20, 20, 15, 18, 15, 20, 20, 20,
    15, 15, 15, 12, 15, 12, 15, 15, 15,
    10, 10, 10, 10, 12, 10, 10, 10, 10,
    5, 5, 8, 8, 10, 8, 8, 5, 5,
    0, 2, 5, 5, 8, 5, 5, 2, 0,
    0, 0, 2, 3, 5, 3, 2, 0, 0,
    5, 3, 0, 0, 2, 0, 0, 3, 5
]);

// 玉：安全な場所（序盤用、簡略化）
const PST_OU = new Int8Array([
    -40, -30, -25, -25, -25, -25, -25, -30, -40,
    -30, -20, -15, -15, -15, -15, -15, -20, -30,
    -20, -10, -5, -5, -5, -5, -5, -10, -20,
    -15, -5, 0, 0, 0, 0, 0, -5, -15,
    -10, 0, 5, 5, 5, 5, 5, 0, -10,
    -5, 5, 10, 10, 10, 10, 10, 5, -5,
    0, 10, 15, 12, 10, 12, 15, 10, 0,
    5, 15, 20, 15, 10, 15, 20, 15, 5,
    15, 25, 20, 12, 5, 12, 20, 25, 15
]);

// ========================================
// 高速PST参照
// ========================================
function getPstBonus(pt: number, sq: number, side: number): number {
    const idx = side === 0 ? sq : (80 - sq);

    switch (pt) {
        case FU:
            return PST_FU[idx];
        case KYO:
        case KEI:
            return PST_FU[idx] >> 1;  // 香・桂は歩の半分
        case GIN:
        case KIN:
        case TO:
        case NKYO:
        case NKEI:
        case NGIN:
            return PST_MINOR[idx];
        case KAKU:
        case HI:
            return PST_MAJOR[idx];
        case UMA:
            return PST_MAJOR[idx] + 15;
        case RYU:
            return PST_MAJOR[idx] + 20;
        case ZOU:
        case TAISHI:
            return PST_MINOR[idx] + 10;
        case OU:
            return PST_OU[idx];
        default:
            return 0;
    }
}

// ========================================
// 高速評価関数本体
// ========================================
export function evaluateFast(game: ShogiGame): number {
    let score = 0;
    let senteKingSq = -1;
    let goteKingSq = -1;

    // 1パスのみ：基本評価
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

    // 持ち駒（シンプルな計算）
    for (let p = 1; p <= 8; p++) {  // FU〜OUまで
        const val = PIECE_VALUES[p];
        score += game.hand[0][p] * val * 1.1;
        score -= game.hand[1][p] * val * 1.1;
    }

    // シンプルな玉の安全度（周囲8マスの味方駒数のみ）
    if (senteKingSq >= 0) {
        score += countDefenders(game, senteKingSq, 1) * 20;
    }
    if (goteKingSq >= 0) {
        score -= countDefenders(game, goteKingSq, -1) * 20;
    }

    // 手番ボーナス
    score += game.turn === 0 ? 12 : -12;

    return game.turn === 0 ? score : -score;
}

// 玉の周囲の味方駒数をカウント（高速版）
function countDefenders(game: ShogiGame, kingSq: number, sign: number): number {
    let count = 0;
    const kr = Math.floor(kingSq / 9);
    const kc = kingSq % 9;

    // 8方向をチェック
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = kr + dr;
            const nc = kc + dc;
            if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
                const v = game.board[nr * 9 + nc];
                if (v * sign > 0) count++;
            }
        }
    }
    return count;
}
