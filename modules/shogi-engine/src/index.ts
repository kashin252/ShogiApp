import { NativeModulesProxy, requireNativeModule } from 'expo-modules-core';

// ネイティブモジュールを取得（利用可能な場合のみ）
let ShogiEngineModule: any = null;

try {
    ShogiEngineModule = requireNativeModule('ShogiEngine');
} catch (e) {
    console.log('ShogiEngine native module not available');
}

export interface NativeSearchResult {
    moveData: number;
    from: number;
    to: number;
    piece: number;
    captured: number;
    promote: boolean;
    drop: boolean;
    score: number;
    depth: number;
    nodes: number;
    timeMs: number;
}

/**
 * C++エンジンで最善手を探索
 */
export async function findBestMoveNative(
    board: number[],
    senteHand: number[],
    goteHand: number[],
    turn: number,
    timeLimitMs: number
): Promise<NativeSearchResult | null> {
    if (!ShogiEngineModule) {
        return null; // ネイティブモジュールが利用不可
    }

    try {
        const result = await ShogiEngineModule.findBestMove(
            board,
            senteHand,
            goteHand,
            turn,
            timeLimitMs
        );
        return result as NativeSearchResult;
    } catch (error) {
        console.error('Native search failed:', error);
        return null;
    }
}

/**
 * ネイティブモジュールが利用可能かどうか
 */
export function isNativeEngineAvailable(): boolean {
    return ShogiEngineModule !== null;
}
