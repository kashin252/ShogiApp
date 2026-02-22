import { GameState, Side, SearchResult } from '../types/game.types';
import { setupInitialBoard, copyBoard, copyHand } from './board';
import { initZobrist, computeHash } from './zobrist';
import { initAttackTables } from './attackTables';
import { generateMoves } from './moveGenerator';
import { isInCheck } from './check';
import { makeMove, unmakeMove } from './makeMove';
import { iterativeDeepening } from './search';
import { decodeTo, decodeFrom, decodeDrop, decodePiece, encodeMove } from './move';
import { gameToSfen } from './josekiService';
import { getJosekiMove } from './josekiService';

import { Platform, NativeModules } from 'react-native';

// 標準のNativeModulesを使用
// 新しいExpo Module形式を使用
import * as ShogiEngine from 'shogi-engine';

let nativeEngineStatus = 'Initializing...';

if (Platform.OS !== 'web') {
  if (ShogiEngine.isNativeEngineAvailable()) {
    nativeEngineStatus = 'Available';
    console.log('Native Engine Loaded: Available');
  } else {
    nativeEngineStatus = 'Error: module.shogiengine is null';
    console.error('Native Engine Load Error: Module is null');
  }
} else {
  nativeEngineStatus = 'Web Environment';
}

export class ShogiGame implements GameState {
  public board: Int8Array;
  public hand: [Int8Array, Int8Array];
  public turn: Side;
  public ply: number;
  public moveCount: number;
  public gameOver: boolean;
  public lastMovePos: number;
  public currentHash: number;
  public resignCount: number;
  public materialScore: number;
  public pstScore: number;
  public kingSq: Int32Array; // [SenteKingSq, GoteKingSq]

  // 置換表
  public ttHash: Float64Array;
  public ttDepth: Int8Array;
  public ttScore: Int16Array;
  public ttFlag: Int8Array;
  public ttMove: Int32Array;

  // キラー手・ヒストリー
  public killerMoves: Int32Array;
  public history: Int32Array;

  // 履歴
  public moveHistory: Int32Array;
  public capturedHistory: Int8Array;
  public hashHistory: Float64Array;
  public historyIdx: number;

  constructor() {
    this.board = new Int8Array(81); // 9x9 board
    this.hand = [new Int8Array(17), new Int8Array(17)]; // Captured pieces (indices 1-16)
    this.turn = 0; // 0: Sente, 1: Gote
    this.ply = 0;
    this.moveCount = 0;
    this.gameOver = false;
    this.lastMovePos = -1;
    this.currentHash = 0;
    this.resignCount = 0;
    this.materialScore = 0;
    this.pstScore = 0;
    this.kingSq = new Int32Array(2);

    // AI用テーブル初期化
    const TT_SIZE = 1 << 20; // 2^20 entries
    this.ttHash = new Float64Array(TT_SIZE);
    this.ttDepth = new Int8Array(TT_SIZE);
    this.ttScore = new Int16Array(TT_SIZE);
    this.ttFlag = new Int8Array(TT_SIZE);
    this.ttMove = new Int32Array(TT_SIZE);
    this.killerMoves = new Int32Array(128 * 2); // Defines MAX_PLY as 128
    this.history = new Int32Array(2 * 81 * 81); // [side][from][to]

    // 履歴初期化
    this.moveHistory = new Int32Array(512);
    this.capturedHistory = new Int8Array(512);
    this.hashHistory = new Float64Array(512);
    this.historyIdx = 0;

    this.reset();
  }

  // デバッグ用ステータス取得
  public getNativeStatus(): string {
    return nativeEngineStatus;
  }

  reset(): void {
    this.board = setupInitialBoard();
    this.hand = [new Int8Array(17), new Int8Array(17)]; // Reset hand
    this.turn = 0;
    initZobrist();
    initAttackTables();
    this.ply = 0;
    this.moveCount = 0;
    this.gameOver = false;
    this.lastMovePos = -1;
    this.currentHash = computeHash(this.board, this.hand, this.turn);
    this.resignCount = 0;
    this.historyIdx = 0;

    this.initScores();

    // テーブルクリア
    this.ttHash.fill(0);
    this.ttDepth.fill(0);
    this.ttScore.fill(0);
    this.ttFlag.fill(0);
    this.ttScore.fill(0);
    this.ttFlag.fill(0);
    this.ttMove.fill(0);
    this.killerMoves.fill(0);
    this.history.fill(0);
  }

