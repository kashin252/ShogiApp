# 定跡統合ウォークスルー

## 完了した作業

C++で生成した定跡データベース（約24,805局面）をReact Native将棋アプリに統合しました。

### 作成したファイル

| ファイル | 説明 |
|----------|------|
| [josekiService.ts](file:///Users/user/ShogiApp/src/engine/josekiService.ts) | 定跡検索サービス（SFEN変換・手の変換） |
| [json.d.ts](file:///Users/user/ShogiApp/src/types/json.d.ts) | JSON型定義 |
| [joseki.json](file:///Users/user/ShogiApp/assets/data/joseki.json) | 軽量化定跡データ（3,125局面、0.41MB） |
| [convert_joseki.js](file:///Users/user/ShogiApp/scripts/convert_joseki.js) | 変換スクリプト |

### 変更したファイル

| ファイル | 変更内容 |
|----------|----------|
| [game.ts](file:///Users/user/ShogiApp/src/engine/game.ts) | `findBestMove`に定跡検索を統合 |
| [game.types.ts](file:///Users/user/ShogiApp/src/types/game.types.ts) | `isJoseki`フラグ追加 |

---

## 技術的解決策

**課題**: C++とTypeScriptでZobristハッシュの生成方法が異なるため、ハッシュで直接検索できない

**解決策**: SFEN（局面文字列）ベースの検索に切り替え

---

## 検証結果

![AI対戦の動作確認](shogi_ai_move_verified_1769389264479.png)

- **アプリ起動**: 正常
- **定跡読み込み**: 3,125局面を初期化（コンソールログで確認）
- **AI応答**: 高速（定跡使用時は探索不要）
- **対局進行**: ▲7六歩 → AIが即座に応答

![定跡統合テストの録画](joseki_test_1769389092424.webp)
