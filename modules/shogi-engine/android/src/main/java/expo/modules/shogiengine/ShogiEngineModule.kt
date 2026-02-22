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

        AsyncFunction("searchBestMove") { sfen: String, timeLimitMs: Int, maxDepth: Int ->
            return@AsyncFunction nativeSearch(sfen, timeLimitMs, maxDepth)
        }
    }

    private external fun nativeSearch(sfen: String, timeLimitMs: Int, maxDepth: Int): String
}
