# 定跡データベースのアプリ統合

## 背景

C++で生成した定跡データベース（`joseki_bb.json`、約51万局面）をReact Native将棋アプリのAIエンジンに統合する。序盤でAIが定跡手を使用することで、探索時間を節約し強い序盤を実現する。

### 発見された課題

**Zobristハッシュの不一致**:
- C++: 固定シード（`12345`）の`mt19937_64`で生成
- TypeScript: `Math.random()`で毎回異なる値を生成

→ **解決策**: SFENベースで局面を検索する

---

## 変更内容

### 1. 定跡ファイル配置

#### [NEW] [joseki.json](file:///Users/user/ShogiApp/assets/data/joseki.json)

- `scripts/joseki_cpp/joseki_bb.json`をコピー
- ただし、サイズが11MBと大きいため、**軽量版を作成**：
  - ハッシュキーを削除し、SFEN → 手のマッピングに変換
  - 深さ10手までに制限（アプリ起動時間への影響を抑制）

---

### 2. 定跡サービスの作成

#### [NEW] [josekiService.ts](file:///Users/user/ShogiApp/src/engine/josekiService.ts)

```typescript
// 定跡データ型
interface JosekiMove {
  move: string;   // "7g7f" 形式
  score: number;
  depth: number;
}

interface JosekiEntry {
  moves: JosekiMove[];
  ply: number;
}

// 主要機能
- loadJoseki(): 定跡JSONを読み込み、SFENでインデックス化したMapを構築
- lookupJoseki(sfen: string): 局面に合致する定跡手を取得
- selectJosekiMove(entry): 候補手から1つ選択（評価値加味のランダム選択）
- sfenMoveToEncoded(moveStr, game): SFEN形式の手をエンコード形式に変換
```

---

### 3. SFEN生成関数の作成

#### [MODIFY] [game.ts](file:///Users/user/ShogiApp/src/engine/game.ts)

`ShogiGame`クラスに`toSfen()`メソッドを追加：

```typescript
toSfen(): string {
  // 盤面、手番、持ち駒をSFEN形式で出力
  // 例: "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1"
}
```

---

### 4. AIへの統合

#### [MODIFY] [game.ts](file:///Users/user/ShogiApp/src/engine/game.ts)

`findBestMove`メソッドを修正：

```typescript
async findBestMove(timeLimit: number = 15000): Promise<SearchResult> {
  // 1. 定跡チェック（序盤のみ）
  if (this.ply < 20) {
    const josekiMove = lookupAndSelectJoseki(this);
    if (josekiMove) {
      return { move: josekiMove, score: 0, depth: 0, nodes: 1, time: 0, isJoseki: true };
    }
  }
  
  // 2. 通常の探索へフォールバック
  // ... 既存コード
}
```

---

## 検証計画

### 自動テスト

このプロジェクトには既存のテストスイートがありません（`jest`等が未設定）。

### 手動検証

以下の手順でアプリを起動し、AIが定跡を使用することを確認：

1. **アプリ起動**
   ```bash
   cd /Users/user/ShogiApp
   npm start
   ```

2. **対AI戦を開始**
   - ブラウザ（Web版）またはExpo Goで開く
   - 「Play AI」モードを選択

3. **AI側で最初の数手が定跡手であることを確認**
   - AIの思考時間が通常より短い（定跡使用時はほぼ即座）
   - 一般的な定跡手（▲7六歩、▲2六歩など）が指される

4. **ログ確認（オプション）**
   - コンソールに定跡使用のログを追加し、実際に定跡が参照されていることを確認
