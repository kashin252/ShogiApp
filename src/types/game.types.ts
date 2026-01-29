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
  resignCount: number;
  currentHash: number;
  materialScore: number;
  pstScore: number;
  kingSq: Int32Array;

  // 置換表
  ttHash: Float64Array;
  ttDepth: Int8Array;
  ttScore: Int16Array;
  ttFlag: Int8Array;
  ttMove: Int32Array;

  // キラー手・ヒストリー
  killers: Int32Array;
  history: Int32Array;

  // 履歴
  moveHistory: Int32Array;
  capturedHistory: Int8Array;
  hashHistory: Float64Array;
  historyIdx: number;
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
  isJoseki?: boolean;
}

export type GameMode = 'pvp' | 'ai';

export type TimeControl = 0 | 10 | 30 | 60;

export interface GameSettings {
  mode: GameMode;
  aiSide?: Side; // AI戦の場合、AIの手番（undefined = 対人戦）
  timeControl: TimeControl; // 1手あたりの持ち時間（秒）
  fischerRule?: boolean; // フィッシャールール（1分+5秒/手）
}

export type GameResult = 'sente_win' | 'gote_win' | 'sente_timeout' | 'gote_timeout' | 'sente_resign' | 'gote_resign' | null;

export const PIECE_CHARS = [
  '', '歩', '香', '桂', '銀', '金', '角', '飛', '王',
  'と', '杏', '圭', '全', '馬', '龍', '象', '太'
];

export const PIECE_CHARS_EN = [
  '', 'P', 'L', 'N', 'S', 'G', 'B', 'R', 'K',
  '+P', '+L', '+N', '+S', '+B', '+R', 'DE', 'CP'
];

export const PIECE_VALUES = [
  0, 90, 315, 405, 495, 540, 855, 990, 15000,
  540, 540, 540, 540, 1125, 1395, 900, 950
];

// 収益化機能用の型定義

// プレミアム状態
export interface PremiumStatus {
  isPremium: boolean;
  purchaseDate?: string;
  productId?: string;
}

// プレイ制限情報
export interface PlayLimitInfo {
  playCount: number;
  maxPlays: number;
  lastPlayDate: string;
  canPlay: boolean;
  remainingPlays: number;
}

// 広告状態
export interface AdStatus {
  isLoaded: boolean;
  isShowing: boolean;
  lastShownDate?: string;
}