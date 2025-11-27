import { EMPTY, FU, KYO, KEI, GIN, KIN, KAKU, HI, OU, TO, NKYO, NKEI, NGIN, UMA, RYU, ZOU, TAISHI } from '../types/game.types';

// 成り変換マップ
export const PROMOTE_MAP = [
  0, TO, NKYO, NKEI, NGIN, 0, UMA, RYU, 0, 0, 0, 0, 0, 0, 0, TAISHI, 0
];

// 成りを元に戻す
export const UNPROMOTE = [
  0, FU, KYO, KEI, GIN, KIN, KAKU, HI, OU, FU, KYO, KEI, GIN, KAKU, HI, ZOU, OU
];

// 置換表サイズ
export const TT_SIZE = 1 << 20;
export const TT_MASK = TT_SIZE - 1;

// 置換表フラグ
export const TT_EXACT = 0;
export const TT_LOWER = 1;
export const TT_UPPER = 2;

// 投了閾値
export const RESIGN_THRESHOLD = -3000;
export const RESIGN_COUNT_LIMIT = 5;

// 探索設定
export const MAX_DEPTH = 30;
export const DEFAULT_TIME_LIMIT = 15000;