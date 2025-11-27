// 駒の種類
export const EMPTY = 0;
export const FU = 1, KYO = 2, KEI = 3, GIN = 4, KIN = 5, KAKU = 6, HI = 7, OU = 8;
export const TO = 9, NKYO = 10, NKEI = 11, NGIN = 12, UMA = 13, RYU = 14;
export const ZOU = 15, TAISHI = 16;

export type PieceType = number;
export type Side = 0 | 1;

export interface GameState {
  board: Int8Array;
  hand: [Int8Array, Int8Array];
  turn: Side;
  ply: number;
  moveCount: number;
  gameOver: boolean;
  lastMovePos: number;
}

export interface Move {
  from: number;
  to: number;
  promote: boolean;
  drop: boolean;
  piece: PieceType;
  captured: PieceType;
}

export interface Selection {
  pos?: number;
  drop?: {
    piece: PieceType;
    side: Side;
  };
}

export interface SearchResult {
  move: number;
  score: number;
  depth: number;
  nodes: number;
  time: number;
}

export type GameMode = 'pvp' | 'ai';

export const PIECE_CHARS = [
  '', '歩', '香', '桂', '銀', '金', '角', '飛', '王',
  'と', '杏', '圭', '全', '馬', '龍', '象', '太'
];

export const PIECE_VALUES = [
  0, 90, 315, 405, 495, 540, 855, 990, 15000,
  540, 540, 540, 540, 1125, 1395, 900, 950
];