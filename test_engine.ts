import { ShogiGame } from './src/engine/game';
import { generateMoves } from './src/engine/moveGenerator';

const game = new ShogiGame();
const moves = new Int32Array(512);
const cnt = generateMoves(game, moves);

console.log(`Generated ${cnt} moves from initial position.`);

if (cnt === 0) {
    console.error('ERROR: No moves generated!');
    process.exit(1);
}

console.log('Testing search...');
game.findBestMove(1000).then((result) => {
    console.log('Best move found:', result.move);
    if (result.move === 0) {
        console.error('ERROR: Search returned move 0');
    } else {
        console.log('Search success!');
    }
}).catch((err) => {
    console.error('Search failed:', err);
});
