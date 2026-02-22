# 不正な指し手バグ修正と象・太子のサポート追加計画

## 概要
AIが動けないマスに移動する、または自駒の上に重なるなどの不正な指し手を生成する問題を解決します。
また、棋譜再現に必要な「象」および「太子」の駒種と移動ルールをRustエンジンに実装します。

## 修正が必要な項目

### 1. 指し手エンコードの不一致修正 (緊急)
- **問題**: Rust側が (To: 0-6, From: 7-13) でエンコードしているのに対し、TS側は (From: 0-6, To: 7-13) となっています。これにより、AIが「AからB」へ動かしたつもりが、画面上では「BからA」に動いたように見え、かつルール違反の手として処理されています。
- **対策**: `moves.rs` のエンコード順序をTS側 (`move.ts`) に完全に合わせます。

### 2. 「象」と「太子」のサポート追加
- **問題**: 盤面に存在する「象」がRust側で `Empty` と見なされていたため、AIがその上を通過したり自駒を配置したりしていました。
- **対策**:
  - `types.rs`: `Elephant` (15) と `Deputy` (16) を追加。
  - `lookup.rs`: 
    - **象の移動**: 後ろ以外の周囲7マス（手番依存）。
    - **太子の移動**: 全方位1マス（王と同じ）。
  - `move_gen.rs`: これらの駒の合法手生成ロジックを追加。
  - `board.rs`: SFENの 'E/e' (象) と 'D/d' (太子) をパース可能にする。

### 3. 評価ロジックの更新
- **対策**:
  - `pst.rs`: 象と太子の駒価値（PIECE_VALUES）と位置評価（PST）を追加。
  - `evaluate.rs`: 新しい駒種を評価計算に含める。

## 変更ファイル

### [Rust Engine]
- #### [MODIFY] [types.rs](file:///Users/user/ShogiApp/rust/shogi_engine/src/types.rs) - 駒種定義の拡張
- #### [MODIFY] [moves.rs](file:///Users/user/ShogiApp/rust/shogi_engine/src/moves.rs) - エンコード順序の修正とUSI出力の拡張
- #### [MODIFY] [lookup.rs](file:///Users/user/ShogiApp/rust/shogi_engine/src/lookup.rs) - 象（7マス）・太子の利き定義
- #### [MODIFY] [move_gen.rs](file:///Users/user/ShogiApp/rust/shogi_engine/src/move_gen.rs) - 新しい駒の指し手生成追加
- #### [MODIFY] [board.rs](file:///Users/user/ShogiApp/rust/shogi_engine/src/board.rs) - SFENパースの象・太子対応
- #### [MODIFY] [pst.rs](file:///Users/user/ShogiApp/rust/shogi_engine/src/pst.rs) - 駒価値の追加

## 品質監査計画 (Code Quality Audit)
本タスクでは、アプリ拡張に伴い複雑化した以下の3層について、アーキテクチャの健全性と潜在的課題を総点検します。

### 1. フロントエンド層 (React Native / TypeScript)
- **対象**: `GameScreen.tsx`, UIコンポーネント, 状態管理
- **監査ポイント**:
  - `GameScreen.tsx` (ファイルサイズ約32KB) の肥大化とレンダリング最適化 (不要な再描画の有無)
  - 状態（Context/State）とロジックの分離度合い
  - 非同期処理（AI思考待ち）のUXハンドリング

### 2. バックエンド層 (Rust Engine)
- **対象**: `shogi_engine` クレート (`board.rs`, `search.rs`, `move_gen.rs`, `evaluate.rs`)
- **監査ポイント**:
  - メモリ安全性（Bitboardや配列アクセスの境界チェック）
  - Alpha-Beta探索やZobristハッシュの効率とパフォーマンス限界
  - 新設した「象」「太子」拡張による保守性への影響

### 3. ネイティブ連携層 (JNI / Kotlin)
- **対象**: `ShogiEngineModule.kt`, JNIブリッジ (`lib.rs`)
- **監査ポイント**:
  - RustとKotlin間の非同期処理とスレッドプール設計
  - 文字列や配列の受け渡しによるメモリアロケーションの効率とリークリスク
  - JNI初期化（`initEngine`）の堅牢性と再入可能性

以上の調査結果を `walkthrough.md` に【総評レポート】としてまとめます。

## 検証プラン
- [ ] `cargo test` で指し手エンコードの整合性と合法手生成を確認。
- [ ] 象の初期配置が含まれるSFENを読み込み、AIが象を正しく認識して動かすことを確認。
- [ ] Version 79としてビルドし、実機で不正な移動が解消されたか確認。
