# 定跡統合タスク

## 概要
C++で生成した定跡データベース（`joseki_bb.json`）をReact Native将棋アプリに統合する。

## タスクリスト

### 調査
- [x] 定跡JSONファイルの構造を確認
- [x] AIエンジン（`search.ts`, `game.ts`）の構造を把握
- [x] Zobristハッシュの互換性を検証 → **不一致を確認**

### 実装
- [x] 定跡サービスモジュールの作成（`josekiService.ts`）
- [x] SFEN生成関数の作成
- [x] 定跡JSONをアセットとして配置
- [x] `ShogiGame.findBestMove`に定跡検索を統合
- [-] 定跡使用時のUI表示（スキップ）

### 検証
- [x] アプリ起動確認
- [x] 対 AI戦で定跡が使われることを確認