  getState(): any {
    return {
      board: copyBoard(this.board),
      hand: copyHand(this.hand),
      turn: this.turn,
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

  private initScores(): void {
    const { getPstBonus } = require('./pst');
    const { PIECE_VALUES, OU } = require('../types/game.types');

    this.materialScore = 0;
    this.pstScore = 0;
    this.kingSq.fill(-1);

    for (let sq = 0; sq < 81; sq++) {
      const v = this.board[sq];
      if (v === 0) continue;
      const side = v > 0 ? 0 : 1;
      const pt = Math.abs(v);
      const sign = v > 0 ? 1 : -1;

      if (pt === OU) {
        this.kingSq[side] = sq;
      }

      this.materialScore += sign * PIECE_VALUES[pt];
      this.pstScore += sign * getPstBonus(pt, sq, side);
    }

    const handBonus = 1.12;
    for (let p = 1; p <= 16; p++) {
      this.materialScore += this.hand[0][p] * PIECE_VALUES[p] * handBonus;
      this.materialScore -= this.hand[1][p] * PIECE_VALUES[p] * handBonus;
    }
  }

  async findBestMove(timeLimit: number = 15000, maxDepth?: number): Promise<SearchResult> {

    // 定跡チェック
    const josekiMove = getJosekiMove(this);
    if (josekiMove !== null) {
      return {
        move: josekiMove,
        score: 0,
        depth: 0,
        nodes: 1,
        time: 0,
        isJoseki: true,
        engineSource: 'joseki' as const,
      };
    }



    const startTime = Date.now();

    // ネイティブRustエンジンを試す（モバイルのみ）
    const isAvailable = ShogiEngine.isNativeEngineAvailable();

    if (isAvailable) {
      try {
        // SFEN文字列を生成してRust側に渡す
        const sfenStr = gameToSfen(this);
        console.warn(`[NativeEngine] SFEN: ${sfenStr}`);

        const result = await ShogiEngine.searchBestMove(
          sfenStr,
          timeLimit,
          maxDepth || 0
        );
        console.warn(`[NativeEngine] search result:`, result);

        if (result && result.move && result.move !== '0000' && !result.move.startsWith('error')) {
          const move = this.parseUsiMove(result.move);
          if (move !== 0) {
            return {
              ...result,
              move: move,
              time: Date.now() - startTime,
              engineSource: 'rust' as const,
            };
          }
        }
        console.warn('[NativeEngine] Fallback due to invalid move or result:', result?.move);
      } catch (e) {
        console.warn('Native engine failed during search:', e);
      }
    }

    // TypeScript版（フォールバック / Web）
    const tsResult = await iterativeDeepening(this, timeLimit, maxDepth);
    return { ...tsResult, engineSource: 'typescript' as const };
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

  /**
   * USI形式の指し手シーケンス（空白区切り）を適用して、特定の局面を再現します。
   * 例: "7g7f 3c3d 2g2f"
   */
  public loadUsiSequence(sequence: string): void {
    const moves = sequence.trim().split(/\s+/);
    for (const moveStr of moves) {
      if (!moveStr) continue;
      const move = this.parseUsiMove(moveStr);
      if (move !== 0) {
        this.applyMove(move);
        this.lastMovePos = decodeTo(move);
      } else {
        console.warn('Failed to parse move in sequence:', moveStr);
      }
    }
  }

  /**
   * 現在までの指し手履歴をUSI形式の配列で返します。
   */
  public getUsiHistory(): string[] {
    const history: string[] = [];
    for (let i = 0; i < this.historyIdx; i++) {
      const m = this.moveHistory[i];
      history.push(this.moveToUsi(m));
    }
    return history;
  }

  private moveToUsi(m: number): string {
    const from = (m >> 7) & 0x7F;
    const to = m & 0x7F;
    const promote = (m & (1 << 14)) !== 0;
    const isDrop = (m & (1 << 15)) !== 0;
    const piece = (m >> 20) & 0xF;

    if (isDrop) {
      const pieces: Record<number, string> = { 1: 'P', 2: 'L', 3: 'N', 4: 'S', 5: 'G', 6: 'B', 7: 'R' };
      return `${pieces[piece] || '?'}*${this.posToUsi(to)}`;
    } else {
      return `${this.posToUsi(from)}${this.posToUsi(to)}${promote ? '+' : ''}`;
    }
  }

  private posToUsi(pos: number): string {
    const x = pos % 9;
    const y = Math.floor(pos / 9);
    const file = 9 - x;
    const rank = String.fromCharCode('a'.charCodeAt(0) + y);
    return `${file}${rank}`;
  }

  public parseUsiMove(usi: string): number {
    try {
      if (usi.includes('*')) {
        // Drop: "P*5e"
        const ptChar = usi[0];
        const toStr = usi.slice(2);
        const to = this.usiToPos(toStr);
        const pieces: Record<string, number> = { 'P': 1, 'L': 2, 'N': 3, 'S': 4, 'G': 5, 'B': 6, 'R': 7 };
        const pt = pieces[ptChar] || 0;
        return encodeMove(81, to, false, true, pt, 0);
      } else {
        // Normal: "7g7f", "7g7f+"
        const fromStr = usi.slice(0, 2);
        const toStr = usi.slice(2, 4);
        const promote = usi.endsWith('+');
        const from = this.usiToPos(fromStr);
        const to = this.usiToPos(toStr);

        // 盤外チェック
        if (from < 0 || from > 80 || to < 0 || to > 80) return 0;

        const piece = Math.abs(this.board[from]);
        const captured = Math.abs(this.board[to]);
        return encodeMove(from, to, promote, false, piece, captured);
      }
    } catch (e) {
      console.error('Failed to parse USI move:', usi, e);
      return 0;
    }
  }

  private usiToPos(usi: string): number {
    if (!usi || usi.length < 2) return -1;
    const file = parseInt(usi[0], 10);
    const rank = usi.charCodeAt(1) - 'a'.charCodeAt(0);
    if (isNaN(file) || file < 1 || file > 9 || rank < 0 || rank > 8) return -1;
    const x = 9 - file;
    const y = rank;
    return y * 9 + x;
  }
}