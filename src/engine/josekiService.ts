/**
 * 定跡サービス
 * SFENベースで定跡データベースを検索し、候補手を取得
 */

import { ShogiGame } from './game';
import { encodeMove } from './move';
import { generateMoves } from './moveGenerator';
import { makeMove, unmakeMove } from './makeMove';
import { isInCheck } from './check';

// 定跡データ
import josekiData from '../../assets/data/joseki.json';

// 駒の種類定数
const PIECE_TYPES = {
    FU: 1, KYO: 2, KEI: 3, GIN: 4, KIN: 5, KAKU: 6, HI: 7,
    OU: 8, TO: 9, NKYO: 10, NKEI: 11, NGIN: 12, UMA: 13, RYU: 14,
    ZOU: 15, TAISHI: 16
};

// 駒のSFEN表記（英語）
const PIECE_TO_SFEN: { [key: number]: string } = {
    1: 'P', 2: 'L', 3: 'N', 4: 'S', 5: 'G', 6: 'B', 7: 'R',
    8: 'K', 9: '+P', 10: '+L', 11: '+N', 12: '+S', 13: '+B', 14: '+R',
    15: 'E', 16: 'D'  // E=Elephant(象), D=Deputy(太子)
};

interface JosekiMove {
    m: string;  // "7g7f" 形式
    s: number;  // スコア
}

// 定跡マップ (SFEN -> 候補手)
const josekiMap: Map<string, JosekiMove[]> = new Map();

/**
 * 初期化：JSONデータをMapに変換
 */
export function initJoseki(): void {
    if (josekiMap.size > 0) return;  // 既に初期化済み

    const data = josekiData as { v: number; p: Record<string, JosekiMove[]> };
    for (const [sfen, moves] of Object.entries(data.p)) {
        josekiMap.set(sfen, moves);
    }
    console.log(`定跡初期化完了: ${josekiMap.size}局面`);
}

/**
 * 局面をSFEN形式に変換
 */
export function gameToSfen(game: ShogiGame): string {
    const board = game.board;
    let sfen = '';

    // 盤面
    for (let r = 0; r < 9; r++) {
        if (r > 0) sfen += '/';
        let empty = 0;

        for (let c = 0; c < 9; c++) {
            const v = board[r * 9 + c];
            if (v === 0) {
                empty++;
            } else {
                if (empty > 0) {
                    sfen += empty;
                    empty = 0;
                }
                const pieceType = Math.abs(v);
                let pieceStr = PIECE_TO_SFEN[pieceType] || '?';
                if (v < 0) {
                    // 後手は小文字
                    pieceStr = pieceStr.toLowerCase();
                }
                sfen += pieceStr;
            }
        }
        if (empty > 0) sfen += empty;
    }

    // 手番
    sfen += game.turn === 0 ? ' b ' : ' w ';

    // 持ち駒
    let handStr = '';
    const handOrder = [7, 6, 5, 4, 3, 2, 1]; // HI, KAKU, KIN, GIN, KEI, KYO, FU
    const handPieceStr = ['R', 'B', 'G', 'S', 'N', 'L', 'P'];

    for (let side = 0; side < 2; side++) {
        for (let i = 0; i < handOrder.length; i++) {
            const p = handOrder[i];
            const cnt = game.hand[side][p];
            if (cnt > 0) {
                let ch = handPieceStr[i];
                if (side === 1) ch = ch.toLowerCase();
                if (cnt > 1) handStr += cnt;
                handStr += ch;
            }
        }
    }

    if (handStr === '') handStr = '-';
    sfen += handStr;

    return sfen;
}

/**
 * 定跡を検索
 */
export function lookupJoseki(game: ShogiGame): JosekiMove[] | null {
    const sfen = gameToSfen(game);
    return josekiMap.get(sfen) || null;
}

/**
 * SFEN形式の手をエンコードされた手に変換
 * @param moveStr "7g7f" 形式の手
 * @param game 現在の局面
 * @returns エンコードされた手、または null（変換失敗時）
 */
