import { ShogiGame } from './game';
import { PROMOTE_MAP, UNPROMOTE } from './constants';
import { ZOU, TAISHI } from '../types/game.types';
import { decodeFrom, decodeTo, decodePromote, decodeDrop, decodePiece } from './move';
import { zobristPiece, zobristHand, zobristTurn, pieceIndex } from './zobrist';

export function makeMove(game: ShogiGame, m: number): void {
  game.hashHistory[game.historyIdx] = game.currentHash;
  game.moveHistory[game.historyIdx] = m;

  const from = decodeFrom(m);
  const to = decodeTo(m);
  const promote = decodePromote(m);
  const drop = decodeDrop(m);
  const piece = decodePiece(m);
  const side = game.turn;
  const sign = side === 0 ? 1 : -1;

  if (drop) {
    game.board[to] = sign * piece;
    game.hand[side][piece]--;
    game.currentHash ^= zobristPiece[to * 33 + pieceIndex(game.board[to])];
    game.currentHash ^= zobristHand[side * 17 * 19 + piece * 19 + game.hand[side][piece] + 1];
    game.currentHash ^= zobristHand[side * 17 * 19 + piece * 19 + game.hand[side][piece]];
  } else {
    const captured = game.board[to];
    game.capturedHistory[game.historyIdx] = captured;

    if (captured !== 0) {
      game.currentHash ^= zobristPiece[to * 33 + pieceIndex(captured)];
      const capPiece = UNPROMOTE[captured * -sign];
      if (capPiece !== ZOU && capPiece !== TAISHI) {
        const oldCnt = game.hand[side][capPiece];
        game.hand[side][capPiece]++;
        game.currentHash ^= zobristHand[side * 17 * 19 + capPiece * 19 + oldCnt];
        game.currentHash ^= zobristHand[side * 17 * 19 + capPiece * 19 + oldCnt + 1];
      }
    }

    game.currentHash ^= zobristPiece[from * 33 + pieceIndex(game.board[from])];

    const newPiece = promote ? sign * PROMOTE_MAP[piece] : game.board[from];
    game.board[to] = newPiece;
    game.board[from] = 0;

    game.currentHash ^= zobristPiece[to * 33 + pieceIndex(newPiece)];
    game.lastMovePos = to;
  }

  game.historyIdx++;
  game.turn = (1 - game.turn) as 0 | 1;
  game.ply++;
  game.currentHash ^= zobristTurn;
}

export function unmakeMove(game: ShogiGame, m: number): void {
  game.historyIdx--;
  game.turn = (1 - game.turn) as 0 | 1;
  game.ply--;
  game.currentHash = game.hashHistory[game.historyIdx];

  const from = decodeFrom(m);
  const to = decodeTo(m);
  const drop = decodeDrop(m);
  const piece = decodePiece(m);
  const side = game.turn;
  const sign = side === 0 ? 1 : -1;

  if (drop) {
    game.board[to] = 0;
    game.hand[side][piece]++;
  } else {
    const captured = game.capturedHistory[game.historyIdx];
    game.board[from] = sign * piece;
    game.board[to] = captured;

    if (captured !== 0) {
      const capPiece = UNPROMOTE[captured * -sign];
      if (capPiece !== ZOU && capPiece !== TAISHI) {
        game.hand[side][capPiece]--;
      }
    }
  }
}