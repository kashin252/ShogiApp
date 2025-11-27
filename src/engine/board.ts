import { FU, KYO, KEI, GIN, KIN, KAKU, HI, OU, ZOU } from '../types/game.types';

export function setupInitialBoard(): Int8Array {
  const board = new Int8Array(81);
  
  // 後手陣
  const backRow = [KYO, KEI, GIN, KIN, OU, KIN, GIN, KEI, KYO];
  for (let c = 0; c < 9; c++) {
    board[c] = -backRow[c];
    board[72 + c] = backRow[c];
  }
  
  // 飛車・角・象
  board[10] = -HI;
  board[16] = -KAKU;
  board[13] = -ZOU;
  board[64] = KAKU;
  board[70] = HI;
  board[67] = ZOU;
  
  // 歩
  for (let c = 0; c < 9; c++) {
    board[18 + c] = -FU;
    board[54 + c] = FU;
  }
  
  return board;
}

export function copyBoard(board: Int8Array): Int8Array {
  return new Int8Array(board);
}

export function copyHand(hand: [Int8Array, Int8Array]): [Int8Array, Int8Array] {
  return [new Int8Array(hand[0]), new Int8Array(hand[1])];
}