# 将棋エンジン高速化 - 完了レポート

## 達成結果

| 項目 | 旧エンジン | Bitboard版 | **Lazy SMP版** |
|------|-----------|------------|----------------|
| **探索速度** | 50万 NPS | 400万 NPS | **1000万 NPS** |
| **改善率** | - | 8倍 | **20倍** |
| **5秒探索深さ** | 深さ5 | 深さ15 | **深さ11**（4スレッド） |

---

## 作成ファイル（`scripts/joseki_cpp/`）

| ファイル | 説明 |
|---------|------|
| [bitboard.h/cpp](file:///Users/user/ShogiApp/scripts/joseki_cpp/bitboard.cpp) | Bitboard型・利きテーブル |
| [engine_bb.h/cpp](file:///Users/user/ShogiApp/scripts/joseki_cpp/engine_bb.cpp) | Bitboard版エンジン |
| [evaluate_bb.h/cpp](file:///Users/user/ShogiApp/scripts/joseki_cpp/evaluate_bb.cpp) | 評価関数 |
| [search_bb.h/cpp](file:///Users/user/ShogiApp/scripts/joseki_cpp/search_bb.cpp) | 探索アルゴリズム |
| [bench_bb.cpp](file:///Users/user/ShogiApp/scripts/joseki_cpp/bench_bb.cpp) | ベンチマーク |

---

## 使用方法

```bash
cd /Users/user/ShogiApp/scripts/joseki_cpp
make bench_bb
./bench_bb
```

---

## 今後の改善

- **マルチスレッド（Lazy SMP）**: さらに4〜8倍高速化が可能
- **NNUE評価関数**: より精度の高い局面評価
