/**
 * 定跡JSONを軽量版に変換するスクリプト
 * - ハッシュキーを削除し、SFENをキーとするマッピングに変換
 * - 深さ12手までに制限
 * - 各局面の候補手のトップ3のみ保持
 */

const fs = require('fs');

const INPUT_FILE = './scripts/joseki_cpp/joseki_bb.json';
const OUTPUT_FILE = './assets/data/joseki.json';
const MAX_PLY = 999;  // 全ての定跡を含める

console.log('定跡JSONを読み込み中...');
const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

console.log(`元の局面数: ${Object.keys(data.positions).length}`);

// SFENベースのマッピングに変換
const josekiMap = {};
let included = 0;
let excluded = 0;

for (const [key, entry] of Object.entries(data.positions)) {
    // 深さ制限
    if (entry.ply > MAX_PLY) {
        excluded++;
        continue;
    }

    // SFENをキーとして使用（手数部分を除去して一般化）
    const sfen = entry.sfen.split(' ').slice(0, 3).join(' ');

    // 候補手をシンプルな形式に変換
    const moves = entry.moves.slice(0, 3).map(m => ({
        m: m.move,          // "7g7f" 形式
        s: m.score,         // スコア
    }));

    josekiMap[sfen] = moves;
    included++;
}

console.log(`含める局面数: ${included}`);
console.log(`除外した局面数: ${excluded}`);

// 軽量形式で保存
const output = {
    v: 1,
    p: josekiMap
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output));

const stats = fs.statSync(OUTPUT_FILE);
console.log(`出力ファイルサイズ: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`保存完了: ${OUTPUT_FILE}`);
