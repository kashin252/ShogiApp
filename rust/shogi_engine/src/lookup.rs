
use crate::bitboard::Bitboard;
use crate::types::{Color, Square};
use std::sync::OnceLock;

// Pre-calculated attack tables
static PAWN_ATTACKS: OnceLock<[[Bitboard; 81]; 2]> = OnceLock::new();
static KING_ATTACKS: OnceLock<[Bitboard; 81]> = OnceLock::new();
static KNIGHT_ATTACKS: OnceLock<[[Bitboard; 81]; 2]> = OnceLock::new();
static SILVER_ATTACKS: OnceLock<[[Bitboard; 81]; 2]> = OnceLock::new();
static GOLD_ATTACKS: OnceLock<[[Bitboard; 81]; 2]> = OnceLock::new();
static ELEPHANT_ATTACKS: OnceLock<[[Bitboard; 81]; 2]> = OnceLock::new();
static DEPUTY_ATTACKS: OnceLock<[Bitboard; 81]> = OnceLock::new();

pub fn init_lookups() {
    PAWN_ATTACKS.get_or_init(|| {
        let mut attacks = [[Bitboard::EMPTY; 81]; 2];
        for sq in 0..81 {
            let x = sq % 9;
            let y = sq / 9;
            
            // Sente (Up)
            if y > 0 {
                 attacks[0][sq].set_bit((sq as u8) - 9);
            }
            // Gote (Down)
            if y < 8 {
                 attacks[1][sq].set_bit((sq as u8) + 9);
            }
        }
        attacks
    });
    
    KING_ATTACKS.get_or_init(|| {
        let mut attacks = [Bitboard::EMPTY; 81];
        for sq in 0..81 {
            let x = sq % 9;
            let y = sq / 9;
            
            for dy in -1..=1 {
                for dx in -1..=1 {
                    if dy == 0 && dx == 0 { continue; }
                    
                    let ny = y as i32 + dy;
                    let nx = x as i32 + dx;
                    
                    if nx >= 0 && nx < 9 && ny >= 0 && ny < 9 {
                        attacks[sq].set_bit((ny * 9 + nx) as u8);
                    }
                }
            }
        }
        attacks
    });

    KNIGHT_ATTACKS.get_or_init(|| {
        let mut attacks = [[Bitboard::EMPTY; 81]; 2];
        for sq in 0..81 {
            let x = sq % 9;
            let y = sq / 9;
            
            // Sente: (x-1, y-2), (x+1, y-2)
            if y >= 2 {
                if x > 0 { attacks[0][sq].set_bit(((y - 2) * 9 + (x - 1)) as u8); }
                if x < 8 { attacks[0][sq].set_bit(((y - 2) * 9 + (x + 1)) as u8); }
            }
            
            // Gote: (x-1, y+2), (x+1, y+2)
            if y <= 6 {
                if x > 0 { attacks[1][sq].set_bit(((y + 2) * 9 + (x - 1)) as u8); }
                if x < 8 { attacks[1][sq].set_bit(((y + 2) * 9 + (x + 1)) as u8); }
            }
        }
        attacks
    });
    
    SILVER_ATTACKS.get_or_init(|| {
        let mut attacks = [[Bitboard::EMPTY; 81]; 2];
        for sq in 0..81 {
            let x = sq % 9;
            let y = sq / 9;
            
            // Sente: Top-Left, Top, Top-Right, Bottom-Left, Bottom-Right
            let offsets_sente = [(-1,-1), (0,-1), (1,-1), (-1,1), (1,1)];
            for (dx, dy) in offsets_sente {
                let nx = x as i32 + dx;
                let ny = y as i32 + dy;
                if nx >= 0 && nx < 9 && ny >= 0 && ny < 9 {
                    attacks[0][sq].set_bit((ny * 9 + nx) as u8);
                }
            }
            
            // Gote: Bottom-Left, Bottom, Bottom-Right, Top-Left, Top-Right
            let offsets_gote = [(-1,1), (0,1), (1,1), (-1,-1), (1,-1)];
             for (dx, dy) in offsets_gote {
                let nx = x as i32 + dx;
                let ny = y as i32 + dy;
                if nx >= 0 && nx < 9 && ny >= 0 && ny < 9 {
                    attacks[1][sq].set_bit((ny * 9 + nx) as u8);
                }
            }
        }
        attacks
    });
    
    GOLD_ATTACKS.get_or_init(|| {
        let mut attacks = [[Bitboard::EMPTY; 81]; 2];
        for sq in 0..81 {
            let x = sq % 9;
            let y = sq / 9;
            
            // Sente Moves: Top-L, Top, Top-R, Left, Right, Bottom
            let offsets_sente = [(-1,-1), (0,-1), (1,-1), (-1,0), (1,0), (0,1)];
             for (dx, dy) in offsets_sente {
                let nx = x as i32 + dx;
                let ny = y as i32 + dy;
                if nx >= 0 && nx < 9 && ny >= 0 && ny < 9 {
                    attacks[0][sq].set_bit((ny * 9 + nx) as u8);
                }
            }
            
            // Gote Moves: Bottom-L, Bottom, Bottom-R, Left, Right, Top
             let offsets_gote = [(-1,1), (0,1), (1,1), (-1,0), (1,0), (0,-1)];
             for (dx, dy) in offsets_gote {
                let nx = x as i32 + dx;
                let ny = y as i32 + dy;
                if nx >= 0 && nx < 9 && ny >= 0 && ny < 9 {
                    attacks[1][sq].set_bit((ny * 9 + nx) as u8);
                }
            }
        }
        attacks
    });

    ELEPHANT_ATTACKS.get_or_init(|| {
        let mut attacks = [[Bitboard::EMPTY; 81]; 2];
        for sq in 0..81 {
            let x = sq % 9;
            let y = sq / 9;
            
            // Sente: moves all 8 directions except Down (0, 1)
            let offsets_sente = [(-1,-1), (0,-1), (1,-1), (-1,0), (1,0), (-1,1), (1,1)];
            for (dx, dy) in offsets_sente {
                let nx = x as i32 + dx;
                let ny = y as i32 + dy;
                if nx >= 0 && nx < 9 && ny >= 0 && ny < 9 {
                    attacks[0][sq as usize].set_bit((ny * 9 + nx) as u8);
                }
            }
            
            // Gote: moves all 8 directions except Up (0, -1)
            let offsets_gote = [(-1,1), (0,1), (1,1), (-1,0), (1,0), (-1,-1), (1,-1)];
            for (dx, dy) in offsets_gote {
                let nx = x as i32 + dx;
                let ny = y as i32 + dy;
                if nx >= 0 && nx < 9 && ny >= 0 && ny < 9 {
                    attacks[1][sq as usize].set_bit((ny * 9 + nx) as u8);
                }
            }
        }
        attacks
    });

    DEPUTY_ATTACKS.get_or_init(|| {
        // Same as King
        let mut attacks = [Bitboard::EMPTY; 81];
        for sq in 0..81 {
            let x = sq % 9;
            let y = sq / 9;
            for dy in -1..=1 {
                for dx in -1..=1 {
                    if dy == 0 && dx == 0 { continue; }
                    let ny = y as i32 + dy;
                    let nx = x as i32 + dx;
                    if nx >= 0 && nx < 9 && ny >= 0 && ny < 9 {
                        attacks[sq].set_bit((ny * 9 + nx) as u8);
                    }
                }
            }
        }
        attacks
    });
}

