import type { GameState } from '../types/game.types';
import { PROMOTE_MAP, UNPROMOTE } from './constants';
import { ZOU, TAISHI, PIECE_VALUES, OU } from '../types/game.types';
import { decodeFrom, decodeTo, decodePromote, decodeDrop, decodePiece } from './move';
import { zobristPiece, zobristHand, zobristTurn, pieceIndex } from './zobrist';
import { getPstBonus } from './pst';

const HAND_BONUS = 1.12;

export function makeMove(game: GameState, m: number): void {
  game.hashHistory[game.historyIdx] = game.currentHash;
  game.moveHistory[game.historyIdx] = m;

  const from = decodeFrom(m);
  const to = decodeTo(m);
  const promote = decodePromote(m);
  const drop = decodeDrop(m);
  const piece = decodePiece(m);
  const side = game.turn;
  const sign = side === 0 ? 1 : -1;
  const enemySign = -sign;

  if (drop) {
    game.board[to] = sign * piece;
    game.hand[side][piece]--;

    // 差分計算: ハッシュ
    game.currentHash ^= zobristPiece[to * 33 + pieceIndex(game.board[to])];
    game.currentHash ^= zobristHand[side * 17 * 19 + piece * 19 + game.hand[side][piece] + 1];
    game.currentHash ^= zobristHand[side * 17 * 19 + piece * 19 + game.hand[side][piece]];

    // 差分計算: スコア (駒打ち)
    // 持ち駒から減るので Material は減少（1.12倍分）し、盤面に配置されるので通常価値 + PST
    game.materialScore -= sign * PIECE_VALUES[piece] * HAND_BONUS;
    game.materialScore += sign * PIECE_VALUES[piece];
    game.pstScore += sign * getPstBonus(piece, to, side);

    // 玉打ち（非推奨だが一応）
    if (piece === OU) game.kingSq[side] = to;

  } else {
    const captured = game.board[to];
    game.capturedHistory[game.historyIdx] = captured;

    if (captured !== 0) {
      // 駒を取る
      const capPt = Math.abs(captured);
      game.currentHash ^= zobristPiece[to * 33 + pieceIndex(captured)];

      // 取られた駒のスコアを引く
      game.materialScore -= enemySign * PIECE_VALUES[capPt];
      game.pstScore -= enemySign * getPstBonus(capPt, to, 1 - side);

      // 取られたのが玉なら位置をクリア
      if (capPt === OU) game.kingSq[1 - side] = -1;

      const capPiece = UNPROMOTE[captured * -sign];
      if (capPiece !== ZOU && capPiece !== TAISHI) {
        const oldCnt = game.hand[side][capPiece];
        game.hand[side][capPiece]++;
        game.currentHash ^= zobristHand[side * 17 * 19 + capPiece * 19 + oldCnt];
        game.currentHash ^= zobristHand[side * 17 * 19 + capPiece * 19 + oldCnt + 1];

        // 持ち駒に入ったスコアを加算
        game.materialScore += sign * PIECE_VALUES[capPiece] * HAND_BONUS;
      }
    }

    const oldPiece = game.board[from];
    const oldPt = Math.abs(oldPiece);
    const newPiece = promote ? sign * PROMOTE_MAP[piece] : oldPiece;
    const newPt = Math.abs(newPiece);

    // 移動元のハッシュとPSTを引く
    game.currentHash ^= zobristPiece[from * 33 + pieceIndex(oldPiece)];
    game.pstScore -= sign * getPstBonus(oldPt, from, side);

    // 移動先のハッシュとPSTを加算
    game.board[to] = newPiece;
    game.board[from] = 0;
    game.currentHash ^= zobristPiece[to * 33 + pieceIndex(newPiece)];
    game.pstScore += sign * getPstBonus(newPt, to, side);

    // 成った場合は駒価値の差分を更新
    if (promote) {
      game.materialScore += sign * (PIECE_VALUES[newPt] - PIECE_VALUES[oldPt]);
    }

    // 玉移動の追跡
    if (oldPt === OU) game.kingSq[side] = to;

    game.lastMovePos = to;
  }

  game.historyIdx++;
  game.turn = (1 - game.turn) as 0 | 1;
  game.ply++;
  game.currentHash ^= zobristTurn;
}

export function unmakeMove(game: GameState, m: number): void {
  game.historyIdx--;
  game.turn = (1 - game.turn) as 0 | 1;
  game.ply--;

  const from = decodeFrom(m);
  const to = decodeTo(m);
  const promote = decodePromote(m);
  const drop = decodeDrop(m);
  const piece = decodePiece(m);
  const side = game.turn;
  const sign = side === 0 ? 1 : -1;
  const enemySign = -sign;

  // hashHistoryを直接復元（点数もリセット前の状態から計算し直すより履歴から戻した方が正確）
  // ただし点数履歴は持っていないので、不整合を防ぐため unmakeMove でも逆の差分計算を行う

  if (drop) {
    const oldPst = sign * getPstBonus(piece, to, side);
    game.pstScore -= oldPst;
    game.materialScore -= sign * PIECE_VALUES[piece];
    game.materialScore += sign * PIECE_VALUES[piece] * HAND_BONUS;

    if (piece === OU) game.kingSq[side] = -1;

    game.board[to] = 0;
    game.hand[side][piece]++;
  } else {
    const captured = game.capturedHistory[game.historyIdx];
    const oldPiece = sign * piece;
    const oldPt = Math.abs(oldPiece);
    const currentPiece = game.board[to];
    const currentPt = Math.abs(currentPiece);

    // 移動先の点数を引く
    game.pstScore -= sign * getPstBonus(currentPt, to, side);

    // 移動元の点数を戻す
    game.pstScore += sign * getPstBonus(oldPt, from, side);

    // 成っていた場合は価値の差分を戻す
    if (promote) {
      game.materialScore -= sign * (PIECE_VALUES[currentPt] - PIECE_VALUES[oldPt]);
    }

    if (oldPt === OU) game.kingSq[side] = from;

    game.board[from] = oldPiece;
    game.board[to] = captured;

    if (captured !== 0) {
      const capPt = Math.abs(captured);
      // 取られた駒の点数を戻す
      game.materialScore += enemySign * PIECE_VALUES[capPt];
      game.pstScore += enemySign * getPstBonus(capPt, to, 1 - side);

      if (capPt === OU) game.kingSq[1 - side] = to;

      const capPiece = UNPROMOTE[captured * -sign];
      if (capPiece !== ZOU && capPiece !== TAISHI) {
        game.hand[side][capPiece]--;
        // 持ち駒の加算分を引く
        game.materialScore -= sign * PIECE_VALUES[capPiece] * HAND_BONUS;
      }
    }
  }

  game.currentHash = game.hashHistory[game.historyIdx];
}