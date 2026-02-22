# コードの全体像と品質総点検（Code Quality Audit）

アプリ全体のソースコード、アーキテクチャ、およびパフォーマンスに関する第三者視点での品質監査レポートです。
現在のアプリは「React Native（フロント）＋Kotlin JNI連携＋Rust（バックエンド共通エンジン）」というモダンで野心的な3層構造で構築されています。全体として非常に強力な構成ですが、将来に向けた保守やパフォーマンス面でいくつかの重大な改善余地が見つかりました。

---

## 📌 1. フロントエンド層 (React Native)

**ファイル群**: `src/screens/GameScreen.tsx`, `src/components/`, `src/engine/`

### 🔍 課題（ファットコンポーネントと再描画）
- **God Object問題**: `GameScreen.tsx` が **1021行** と極度に肥大化しています。盤面状態の管理（State）、タイマー、購入処理、履歴管理、効果音、モーダルの表示ロジックが一つのファイルに詰め込まれています。
- **パフォーマンス（再描画）リスク**: タイマー機能があるため、**毎秒Stateが更新** されています。これにより、盤面コンポーネントや持ち駒表示など、変化のないUI要素全体が毎秒不必要に再レンダリング（Re-render）されており、操作時の微小な「カクつき（Stuttering）」や端末の発熱・バッテリー消費の原因となっています。

### 💡 改善の推奨（アクションプラン）
1. **カスタムフックの抽出**: 状態管理ロジックを分離します（例：`useGameTimer`, `useGameHistory`, `useShogiEngine`）。これにより、UIコンポーネントの見通しが良くなります。
2. **React.memoの導入**: `Board.tsx` や `CapturedPieces.tsx` に `React.memo` を適用し、propsが変更されない限り再描画されないよう最適化します。

---

## 📌 2. ネイティブ連携層 (JNI / Kotlinブリッジ)

**ファイル群**: `android/app/src/main/java/.../ShogiEngineModule.kt`

### 🔍 課題（非同期処理のブロック問題）
- **同期実行の落とし穴**: Kotlin側でRust関数を呼び出すメソッド (`searchBestMove`) が、**非同期化されておらず、React NativeのNativeモジュールスレッドを直接ブロック** しています。
  ```kotlin
  @ReactMethod
  fun searchBestMove(sfen: String, timeLimitMs: Int, maxDepth: Int, promise: Promise) {
      // ⚠️ nativeSearchが数十秒かかる場合、このスレッドが完全に占有される
      val result = nativeSearch(sfen, timeLimitMs, maxDepth)
      promise.resolve(result)
  }
  ```
- **影響**: CPUが全力でAI手を探索している間、React Nativeブリッジがブロックされるため、ユーザーが「待った」ボタンや「投了」ボタンを押しても、AIの思考が終わるまでJSからネイティブへの操作が詰まる（UIがフリーズしたように感じる）危険性が高いです。

### 💡 改善の推奨（アクションプラン）
- Kotlin Coroutinesを導入し、バックグラウンドスレッドで思考させるようにします。
  ```kotlin
  CoroutineScope(Dispatchers.Default).launch {
      val result = nativeSearch(...)
      promise.resolve(result)
  }
  ```

---

## 📌 3. バックエンド層 (Rust Engine)

**ファイル群**: `rust/shogi_engine/src/*`

### 🔍 課題と現状の強み
- **強み**: 堅牢で非常に高速です。盤面管理には「Bitboard（ビットボード）」と「Zobrist Hashing法」というチェスAI由来の高度な手法が用いられており、1秒間に万単位の局面を評価できる優れた実装になっています。今回の「象・太子」の追加の際も、Enumの拡張だけでクリーンに適応できたのはこの設計のおかげです。
- **潜在的課題（探索効率）**: 現在の指し手生成（`move_gen.rs`）は「疑似合法手（Pseudo-legal moves）」を全て生成してから、実際の探索フェーズ（`search.rs` の Alpha-Beta内）で「王手放置チェック (`is_in_check`)」を行って棄却する仕組みです。この構造自体は正確ですが、より深く探索（Depth 10以上）させる場合は「Killer Move（キラームーブ探索）」や「Null Move Pruning（合法手省略枝刈り）」などのさらなる最適化ロジックを追加することで、同じ時間でも「より強いAI」に進化させることができます。

---

## 🌟 総括レポート
全体のアーキテクチャ（ロジックをRustで書き、React Nativeで描写する）は、**「高速なAIアプリ」を作る上で最高の技術選定** です。C++やC#などに比べてメモリ安全性が担保されるRustを使用している恩恵は大きいです。

**今後最も優先すべき改修は以下の2点です：**
1. Kotlin側のメソッド(`ShogiEngineModule.kt`)の **コルーチン化（非同期化）** により、AI思考中のUIフリーズを防ぐこと。
2. `GameScreen.tsx` を分割し **タイマーのカウントダウンで画面全体が再描画されないようにする** こと。

これらの改善を実施することで、商用の本格的な将棋アプリに匹敵する滑らかさとAIの速さを体験できるようになる見込みです。
