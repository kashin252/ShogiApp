import { GameState, Side, SearchResult } from '../types/game.types';
import { setupInitialBoard, copyBoard, copyHand } from './board';
import { initZobrist, computeHash } from './zobrist';
import { initAttackTables } from './attackTables';
import { generateMoves } from './moveGenerator';
import { isInCheck } from './check';
import { makeMove, unmakeMove } from './makeMove';
import { iterativeDeepening } from './search';
import { decodeTo, decodeFrom, decodeDrop, decodePiece } from './move';

export class ShogiGame {
  public board: Int8Array;
  public hand: [Int8Array, Int8Array];
  public turn: Side;
  public ply: number;
  public moveCount: number;
  public gameOver: boolean;
  public lastMovePos: number;
  public currentHash: number;
  public resignCount: number;

  // 置換表
  public ttHash: Float64Array;
  public ttDepth: Int8Array;
  public ttScore: Int16Array;
  public ttFlag: Int8Array;
  public ttMove: Int32Array;

  // キラー手・ヒストリー
  public killers: Int32Array;
  public history: Int32Array;

  // 履歴
  public moveHistory: Int32Array;
  public capturedHistory: Int8Array;
  public hashHistory: Float64Array;
  public historyIdx: number;

  constructor() {
    // 初期化
    initZobrist();
    initAttackTables();

    // 盤面
    this.board = setupInitialBoard();
    this.hand = [new Int8Array(17), new Int8Array(17)];
    this.turn = 0;
    this.ply = 0;
    this.moveCount = 0;
    this.gameOver = false;
    this.lastMovePos = -1;
    this.resignCount = 0;

    // ハッシュ
    this.currentHash = computeHash(this.board, this.hand, this.turn);

    // 置換表
    const TT_SIZE = 1 << 20;
    this.ttHash = new Float64Array(TT_SIZE);
    this.ttDepth = new Int8Array(TT_SIZE);
    this.ttScore = new Int16Array(TT_SIZE);
    this.ttFlag = new Int8Array(TT_SIZE);
    this.ttMove = new Int32Array(TT_SIZE);

    // キラー・ヒストリー
    this.killers = new Int32Array(128 * 2);
    this.history = new Int32Array(81 * 81);

    // 履歴
    this.moveHistory = new Int32Array(512);
    this.capturedHistory = new Int8Array(512);
    this.hashHistory = new Float64Array(512);
    this.historyIdx = 0;
  }

  reset(): void {
    this.board = setupInitialBoard();
    this.hand = [new Int8Array(17), new Int8Array(17)];
    this.turn = 0;
    this.ply = 0;
    this.moveCount = 0;
    this.gameOver = false;
    this.lastMovePos = -1;
    this.resignCount = 0;
    this.historyIdx = 0;

    this.currentHash = computeHash(this.board, this.hand, this.turn);

    // テーブルクリア
    this.ttHash.fill(0);
    this.ttDepth.fill(0);
    this.killers.fill(0);
    this.history.fill(0);
  }

  getState(): GameState {
    return {
      board: copyBoard(this.board),
      hand: copyHand(this.hand),
      turn: this.turn,
      ply: this.ply,
      moveCount: this.moveCount,
      gameOver: this.gameOver,
      lastMovePos: this.lastMovePos,
    };
  }

  applyMove(encodedMove: number): boolean {
    makeMove(this, encodedMove);

    if (this.turn === 0) {
      this.moveCount++;
    }

    // 勝敗判定
    const moves = new Int32Array(512);
    const cnt = generateMoves(this, moves);
    let hasLegal = false;

    for (let i = 0; i < cnt; i++) {
      makeMove(this, moves[i]);
      if (!isInCheck(this, 1 - this.turn)) {
        hasLegal = true;
      }
      unmakeMove(this, moves[i]);
      if (hasLegal) break;
    }

    if (!hasLegal) {
      this.gameOver = true;
      return false;
    }

    return true;
  }

  async findBestMove(timeLimit: number = 15000): Promise<SearchResult> {
    // 初手はランダム
    if (this.moveCount === 0) {
      const moves = new Int32Array(512);
      const cnt = generateMoves(this, moves);
      const legal: number[] = [];

      for (let i = 0; i < cnt; i++) {
        makeMove(this, moves[i]);
        if (!isInCheck(this, 1 - this.turn)) {
          legal.push(moves[i]);
        }
        unmakeMove(this, moves[i]);
      }

      const randomMove = legal[Math.floor(Math.random() * legal.length)];
      return {
        move: randomMove,
        score: 0,
        depth: 1,
        nodes: legal.length,
        time: 0,
      };
    }

    return iterativeDeepening(this, timeLimit);
  }

  getLegalMoves(from?: number, dropPiece?: number): number[] {
    const moves = new Int32Array(512);
    const cnt = generateMoves(this, moves);
    const legal: number[] = [];

    for (let i = 0; i < cnt; i++) {
      const m = moves[i];

      // フィルタ
      if (from !== undefined) {
        if (decodeDrop(m) || decodeFrom(m) !== from) continue;
      }

      if (dropPiece !== undefined) {
        if (!decodeDrop(m) || decodePiece(m) !== dropPiece) continue;
      }

      makeMove(this, m);
      if (!isInCheck(this, 1 - this.turn)) {
        legal.push(m);
      }
      unmakeMove(this, m);
    }

    return legal;
  }

  undo(): boolean {
    if (this.historyIdx === 0) return false;

    // 履歴から最後の手を取得
    const move = this.moveHistory[this.historyIdx - 1];

    // 現在の手番を保存（unmakeMoveで変わるため）
    const currentTurn = this.turn;

    // 盤面を戻す
    unmakeMove(this, move);

    // カウンタを戻す
    // 元が後手番(1)なら、直前は先手が指したので moveCount を減らす
    if (currentTurn === 1) {
      this.moveCount--;
    }

    this.gameOver = false; // ゲーム終了状態も解除

    // 最終手位置を更新（一つ前の手があればそれを使う）
    if (this.historyIdx > 0) {
      const prevMove = this.moveHistory[this.historyIdx - 1];
      this.lastMovePos = decodeTo(prevMove);
    } else {
      this.lastMovePos = -1;
    }

    return true;
  }
}