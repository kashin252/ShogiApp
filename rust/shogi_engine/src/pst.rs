
use crate::types::{PieceType, Square, Color};

// Material Values (matching evaluate.ts)
pub const PIECE_VALUES: [i32; 17] = [
    0,      // Empty
    100,    // Pawn
    430,    // Lance
    450,    // Knight
    640,    // Silver
    690,    // Gold
    890,    // Bishop
    1040,   // Rook
    15000,  // King
    // Promoted
    530,    // ProPawn
    630,    // ProLance
    640,    // ProKnight
    670,    // ProSilver
    1150,   // Horse
    1300,   // Dragon
    900,    // Elephant
    950,    // Deputy
];

// PST tables usually are [PieceType][Square]
// For simplicity, we can define them as flat arrays or functions.

// Placeholder PST arrays (simulated flat score for now to build structure)
// In real engine, we import large arrays.
// Logic-Based PST
// We use Sente-relative coordinates (0-80).
// For Gote, we simply mirror the square (80 - sq) before evaluation.

pub fn get_pst(pt: PieceType, sq: Square, c: Color) -> i32 {
    let sq_idx = match c {
        Color::Sente => sq as usize,
        Color::Gote => 80 - (sq as usize),
    };
    
    let x = sq_idx % 9; // File: 0=9筋, ..., 8=1筋
    let y = sq_idx / 9; // Rank: 0=1段, ..., 8=9段
    
    match pt {
        PieceType::Pawn => {
            // Advancing is good.
            // 0 (1dan) is promotion zone (handled by Promote piece type usually, but Pawn stays Pawn until promoted)
            // But if it's Pawn on board, it's unpromoted.
            let rank_score = [0, 0, 0, 10, 20, 30, 40, 50, 0]; // 0 at 8 is dead pawn
            // Center files bonus
            let file_bonus = if x >= 3 && x <= 5 { 10 } else { 0 };
            rank_score[y] + file_bonus
        },
        PieceType::Lance => {
            // Likes edge? Or just advancing.
            let rank_score = [0, 0, 0, 10, 20, 40, 50, 20, 0];
            rank_score[y]
        },
        PieceType::Knight => {
             let rank_score = [0, 0, 10, 30, 40, 30, 20, 0, 0];
             rank_score[y]
        },
        PieceType::Silver => {
            // Likes center and advancing.
            // Defensively: 6-8 rank. Offensively: 2-4.
            if y >= 6 { 20 } else if y <= 3 { 30 } else { 10 }
        },
        // PieceType::Gold handles in Promoted/Gold group below
        PieceType::Bishop => {
            // Good diagonals? Hard to encode statically.
            // Just basic centrality calculation reused.
            let dist_center = (4 - x as i32).abs() + (4 - y as i32).abs();
            (10 - dist_center) * 5
        },
        PieceType::Rook => {
            // Promotion zone access and centrality.
            let dist_center_file = (4 - x as i32).abs();
            // High bonus for being deep in enemy camp? No, that's Promoted.
            // Just good positioning.
            (5 - dist_center_file) * 10
        },
        PieceType::King => {
            // CASTLING BONUS
            // King wants to be at sumikko (corners).
            // Yagura/Mino: (x=1, y=7), (x=2, y=8), (x=7, y=7)...
            // Scores relative to safe squares.
            
            // Avoid center/sitting king (5,8) => index 77
            if sq_idx == 76 || sq_idx == 77 || sq_idx == 67 || sq_idx == 68 {
                return -100; // Sitting King penalty
            }
            if sq_idx == 40 { return -50; } // Center King 55 penalty
            
            // Mino / Yagura safe zones
            // x: 0..2 (Left/King side), x: 6..8 (Right/Rook side)
            // y: 6..8 (Bottom)
            if y >= 6 {
                if x <= 2 || x >= 6 {
                    return 80; // Safe castle zone
                }
            }
            0
        },
        // Promoted pieces
        PieceType::ProPawn | PieceType::ProLance | PieceType::ProKnight | PieceType::ProSilver | PieceType::Gold => {
             // Treat like Gold
             if y >= 7 { 40 } else if y >= 6 { 30 } else { 10 }
        },
        PieceType::Horse => 50, // Generally good anywhere
        PieceType::Dragon => 60,
        PieceType::Elephant | PieceType::Deputy => {
            // Centrality bonus
            let dist_center = (4 - x as i32).abs() + (4 - y as i32).abs();
            (10 - dist_center) * 3
        },
        _ => 0
    }
}
