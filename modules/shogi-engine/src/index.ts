import { NativeModulesProxy, requireNativeModule } from 'expo-modules-core';

// ネイティブモジュールを取得（利用可能な場合のみ）
let ShogiEngineModule: any = null;

try {
    ShogiEngineModule = requireNativeModule('ShogiEngine');
} catch (e) {
    console.log('ShogiEngine native module not available');
}

export interface NativeSearchResult {
    move: string;
    score: number;
    depth: number;
    nodes: number;
}

/**
 * C++エンジンで最善手を探索
 */
export async function searchBestMove(
    sfen: string,
    timeLimitMs: number,
    maxDepth: number = 0
): Promise<NativeSearchResult | null> {
    if (!ShogiEngineModule) {
        return null; // ネイティブモジュールが利用不可
    }

    try {
        const resultString = await ShogiEngineModule.searchBestMove(sfen, timeLimitMs, maxDepth);
        if (!resultString || typeof resultString !== 'string' || resultString.startsWith('error')) {
            return null;
        }

        const parts = resultString.split('|');
        if (parts.length >= 4) {
            return {
                move: parts[0],
                score: parseInt(parts[1], 10),
                depth: parseInt(parts[2], 10),
                nodes: parseInt(parts[3], 10),
            };
        }
        return null;
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
