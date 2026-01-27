# 将棋エンジン高速化タスク

## 目標
探索速度を50万NPS → 1000万NPS（20倍高速化）

## 達成結果
- 旧エンジン: 50万NPS
- Bitboard版: 400万NPS（8倍）
- **Lazy SMP版: 1000万NPS（20倍）** ✅

## タスクリスト

### 1. Bitboard導入
- [x] Bitboard型定義（bitboard.h）
- [x] Bitboard操作関数（bitboard.cpp）
- [x] 盤面表現の変更（engine_bb.h/cpp）
- [x] 手生成の変更
- [x] 利き計算の変更
- [x] 評価関数の変更（evaluate_bb.h/cpp）
- [x] 探索関数の変更（search_bb.h/cpp）

### 2. SIMD最適化（Bitboardに内蔵）
- [x] popcount最適化（__builtin_popcountll）
- [x] lsb/tzcnt最適化（__builtin_ctzll）

### 3. マルチスレッド
- [x] Lazy SMP実装（完了）

### 4. 検証
- [x] ベンチマークテスト（1000万NPS達成）
- [x] 定跡生成テスト
