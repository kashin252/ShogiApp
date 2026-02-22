# Rustエンジン パフォーマンス修正 & バグ修正

## Rust修正（5件）
- [x] 問題1: `lookup.rs` — ルックアップテーブルの毎回init呼び出し除去
- [x] 問題2: `search.rs` — 静止探索のα/β符号反転バグ修正
- [x] 問題3: `search.rs` — Futility Pruning内のevaluate重複呼び出し修正
- [x] 問題4: `move_gen.rs` — 二歩チェックのfile mask事前計算
- [x] 問題5: `move_gen.rs` — generate_custom_movesの駒種保持修正

## アプリバグ修正（2件）
- [x] 盤面反転時の持ち駒バグ — `GameScreen.tsx`で下段をbottomHandSideに修正
- [x] プレイ制限リセットバグ — 起動時canPlayチェック追加 + isPlayBlockedでブロック

## Rust-TypeScript連携修正
- [x] .soファイルが古い（2月2日）ことを発見
- [x] `.cargo/config.toml` を作成（NDKリンカーパス設定）
- [x] `build_rust.sh` を作成（3ターゲットクロスコンパイル+コピー）
- [x] 最新Rust修正を含む.soを3ターゲット分ビルド＆jniLibsにコピー
- [x] AABビルド成功 → `build-1771483192833.aab`
- [x] Expo Autolinking回避のためのNative Module手動登録 (`ShogiEngineModule.kt`, `MainApplication.kt`)
- [x] JNI関数名変更 (`com.kashin252.shogiapp`)
- [x] `game.ts` のクラス構造修復と `killerMoves` プロパティ統一
- [x] `versionCode` 67 に更新し、新ビルド完了 → `build-1771494990024.apk`
- [x] APK静的解析によるRustエンジン組み込み検証
  - [x] 初回解析で配置ミス発覚 (`lib`なし)
  - [x] `.so` を `android/app/src/main/jniLibs` に移動
  - [x] 再ビルド (Version 68) と再解析 → **成功** (libあり、シンボルOK)
- [x] AAB形式での再ビルド (APKではテスト不可のため)
  - [x] eas.json確認 (`production`プロファイルを使用)
  - [x] 再ビルド (Version 69) → **ユーザー報告: 悪化(クラッシュ)**
  - [x] クラッシュ対策: `System.loadLibrary`例外処理追加 (`Throwable` catch)
  - [x] 再ビルド (Version 70) とAAB解析 → **成功** (libあり、クラッシュ対策済み)
- [x] Rustエンジンの連携修正 (JNIシグネチャ、結果パース)
- [x] 持ち駒バグの修正 (配列サイズ拡大、初期化処理追加)
- [x] ビルドエラーの解消 (新アーキテクチャ設定の調整)
- [x] RustエンジンのSFENパース修正 (未知の駒でxをインクリメントするように修正)
- [x] TS側のSFEN生成修正 (未知の駒を空きマスとして出力し盤面ズレを防止)
- [x] GameScreenのデバッグバナー修正 (フック違反修正と非同期対応)
- [x] Rustの統合テスト実行 (象ありSFENでのパニック解消確認)
- [x] Version 75 AABビルドの作成
- [x] AI思考深さの調整 (30秒: 17手, 60秒: 21手)
- [x] Version 76 AABビルドの作成
- [x] Nativeエンジン(NativeModules)の読込修正 (TSフォールバック解消)
- [x] Version 77 AABビルドの作成
- [x] 棋譜テスト用ユーティリティの実装 (`loadUsiSequence`)
- [x] Native連携の堅牢化 (遅延初期化・動的チェック)
- [x] Version 78 AABビルドの作成
- [x] 不正な指し手バグ調査と修正
  - [x] 指し手エンコードの修正 (From/To逆転解消)
  - [x] 象・太子の駒種追加 (types.rs)
  - [x] 象の移動ルール（後ろ以外7マス）の実装 (lookup.rs)
  - [x] SFENパースの拡張 (board.rs)
  - [x] 指し手生成の拡張 (move_gen.rs)
  - [x] 単体テストによる検証
- [x] Version 79 AABビルドの作成 (完了)
- [x] 成果物の共有 (walkthrough.md)
- [x] Rustエンジンの単体テスト実行
  - [x] `cargo test` の実行と結果確認 → **成功** (Mac上でロジック動作確認)
- [x] JNI引数ミスの修正（実機不具合の根本原因）
  - [x] `_class: JClass` と `_this: JObject` の重複を発見・削除
  - [x] `build_rust.sh` で.soを全ABI向けに再ビルド
  - [x] VersionCode 71 AABビルド完了 → `build-1771498249922.aab`