export function sfenMoveToEncoded(moveStr: string, game: ShogiGame): number | null {
    // 打ち駒の場合: "P*5e" 形式
    if (moveStr.includes('*')) {
        const pieceChar = moveStr[0].toUpperCase();
        const toFile = 9 - parseInt(moveStr[2]);
        const toRank = moveStr.charCodeAt(3) - 'a'.charCodeAt(0);
        const to = toRank * 9 + toFile;

        // 駒の種類を取得
        const pieceMap: { [key: string]: number } = {
            'P': 1, 'L': 2, 'N': 3, 'S': 4, 'G': 5, 'B': 6, 'R': 7
        };
        const piece = pieceMap[pieceChar];
        if (!piece) return null;

        // 合法手から該当する打ち駒を探す
        const moves = new Int32Array(512);
        const cnt = generateMoves(game, moves);

        for (let i = 0; i < cnt; i++) {
            const m = moves[i];
            const mTo = (m >> 7) & 0x7f;
            const mDrop = ((m >> 15) & 1) === 1;
            const mPiece = (m >> 16) & 0x1f;

            if (mDrop && mTo === to && mPiece === piece) {
                // 合法性チェック
                makeMove(game, m);
                const legal = !isInCheck(game, 1 - game.turn);
                unmakeMove(game, m);
                if (legal) return m;
            }
        }
        return null;
    }

    // 通常の移動: "7g7f" 形式
    if (moveStr.length < 4) return null;

    const fromFile = 9 - parseInt(moveStr[0]);
    const fromRank = moveStr.charCodeAt(1) - 'a'.charCodeAt(0);
    const toFile = 9 - parseInt(moveStr[2]);
    const toRank = moveStr.charCodeAt(3) - 'a'.charCodeAt(0);
    const promote = moveStr.length > 4 && moveStr[4] === '+';

    const from = fromRank * 9 + fromFile;
    const to = toRank * 9 + toFile;

    // 合法手から該当する手を探す
    const moves = new Int32Array(512);
    const cnt = generateMoves(game, moves);

    for (let i = 0; i < cnt; i++) {
        const m = moves[i];
        const mFrom = m & 0x7f;
        const mTo = (m >> 7) & 0x7f;
        const mDrop = ((m >> 15) & 1) === 1;
        const mPromote = ((m >> 14) & 1) === 1;

        if (!mDrop && mFrom === from && mTo === to && mPromote === promote) {
            // 合法性チェック
            makeMove(game, m);
            const legal = !isInCheck(game, 1 - game.turn);
            unmakeMove(game, m);
            if (legal) return m;
        }
    }

    return null;
}

/**
 * 定跡から手を選択
 * スコアが高い手ほど選ばれやすい重み付きランダム選択
 */
export function selectJosekiMove(moves: JosekiMove[]): JosekiMove {
    if (moves.length === 1) return moves[0];

    // スコアに基づく重み付け（スコアが高いほど高確率）
    // スコアを0以上に正規化
    const minScore = Math.min(...moves.map(m => m.s));
    const weights = moves.map(m => m.s - minScore + 10);  // +10で最低重み確保
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let rand = Math.random() * totalWeight;
    for (let i = 0; i < moves.length; i++) {
        rand -= weights[i];
        if (rand <= 0) return moves[i];
    }

    return moves[0];
}

/**
 * 定跡手を取得（メイン関数）
 * @param game 現在の局面
 * @returns エンコードされた手、または null（定跡なし）
 */
export function getJosekiMove(game: ShogiGame): number | null {
    // 初回は初期化
    if (josekiMap.size === 0) {
        initJoseki();
    }

    // 定跡検索
    const josekiMoves = lookupJoseki(game);
    if (!josekiMoves || josekiMoves.length === 0) {
        return null;
    }

    // 候補から選択
    const selected = selectJosekiMove(josekiMoves);

    // エンコード形式に変換
    const encoded = sfenMoveToEncoded(selected.m, game);
    if (encoded !== null) {
        console.log(`定跡使用: ${selected.m} (score: ${selected.s})`);
    }

    return encoded;
}
