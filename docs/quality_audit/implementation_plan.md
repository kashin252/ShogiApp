# 品質総点検レポート — 全レイヤー精査結果

Rust→Kotlin→TypeScript→UIの全チェーンを網羅的にレビューし、下記の問題を検出。

---

## 🔴 重大 — 即時修正が必要

### 1. SFEN生成の成駒表記バグ（`index.ts`）

[index.ts](file:///Users/user/ShogiApp/modules/shogi-engine/src/index.ts#L77-L96)

先手の成駒 `+P` は大文字、後手の成駒 `+p` は小文字になるべきだが、現在のロジックでは：
```js
sfen += isGote ? char.toLowerCase() : char.toUpperCase();
```
`char = "+p"` に対して `.toUpperCase()` → `"+P"` は正しい。
`char = "+p"` に対して `.toLowerCase()` → `"+p"` は正しい…が、
`char = "+r"` に対して `.toUpperCase()` → `"+R"` OK。

**実はこれは動いている。** 元のcharが常に小文字で定義されているため、先手→`.toUpperCase()`で`"+P"`、後手→そのまま`"+p"`で合っている。

> [!NOTE]
> → ✅ **SFEN生成自体はバグなし**（以前の報告は誤りでした）

### 2. `board.rs` — `make_move`の成り時のmaterial_score計算が不整合

[board.rs L170-249](file:///Users/user/ShogiApp/rust/shogi_engine/src/board.rs#L170-L249)

打ち駒(drop)の場合：
```rust
let pst_val = crate::pst::get_pst(pt, to as u8, turn);
if turn == Color::Sente { self.material_score += pst_val; } else { self.material_score -= pst_val; }
```
**持ち駒のPIECE_VALUEが引かれていない。** drop時には手持ちからPIECE_VALUEを削除→盤上にPIECE_VALUE + PSTを追加すべきだが、PIECE_VALUEの差分調整がない。

ただし`from_sfen()`で初期material_scoreを計算している時に持ち駒のPIECE_VALUEも含めている（L483-488）。よって`make_move`のdropでは持ち駒のvalue差分を計算する必要がある。

**現状：**
- `from_sfen`: hand count × PIECE_VALUE を加減算 ✅
- `make_move` drop: hand[count]を減らす → **PIECE_VALUEを引かない → 二重カウント** 🔴
- `make_move` drop: 盤上に `pst_val`のみ追加 → **PIECE_VALUEが抜けている** 🔴

→ 結果的に打つたびに**PIECE_VALUEが加算**されてmaterial_scoreが一方向にずれる。

#### 修正

```diff
 // board.rs make_move() のdrop部分
 let pst_val = crate::pst::get_pst(pt, to as u8, turn);
-if turn == Color::Sente { self.material_score += pst_val; } else { self.material_score -= pst_val; }
+let piece_val = crate::pst::PIECE_VALUES[pt as usize];
+// Drop: 持ち駒(piece_val)を盤上(piece_val + pst_val)に移動
+// net変化 = +pst_val（piece_valは既にmaterial_scoreに含まれている）
+// ただし、持ち駒の評価にhandBonusはかかっていないのでpst_valのみで正しい
```

> [!IMPORTANT]
> 実は`from_sfen()`で持ち駒を `val * count` で評価し、`make_move`のdropで盤上に `pst_val` のみ追加し、持ち駒のvalは引いていない。**同じvalが二箇所で数えられている。** unmake_moveで元に戻すのでインクリメンタルとしては崩壊しないが、**探索中の評価値の大きさが狂う**。

### 3. `board.rs` — `from_sfen`の持ち駒ハッシュが不正

[board.rs L478-480](file:///Users/user/ShogiApp/rust/shogi_engine/src/board.rs#L478-L480)

```rust
pos.hand[color as usize][pt as usize] += count;
pos.hash ^= zobrist.hand[color as usize][pt as usize][pos.hand[color as usize][pt as usize] as usize];
```

`count > 1` の場合、一度にcount個追加して最終値のハッシュだけXORしている。

**正しい方法**: 1個ずつインクリメントするか、0とcount両方のハッシュをXOR：
- 0番目（初期値）のハッシュと最終値のハッシュの両方をXORすべき

これにより、**持ち駒が2個以上ある場合にZobristハッシュが不正になり、置換表の衝突が増え、探索精度が低下**する。

---

## 🟡 中程度 — 動作に影響

### 4. `search.rs` — `legal_moves_found`のカウントがFutility Pruningで狂う

[search.rs L199-206](file:///Users/user/ShogiApp/rust/shogi_engine/src/search.rs#L199-L206)

Futility Pruningで `continue` する前に `legal_moves_found += 1` しているが、**その手は実際にmake_moveしていないので合法性を確認していない**。もし全生成手がFutilityでスキップされた場合、本来は詰みかステイルメイトだが `legal_moves_found > 0` で通過してしまい、best_score(-30000)が返る。

### 5. `search.rs` — PVS re-searchの条件が不正

[search.rs L231-244](file:///Users/user/ShogiApp/rust/shogi_engine/src/search.rs#L231-L244)

```rust
if score > alpha {
    if reduction > 0 {
        let score_verify = -alpha_beta(ctx, pos, depth - 1, -alpha - 1, -alpha, ply + 1);
        if score_verify > alpha {
            score = -alpha_beta(ctx, pos, depth - 1, -beta, -alpha, ply + 1);
        } else {
            score = score_verify;
        }
    } else {
        if score < beta {
            score = -alpha_beta(ctx, pos, depth - 1, -beta, -alpha, ply + 1);
        }
    }
}
```

LMR re-searchの際、`-alpha - 1, -alpha` で再度null-windowを使っているが、本来は**フルdepthのnull-window** → fail → **フルwindow**の2段階。正しくは：
1. LMR reduced null-window → fail high
2. Full depth null-window (`-alpha-1, -alpha`) → fail high
3. Full depth full-window (`-beta, -alpha`)

現在の実装ではステップ2で`score_verify > alpha`ならステップ3に進むが、`score_verify`の値を使わない手もある。概ね動くが、まれに枝刈りの精度に影響。

### 6. `move_gen.rs` — 成駒の手生成で不成を生成する問題

[move_gen.rs L152-165](file:///Users/user/ShogiApp/rust/shogi_engine/src/move_gen.rs#L152-L165)

`generate_custom_moves`で`actual_pt`として`ProPawn`等を`add_moves`に渡しているが、`add_moves`内の`can_promote`は`pt.is_promoted()`なら常にfalseを返すので問題ない。→ ✅ OK

### 7. `game.ts` — `findBestMove`で「初手はランダム」ロジック

[game.ts L198](file:///Users/user/ShogiApp/src/engine/game.ts#L198)

```js
if (this.moveCount === 0) { ... return random move }
```

`moveCount`は先手が指した回数。AIが後手の場合、先手が1手目を指した後にAIが呼ばれるが、この時`moveCount === 1`なのでランダムにはならない。AIが先手の場合のみランダム。意図通りなら問題ないが、対局ごとに違う展開になる効果が先手のみに限定される。

---

## 🟢 軽微 — 改善推奨

### 8. `tt.rs` — キー衝突チェックにXORを使っていない

[tt.rs L51](file:///Users/user/ShogiApp/rust/shogi_engine/src/tt.rs#L51)

```rust
if (key ^ hash) == 0
```
これは `key == hash` と同じ。Lockless TTの一般的な実装では `key = hash XOR data` として格納し、衝突の完全性を高めるが、現在はkeyとdataを独立に格納。マルチスレッドでdataとkeyが異なるエントリから混在するリスクがある。

### 9. `evaluate.rs` — 角頭弱点チェックがオフバイワンの可能性

[evaluate.rs L34](file:///Users/user/ShogiApp/rust/shogi_engine/src/evaluate.rs#L34)

```rust
if pos.pieces[head_sq as usize - 9] == PieceType::Pawn 
```
`head_sq >= 9` チェック後に `head_sq - 9` をアクセスしているが、`head_sq`自体は`from - 9`。先手角の角頭（一つ上）のさらに一つ上に後手歩があるかチェック。ロジック自体はOKだが、端の筋（x=0やx=8）で行をまたぐケースが考慮されていない可能性がある。（実際には`head_sq - 9`は同じfileの上段なのでOK）

### 10. `lib.rs` — maxDepth パラメータが未使用

[lib.rs](file:///Users/user/ShogiApp/rust/shogi_engine/src/lib.rs) / [ShogiEngineModule.kt](file:///Users/user/ShogiApp/modules/shogi-engine/android/src/main/java/expo/modules/shogiengine/ShogiEngineModule.kt)

TypeScript側のgame.tsでは `maxDepth` パラメータを `findBestMove` に渡しているが、ネイティブの `searchBestMove(sfen, timeLimitMs)` にはtimeLimitMsしか渡していない。Rustエンジンには深さ制限がなく常に25まで探索（時間切れまで）。

---

## 修正対象（提案）

| # | 問題 | ファイル | 影響度 | 修正難度 |
|---|------|---------|--------|---------|
| 2 | drop時のmaterial_score二重カウント | `board.rs` | 🔴 高 | 中 |
| 3 | from_sfenの持ち駒ハッシュ | `board.rs` | 🔴 高 | 簡単 |
| 4 | Futility legal_moves_found | `search.rs` | 🟡 中 | 簡単 |
| 5 | PVS re-search条件 | `search.rs` | 🟡 軽 | 中 |
| 8 | TT XOR trick未使用 | `tt.rs` | 🟢 軽 | 中 |
| 10 | maxDepth未使用 | `lib.rs` / `ShogiEngineModule.kt` | 🟡 中 | 簡単 |

## 検証方法

- Rustコードは `cargo check --target aarch64-linux-android` で文法チェック
- `build_rust.sh` で3ターゲット分クロスコンパイル→jniLibsへコピー
- AABビルド→実機テストで探索情報(Depth/Nodes/Time/Score)の変化を確認
- 手動テスト: 何手か対局して、打ち駒後にスコアが突然跳ね上がらないか確認