#[inline(always)]
pub fn get_king_attacks(sq: Square) -> Bitboard {
    // Safety: init_lookups() is called once at engine startup from lib.rs
    KING_ATTACKS.get().unwrap()[sq as usize]
}

#[inline(always)]
pub fn get_knight_attacks(sq: Square, c: Color) -> Bitboard {
    KNIGHT_ATTACKS.get().unwrap()[c as usize][sq as usize]
}

#[inline(always)]
pub fn get_silver_attacks(sq: Square, c: Color) -> Bitboard {
    SILVER_ATTACKS.get().unwrap()[c as usize][sq as usize]
}

#[inline(always)]
pub fn get_gold_attacks(sq: Square, c: Color) -> Bitboard {
    GOLD_ATTACKS.get().unwrap()[c as usize][sq as usize]
}

#[inline(always)]
pub fn get_lance_attacks(sq: Square, c: Color, occ: Bitboard) -> Bitboard {
    let mut attacks = Bitboard::EMPTY;
    let x = (sq % 9) as i32;
    let y = (sq / 9) as i32;
    
    let dir_y = match c {
        Color::Sente => -1,
        Color::Gote => 1,
    };
    
    let mut ny = y + dir_y;
    while ny >= 0 && ny < 9 {
        let nsq = (ny * 9 + x) as u8;
        attacks.set_bit(nsq);
        if occ.is_set(nsq) { break; }
        ny += dir_y;
    }
    attacks
}

#[inline(always)]
pub fn get_bishop_attacks(sq: Square, occ: Bitboard) -> Bitboard {
    let mut attacks = Bitboard::EMPTY;
    let x = (sq % 9) as i32;
    let y = (sq / 9) as i32;
    
    let dirs = [(-1,-1), (1,-1), (-1,1), (1,1)];
    
    for (dx, dy) in dirs {
        let mut nx = x + dx;
        let mut ny = y + dy;
        while nx >= 0 && nx < 9 && ny >= 0 && ny < 9 {
            let nsq = (ny * 9 + nx) as u8;
            attacks.set_bit(nsq);
            if occ.is_set(nsq) { break; }
            nx += dx;
            ny += dy;
        }
    }
    attacks
}

#[inline(always)]
pub fn get_rook_attacks(sq: Square, occ: Bitboard) -> Bitboard {
    let mut attacks = Bitboard::EMPTY;
    let x = (sq % 9) as i32;
    let y = (sq / 9) as i32;
    
    let dirs = [(0,-1), (0,1), (-1,0), (1,0)];
    
    for (dx, dy) in dirs {
        let mut nx = x + dx;
        let mut ny = y + dy;
        while nx >= 0 && nx < 9 && ny >= 0 && ny < 9 {
            let nsq = (ny * 9 + nx) as u8;
            attacks.set_bit(nsq);
            if occ.is_set(nsq) { break; }
            nx += dx;
            ny += dy;
        }
    }
    attacks
}

#[inline(always)]
pub fn get_pawn_attacks(sq: Square, c: Color) -> Bitboard {
    PAWN_ATTACKS.get().unwrap()[c as usize][sq as usize]
}

#[inline(always)]
pub fn get_elephant_attacks(sq: Square, c: Color) -> Bitboard {
    ELEPHANT_ATTACKS.get().unwrap()[c as usize][sq as usize]
}

#[inline(always)]
pub fn get_deputy_attacks(sq: Square) -> Bitboard {
    DEPUTY_ATTACKS.get().unwrap()[sq as usize]
}
