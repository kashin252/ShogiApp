// Zobristハッシュテーブル
export const zobristPiece = new Float64Array(81 * 33);
export const zobristHand = new Float64Array(2 * 17 * 19);
export let zobristTurn = 0;

export function initZobrist(): void {
  for (let i = 0; i < zobristPiece.length; i++) {
    zobristPiece[i] = Math.random() * Number.MAX_SAFE_INTEGER;
  }
  for (let i = 0; i < zobristHand.length; i++) {
    zobristHand[i] = Math.random() * Number.MAX_SAFE_INTEGER;
  }
  zobristTurn = Math.random() * Number.MAX_SAFE_INTEGER;
}

export function pieceIndex(val: number): number {
  return val + 16;
}

export function computeHash(
  board: Int8Array,
  hand: [Int8Array, Int8Array],
  turn: number
): number {
  let h = 0;
  for (let sq = 0; sq < 81; sq++) {
    if (board[sq] !== 0) {
      h ^= zobristPiece[sq * 33 + pieceIndex(board[sq])];
    }
  }
  for (let s = 0; s < 2; s++) {
    for (let p = 1; p <= 16; p++) {
      const cnt = hand[s][p];
      if (cnt > 0) {
        h ^= zobristHand[s * 17 * 19 + p * 19 + cnt];
      }
    }
  }
  if (turn === 1) h ^= zobristTurn;
  return h;
}