
# Rust Engine Performance Optimization Plan

現状のRustエンジンは検索アルゴリズムが単純なため、TypeScript版（高度な最適化済み）と比較して実質的な深さや探索速度で劣っています。これを解消し、Rust本来の速度を引き出すための最適化を行います。

## 課題
- **探索アルゴリズム**: TT, Move Ordering, Pruning 等が欠如しているため、探索ノード数が爆発している。
- **データ構造**: `make_move` ごとに盤面全体を `clone()` しており、メモリコピーのオーバーヘッドが大きい。
- **評価関数**: 毎ノード全駒を走査して計算しており、差分計算（Incremental Evaluation）ができていない。

## フェーズ1: 探索アルゴリズムの強化 (High Impact)

### 1. Zobrist Hash & Transposition Table (TT)
- 盤面状態を一意に識別するハッシュ値を導入。
- 同じ局面を再探索しないよう、深さ・スコア・最善手を置換表に保存。

### 2. 指し手の並び替え (Move Ordering)
- **MVV-LVA**: 価値の高い駒を、価値の低い駒で取る手を優先。
- **Killer Move**: ベータカットを引き起こした手を記録し、優先的に探索。
- **PV Move**: 前の反復深化で得られた最善手を最優先。

### 3. 先端的な枝刈り (Advanced Pruning)
- **Quiescence Search (静止探索)**: 駒の取り合いが落ち着くまで探索を続け、地平線効果を抑制。
- **PVS (Principal Variation Search)**: 有力な手以外は狭い窓で探索し、高速化。
- **Null Move Pruning**: 手番をパスしてもなお優勢なら探索を打ち切る。

## フェーズ2: 盤面管理と評価の高速化 (Medium Impact)

### 1. Make/Unmake Move の導入
- `clone()` をやめ、1つの盤面オブジェクトを破壊的に更新・復元する。
- 復元用に `UndoInfo` 構造体を用意。

### 2. 差分評価 (Incremental Evaluation)
- `Position` 内に `material_pst_score` などのキャッシュを持たせる。
- `make_move` / `unmake_move` の際に、動かした駒の分だけスコアを更新する。

### 3. 高速な駒検索
- `pieces: [PieceType; 81]` 配列を追加し、特定のマスの駒を $O(1)$ で取得可能にする。

## フェーズ3: 検証と調整

- **PERFT (Performance Test)**: 指し手生成の正当性と速度を確認。
- **ベンチマーク**: TypeScript版との探索ノード数/秒 (nps) の比較。

## ユーザー確認事項

> [!IMPORTANT]
> この最適化により、探索アルゴリズムはTypeScript版と同等以上の複雑さになりますが、実行速度は数倍〜数十倍向上が見込まれます。

> [!NOTE]
> 差分更新の実装はデバッグが難しくなるため、PERFTテストを厳密に行います。
