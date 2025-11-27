// 移動エンコード
export const encodeMove = (
  from: number,
  to: number,
  promote: boolean,
  drop: boolean,
  piece: number,
  captured: number
): number => {
  return (
    (from & 0x7f) |
    ((to & 0x7f) << 7) |
    ((promote ? 1 : 0) << 14) |
    ((drop ? 1 : 0) << 15) |
    ((piece & 0x1f) << 16) |
    ((captured & 0x1f) << 21)
  );
};

export const decodeFrom = (m: number): number => m & 0x7f;
export const decodeTo = (m: number): number => (m >> 7) & 0x7f;
export const decodePromote = (m: number): boolean => ((m >> 14) & 1) === 1;
export const decodeDrop = (m: number): boolean => ((m >> 15) & 1) === 1;
export const decodePiece = (m: number): number => (m >> 16) & 0x1f;
export const decodeCaptured = (m: number): number => (m >> 21) & 0x1f;