package expo.modules.shogiengine

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import android.os.Bundle

class ShogiEngineModule : Module() {
    companion object {
        init {
            System.loadLibrary("shogi_engine")
        }
    }

    override fun definition() = ModuleDefinition {
        Name("ShogiEngine")

        // 探索を実行する非同期関数
        AsyncFunction("findBestMove") { board: List<Int>, senteHand: List<Int>, goteHand: List<Int>, turn: Int, timeLimitMs: Int, promise: Promise ->
            try {
                // IntをByteに変換
                val boardBytes = ByteArray(81) { board.getOrElse(it) { 0 }.toByte() }
                val senteHandBytes = ByteArray(16) { senteHand.getOrElse(it) { 0 }.toByte() }
                val goteHandBytes = ByteArray(16) { goteHand.getOrElse(it) { 0 }.toByte() }

                // ネイティブ関数を呼び出し
                val result = nativeFindBestMove(
                    boardBytes,
                    senteHandBytes,
                    goteHandBytes,
                    turn,
                    timeLimitMs
                )

                // 結果をMapに変換
                val resultMap = mapOf(
                    "moveData" to result.getInt("moveData"),
                    "from" to result.getInt("from"),
                    "to" to result.getInt("to"),
                    "piece" to result.getInt("piece"),
                    "captured" to result.getInt("captured"),
                    "promote" to (result.getInt("promote") == 1),
                    "drop" to (result.getInt("drop") == 1),
                    "score" to result.getInt("score"),
                    "depth" to result.getInt("depth"),
                    "nodes" to result.getLong("nodes"),
                    "timeMs" to result.getLong("timeMs")
                )

                promise.resolve(resultMap)
            } catch (e: Exception) {
                promise.reject("SEARCH_ERROR", e.message, e)
            }
        }
    }

    // ネイティブ関数宣言
    private external fun nativeFindBestMove(
        board: ByteArray,
        senteHand: ByteArray,
        goteHand: ByteArray,
        turn: Int,
        timeLimitMs: Int
    ): Bundle
}
