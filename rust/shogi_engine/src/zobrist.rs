
use crate::types::{PieceType, Color, Square, PIECE_TYPE_NB, COLOR_NB};
use std::sync::OnceLock;

pub struct Zobrist {
    pub pieces: [[[u64; PIECE_TYPE_NB]; COLOR_NB]; 81],
    pub hand: [[[u64; 19]; PIECE_TYPE_NB]; COLOR_NB], // Max 18 pawns
    pub turn: u64,
}

static ZOBRIST: OnceLock<Zobrist> = OnceLock::new();

pub fn get_zobrist() -> &'static Zobrist {
    ZOBRIST.get_or_init(|| {
        let mut rng = XorShift64::new(123456789);
        let mut pieces = [[[0u64; PIECE_TYPE_NB]; COLOR_NB]; 81];
        for sq in 0..81 {
            for c in 0..COLOR_NB {
                for pt in 0..PIECE_TYPE_NB {
                    pieces[sq][c][pt] = rng.next();
                }
            }
        }
        
        let mut hand = [[[0u64; 19]; PIECE_TYPE_NB]; COLOR_NB];
        for c in 0..COLOR_NB {
            for pt in 0..PIECE_TYPE_NB {
                for count in 0..19 {
                    hand[c][pt][count] = rng.next();
                }
            }
        }
        
        Zobrist {
            pieces,
            hand,
            turn: rng.next(),
        }
    })
}

struct XorShift64(u64);
impl XorShift64 {
    fn new(seed: u64) -> Self { Self(seed) }
    fn next(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.0 = x;
        x
    }
}
