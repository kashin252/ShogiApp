
use crate::board::Position;
use crate::types::{Color, PieceType};

pub fn evaluate(pos: &Position) -> i32 {
    let mut score = pos.material_score;
    
    // Mobility & Structural Evaluation
    // Removed expensive bitboard loops for now to recover NPS.
    
    // Bishop Head Weakness Checking (Optimized)
    // We only check for specific tactical weakness: Bishop head being attacked by pawn.
    const BISHOP_HEAD_PENALTY: i32 = 120; // Slightly reduced
    
    // We need to find Bishops. Iterating 81 squares is slow.
    // Iterating bitboard pop_lsb is better.
    // But we only do it for Bishops (max 2 per side usually).
    
    let us = pos.turn;
    // Evaluation Perspective: Sente score - Gote score.
    
    let mut mobility_balance = 0;
    
    // Sente Bishops
    let mut sente_bishops = pos.bitboards[PieceType::Bishop as usize] & pos.color_bb[Color::Sente as usize];
    while let Some(from) = sente_bishops.pop_lsb() {
        // Bishop Head is (x, y-1) => index - 9
        let y = from / 9;
        if y > 0 {
            let head_sq = from - 9;
            // Check if Gote Pawn attacks this square?
            // Gote pawn attacks DOWN. So Gote pawn at (head_sq - 9) attacks head_sq.
            if head_sq >= 9 {
                if pos.pieces[head_sq as usize - 9] == PieceType::Pawn 
                   && pos.color_at[head_sq as usize - 9] == Color::Gote 
                {
                    mobility_balance -= BISHOP_HEAD_PENALTY;
                }
            }
        }
    }
    
    // Gote Bishops
    let mut gote_bishops = pos.bitboards[PieceType::Bishop as usize] & pos.color_bb[Color::Gote as usize];
    while let Some(from) = gote_bishops.pop_lsb() {
        // Bishop Head is (x, y+1) => index + 9
        let y = from / 9;
        if y < 8 {
            let head_sq = from + 9;
            // Check if Sente Pawn attacks this square?
            // Sente pawn attacks UP. So Sente pawn at (head_sq + 9) attacks head_sq.
            if head_sq <= 71 {
                if pos.pieces[head_sq as usize + 9] == PieceType::Pawn 
                   && pos.color_at[head_sq as usize + 9] == Color::Sente 
                {
                    mobility_balance += BISHOP_HEAD_PENALTY;
                }
            }
        }
    }

    // King Safety Evaluation: Reward Gold and Silver pieces near the King.
    // Finding Sente and Gote King positions manually
    let mut sente_king_sq: Option<usize> = None;
    let mut gote_king_sq: Option<usize> = None;

    let mut k_bb = pos.bitboards[PieceType::King as usize];
    while let Some(from) = k_bb.pop_lsb() {
        if pos.color_at[from as usize] == Color::Sente {
            sente_king_sq = Some(from as usize);
        } else {
            gote_king_sq = Some(from as usize);
        }
    }

    // Directions around King (Up, Down, Left, Right, Diagonals)
    let king_adj_offsets: [i32; 8] = [-10, -9, -8, -1, 1, 8, 9, 10];
    const CASTLE_BONUS: i32 = 80;

    // Check Sente King Safety
    if let Some(sq) = sente_king_sq {
        let mut def_pieces = 0;
        for &offset in &king_adj_offsets {
            let adj_sq = sq as i32 + offset;
            if adj_sq >= 0 && adj_sq < 81 {
                if pos.color_at[adj_sq as usize] == Color::Sente {
                    let pt = pos.pieces[adj_sq as usize];
                    if pt == PieceType::Gold || pt == PieceType::Silver {
                        def_pieces += 1;
                    }
                }
            }
        }
        mobility_balance += def_pieces * CASTLE_BONUS;
        
        // Penalize Kgyoku (King in the center / top)
        let y = sq / 9;
        if y < 6 {
            mobility_balance -= 200; // Prefer King at the bottom (y=6,7,8)
        }
    }

    // Check Gote King Safety
    if let Some(sq) = gote_king_sq {
        let mut def_pieces = 0;
        for &offset in &king_adj_offsets {
            let adj_sq = sq as i32 + offset;
            if adj_sq >= 0 && adj_sq < 81 {
                if pos.color_at[adj_sq as usize] == Color::Gote {
                    let pt = pos.pieces[adj_sq as usize];
                    if pt == PieceType::Gold || pt == PieceType::Silver {
                        def_pieces += 1;
                    }
                }
            }
        }
        mobility_balance -= def_pieces * CASTLE_BONUS;
        
        // Penalize Kgyoku
        let y = sq / 9;
        if y > 2 {
            mobility_balance += 200; // Prefer King at the top (y=0,1,2)
        }
    }

    // Opening Bonuses (Encourage 76/26 for Sente, 34/84 for Gote)
    let mut opening_bonus = 0;
    
    // Sente: 76 Fu (Bishop diagonal 77->76) -> Square 60
    if pos.pieces[60] == PieceType::Pawn && pos.color_at[60] == Color::Sente {
        opening_bonus += 30; // Encourage opening bishop
    }
    // Sente: 26 Fu (Rook pawn 27->26) -> Square 15
    if pos.pieces[15] == PieceType::Pawn && pos.color_at[15] == Color::Sente {
        opening_bonus += 30; // Encourage rook pawn
    }

    // Gote: 34 Fu (Bishop diagonal 33->34) -> Square 30
    if pos.pieces[30] == PieceType::Pawn && pos.color_at[30] == Color::Gote {
        opening_bonus -= 30;
    }
    // Gote: 84 Fu (Rook pawn 83->84) -> Square 75
    if pos.pieces[75] == PieceType::Pawn && pos.color_at[75] == Color::Gote {
        opening_bonus -= 30;
    }

    score += mobility_balance + opening_bonus;
    // Return relative score for the side to move
    if pos.turn == Color::Sente {
        score
    } else {
        -score
    }
}
