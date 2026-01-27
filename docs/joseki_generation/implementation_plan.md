# 将棋エンジン高速化計画

## 目標
探索速度を **50万NPS → 1000万NPS**（20倍高速化）

## 改善項目

### 1. Bitboard導入（10〜20倍高速化）

**概要**: 盤面を81bitのビット配列で表現し、ビット演算で高速に処理

**変更ファイル**:
- [NEW] `bitboard.h` - Bitboard型定義
- [NEW] `bitboard.cpp` - Bitboard操作関数
- [MODIFY] `engine.h/cpp` - 盤面表現をBitboardに変更
- [MODIFY] `evaluate.cpp` - Bitboardベースの評価

**技術詳細**:
```cpp
// 81マスを128bitで表現（__uint128_t または 2つの64bit）
struct Bitboard {
    uint64_t p[2];  // p[0]=下位64bit, p[1]=上位17bit
};
```

---

### 2. SIMD最適化（2〜5倍高速化）

**概要**: AVX2/SSE命令でビット演算を並列化

**変更ファイル**:
- [MODIFY] `bitboard.h` - SIMD intrinsics使用
- [MODIFY] `evaluate.cpp` - PST計算のベクトル化

**技術詳細**:
```cpp
#include <immintrin.h>
// popcount, lzcnt, tzcnt など
```

---

### 3. マルチスレッド（コア数倍高速化）

**概要**: Lazy SMP（複数スレッドで同じ局面を異なる順序で探索）

**変更ファイル**:
- [MODIFY] `search.cpp` - スレッドプール導入
- [MODIFY] `engine.h` - スレッドセーフな置換表

**技術詳細**:
```cpp
#include <thread>
#include <atomic>
// std::thread でワーカー起動
// std::atomic で置換表アクセス
```

---

## 実装優先度

| 優先度 | 項目 | 工数 | 効果 |
|--------|------|------|------|
| 1 | Bitboard | 高 | 10〜20倍 |
| 2 | SIMD | 中 | 2〜5倍 |
| 3 | マルチスレッド | 中 | コア数倍 |

## 注意事項

> [!WARNING]
> この改修は大規模で、既存のエンジン全体の書き換えが必要です。
> 既存の70局面の定跡データは引き続き使用可能です。

---

## 代替案

既存の高速エンジン（やねうら王等）を呼び出して定跡生成する方が効率的な場合もあります。
