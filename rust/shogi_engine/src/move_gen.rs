
use crate::board::Position;
use crate::moves::{Move, MAX_MOVES};
use crate::types::{Color, PieceType};
use crate::bitboard::Bitboard;
use crate::lookup::{get_pawn_attacks, get_knight_attacks, get_silver_attacks, get_gold_attacks, get_king_attacks};

// Pre-computed file masks (column bitmasks)
const fn compute_file_bb() -> [Bitboard; 9] {
    let mut files = [Bitboard(0); 9];
    let mut x = 0;
    while x < 9 {
        let mut val = 0u128;
        let mut y = 0;
        while y < 9 {
            val |= 1u128 << (y * 9 + x);
            y += 1;
        }
        files[x] = Bitboard(val);
        x += 1;
    }
    files
}

// Pre-computed rank masks
const fn compute_rank_bb() -> [Bitboard; 9] {
    let mut ranks = [Bitboard(0); 9];
    let mut y = 0;
    while y < 9 {
        let mut val = 0u128;
        let mut x = 0;
        while x < 9 {
            val |= 1u128 << (y * 9 + x);
            x += 1;
        }
        ranks[y] = Bitboard(val);
        y += 1;
    }
    ranks
}

static FILE_BB: [Bitboard; 9] = compute_file_bb();
static RANK_BB: [Bitboard; 9] = compute_rank_bb();

pub struct MoveList {
    pub moves: [Move; MAX_MOVES],
    pub count: usize,
}

impl MoveList {
    pub fn new() -> Self {
        MoveList {
            moves: [Move::NONE; MAX_MOVES],
            count: 0,
        }
    }

    pub fn push(&mut self, m: Move) {
        if self.count < MAX_MOVES {
            self.moves[self.count] = m;
            self.count += 1;
        }
    }
}

pub fn generate_moves(pos: &Position, list: &mut MoveList) {
    let turn = pos.turn;
    let enemy = turn.opposite();
    
    // Occupancy
    let us = pos.color_bb[turn as usize];
    let them = pos.color_bb[enemy as usize];
    let occ = us | them;
    
    // 1. Pawn Moves
    generate_step_moves(pos, list, PieceType::Pawn, us, them, turn);
    
    // 2. Lance Logic
    let mut lances = pos.bitboards[PieceType::Lance as usize] & us;
    while let Some(from) = lances.pop_lsb() {
        let attacks = crate::lookup::get_lance_attacks(from, turn, occ);
        add_moves(list, from, attacks & !us, PieceType::Lance, them, turn, pos);
    }
    
    // 3. Knight Moves
    generate_step_moves(pos, list, PieceType::Knight, us, them, turn);
    
    // 4. Silver Moves
    generate_step_moves(pos, list, PieceType::Silver, us, them, turn);
    
    // 5. Gold / Promoted Pieces (use Gold attacks)
    // Gold, ProPawn, ProLance, ProKnight, ProSilver
    let golds = pos.bitboards[PieceType::Gold as usize] | 
                pos.bitboards[PieceType::ProPawn as usize] | 
                pos.bitboards[PieceType::ProLance as usize] | 
                pos.bitboards[PieceType::ProKnight as usize] | 
                pos.bitboards[PieceType::ProSilver as usize];
    
    generate_custom_moves(pos, list, golds, PieceType::Gold, us, them, turn);

    // 6. King Moves
    generate_step_moves(pos, list, PieceType::King, us, them, turn);

    // 6b. Elephant / Deputy Moves
    generate_step_moves(pos, list, PieceType::Elephant, us, them, turn);
    generate_step_moves(pos, list, PieceType::Deputy, us, them, turn);

    // 7. Bishop / Horse
    let mut bishops = pos.bitboards[PieceType::Bishop as usize] & us;
    while let Some(from) = bishops.pop_lsb() {
        let attacks = crate::lookup::get_bishop_attacks(from, occ);
        add_moves(list, from, attacks & !us, PieceType::Bishop, them, turn, pos);
    }
    let mut horses = pos.bitboards[PieceType::Horse as usize] & us;
    while let Some(from) = horses.pop_lsb() {
        let attacks = crate::lookup::get_bishop_attacks(from, occ) | get_king_attacks(from);
        add_moves(list, from, attacks & !us, PieceType::Horse, them, turn, pos);
    }
    
    // 8. Rook / Dragon
     let mut rooks = pos.bitboards[PieceType::Rook as usize] & us;
    while let Some(from) = rooks.pop_lsb() {
        let attacks = crate::lookup::get_rook_attacks(from, occ);
        add_moves(list, from, attacks & !us, PieceType::Rook, them, turn, pos);
    }
    let mut dragons = pos.bitboards[PieceType::Dragon as usize] & us;
    while let Some(from) = dragons.pop_lsb() {
        let attacks = crate::lookup::get_rook_attacks(from, occ) | get_king_attacks(from);
        add_moves(list, from, attacks & !us, PieceType::Dragon, them, turn, pos);
    }
    
    // 9. Drops
     generate_drops(pos, list, turn, occ);
}

/// Generate only capture moves (for QSearch). Much faster than generate_moves + filter.
pub fn generate_captures(pos: &Position, list: &mut MoveList) {
    let turn = pos.turn;
    let enemy = turn.opposite();
    let us = pos.color_bb[turn as usize];
    let them = pos.color_bb[enemy as usize];
    let occ = us | them;
    
    // Only target enemy pieces (captures only)
    // 1. Pawn captures
    let mut pawns = pos.bitboards[PieceType::Pawn as usize] & us;
    while let Some(from) = pawns.pop_lsb() {
        let attacks = get_pawn_attacks(from, turn);
        let captures = attacks & them;
        add_moves(list, from, captures, PieceType::Pawn, them, turn, pos);
    }
    
    // 2. Lance captures
    let mut lances = pos.bitboards[PieceType::Lance as usize] & us;
    while let Some(from) = lances.pop_lsb() {
        let attacks = crate::lookup::get_lance_attacks(from, turn, occ);
        let captures = attacks & them;
        add_moves(list, from, captures, PieceType::Lance, them, turn, pos);
    }
    
    // 3. Knight captures
    let mut knights = pos.bitboards[PieceType::Knight as usize] & us;
    while let Some(from) = knights.pop_lsb() {
        let attacks = get_knight_attacks(from, turn);
        let captures = attacks & them;
        add_moves(list, from, captures, PieceType::Knight, them, turn, pos);
    }
    
    // 4. Silver captures
    let mut silvers = pos.bitboards[PieceType::Silver as usize] & us;
    while let Some(from) = silvers.pop_lsb() {
        let attacks = get_silver_attacks(from, turn);
        let captures = attacks & them;
        add_moves(list, from, captures, PieceType::Silver, them, turn, pos);
    }
    
    // 5. Gold / Promoted pieces captures
    let golds = pos.bitboards[PieceType::Gold as usize] | 
                pos.bitboards[PieceType::ProPawn as usize] | 
                pos.bitboards[PieceType::ProLance as usize] | 
                pos.bitboards[PieceType::ProKnight as usize] | 
                pos.bitboards[PieceType::ProSilver as usize];
    let mut gold_us = golds & us;
    while let Some(from) = gold_us.pop_lsb() {
        let actual_pt = if let Some((pt, _)) = pos.get_piece_on(from) { pt } else { PieceType::Gold };
        let attacks = get_gold_attacks(from, turn);
        let captures = attacks & them;
        add_moves(list, from, captures, actual_pt, them, turn, pos);
    }
    
    // 6. King captures
    let mut kings = pos.bitboards[PieceType::King as usize] & us;
    while let Some(from) = kings.pop_lsb() {
        let attacks = get_king_attacks(from);
        let captures = attacks & them;
        add_moves(list, from, captures, PieceType::King, them, turn, pos);
    }

    // 6b. Elephant / Deputy captures
    let mut elephants = pos.bitboards[PieceType::Elephant as usize] & us;
    while let Some(from) = elephants.pop_lsb() {
        let attacks = crate::lookup::get_elephant_attacks(from, turn);
        let captures = attacks & them;
        add_moves(list, from, captures, PieceType::Elephant, them, turn, pos);
    }
    let mut deputies = pos.bitboards[PieceType::Deputy as usize] & us;
    while let Some(from) = deputies.pop_lsb() {
        let attacks = crate::lookup::get_deputy_attacks(from);
        let captures = attacks & them;
        add_moves(list, from, captures, PieceType::Deputy, them, turn, pos);
    }
    
    // 7. Bishop captures
    let mut bishops = pos.bitboards[PieceType::Bishop as usize] & us;
    while let Some(from) = bishops.pop_lsb() {
        let attacks = crate::lookup::get_bishop_attacks(from, occ);
        let captures = attacks & them;
        add_moves(list, from, captures, PieceType::Bishop, them, turn, pos);
    }
    let mut horses = pos.bitboards[PieceType::Horse as usize] & us;
    while let Some(from) = horses.pop_lsb() {
        let attacks = crate::lookup::get_bishop_attacks(from, occ) | get_king_attacks(from);
        let captures = attacks & them;
        add_moves(list, from, captures, PieceType::Horse, them, turn, pos);
    }
    
    // 8. Rook captures
    let mut rooks = pos.bitboards[PieceType::Rook as usize] & us;
    while let Some(from) = rooks.pop_lsb() {
        let attacks = crate::lookup::get_rook_attacks(from, occ);
        let captures = attacks & them;
        add_moves(list, from, captures, PieceType::Rook, them, turn, pos);
    }
    let mut dragons = pos.bitboards[PieceType::Dragon as usize] & us;
    while let Some(from) = dragons.pop_lsb() {
        let attacks = crate::lookup::get_rook_attacks(from, occ) | get_king_attacks(from);
        let captures = attacks & them;
        add_moves(list, from, captures, PieceType::Dragon, them, turn, pos);
    }
    // No drops in captures
}

fn generate_step_moves(pos: &Position, list: &mut MoveList, pt: PieceType, us: Bitboard, them: Bitboard, turn: Color) {
    let mut pieces = pos.bitboards[pt as usize] & us;
    
    while let Some(from) = pieces.pop_lsb() {
        let attacks = match pt {
            PieceType::Pawn => get_pawn_attacks(from, turn),
            PieceType::Knight => get_knight_attacks(from, turn),
            PieceType::Silver => get_silver_attacks(from, turn),
            PieceType::King => get_king_attacks(from),
            PieceType::Elephant => crate::lookup::get_elephant_attacks(from, turn),
            PieceType::Deputy => crate::lookup::get_deputy_attacks(from),
            _ => Bitboard::EMPTY,
        };
        
        let valid = attacks & !us; // Cannot capture own pieces
        
        // Add moves
        add_moves(list, from, valid, pt, them, turn, pos);
    }
}


fn generate_custom_moves(pos: &Position, list: &mut MoveList, mut pieces: Bitboard, _visual_pt: PieceType, us: Bitboard, them: Bitboard, turn: Color) {
     pieces = pieces & us;
     while let Some(from) = pieces.pop_lsb() {
         // All these move like Gold, but preserve actual piece type for move ordering
         let actual_pt = if let Some((pt, _)) = pos.get_piece_on(from) {
             pt
         } else {
             PieceType::Gold
         };
         let attacks = get_gold_attacks(from, turn);
         let valid = attacks & !us;
         
         add_moves(list, from, valid, actual_pt, them, turn, pos);
     }
}

// Helpers
fn add_moves(list: &mut MoveList, from: u8, valid: Bitboard, pt: PieceType, them: Bitboard, turn: Color, pos: &Position) {
    let mut targets = valid;
    while let Some(to) = targets.pop_lsb() {
        let is_capture = them.is_set(to);
        let captured = if is_capture {
             if let Some((cap_pt, _)) = pos.get_piece_on(to) {
                 cap_pt
             } else {
                 PieceType::Empty // Should not happen if them.is_set(to)
             }
        } else {
             PieceType::Empty
        };

        let can_promote = can_promote(from, to, pt, turn);
        let must_promote = must_promote(from, to, pt, turn);

        if must_promote {
             list.push(Move::new(from, to, true, pt, captured));
        } else {
             list.push(Move::new(from, to, false, pt, captured));
             if can_promote {
                 list.push(Move::new(from, to, true, pt, captured));
             }
        }
    }
}

fn can_promote(from: u8, to: u8, pt: PieceType, turn: Color) -> bool {
    if pt.is_promoted() || pt == PieceType::King || pt == PieceType::Gold { return false; }
    
    let y_from = from / 9;
    let y_to = to / 9;
    
    match turn {
        Color::Sente => y_from <= 2 || y_to <= 2,
        Color::Gote => y_from >= 6 || y_to >= 6,
    }
}

fn must_promote(from: u8, to: u8, pt: PieceType, turn: Color) -> bool {
    let y = to / 9;
    match turn {
        Color::Sente => {
            (pt == PieceType::Pawn || pt == PieceType::Lance) && y == 0
            || (pt == PieceType::Knight && y <= 1)
        },
        Color::Gote => {
             (pt == PieceType::Pawn || pt == PieceType::Lance) && y == 8
            || (pt == PieceType::Knight && y >= 7)
        }
    }
}

fn generate_drops(pos: &Position, list: &mut MoveList, turn: Color, occ: Bitboard) {
    let hand = pos.hand[turn as usize];
    
    // Hand Format in types.rs was `[u8; 8]` but typically indexed by PieceType.
    // Index 1..=7 (Pawn..Rook). 
    
    let empty_squares = !occ; // This logic needs Not trait correct implementation (masking 81 bits)
    // Bitboard ! operator handles masking.
    
    for pt_idx in 1..=7 {
        if hand[pt_idx] > 0 {
             let pt = PieceType::from_u8(pt_idx as u8);
             
             let mut targets = empty_squares;
             
             // Pawn Drop Restrictions
             if pt == PieceType::Pawn {
                 // 1. Two Pawns (Nifu)
                 let pawns = pos.bitboards[PieceType::Pawn as usize] & pos.color_bb[turn as usize];
                 let mut nifu_mask = Bitboard::EMPTY;
                 for x in 0..9 {
                     if !(pawns & FILE_BB[x]).is_empty() {
                         nifu_mask = nifu_mask | FILE_BB[x];
                     }
                 }
                 targets = targets & !nifu_mask;
                 
                 // 2. No drop on last rank
                 let last_rank = if turn == Color::Sente { 0 } else { 8 };
                 targets = targets & !RANK_BB[last_rank];

                 // TODO: Uchifuzume (Drop Pawn Mate) - ignored for now as it's complex
             } else if pt == PieceType::Lance {
                 // No drop on last rank
                 let last_rank = if turn == Color::Sente { 0 } else { 8 };
                 targets = targets & !RANK_BB[last_rank];
             } else if pt == PieceType::Knight {
                 // No drop on last TWO ranks
                 let r1 = if turn == Color::Sente { 0 } else { 8 };
                 let r2 = if turn == Color::Sente { 1 } else { 7 };
                 targets = targets & !RANK_BB[r1] & !RANK_BB[r2];
             }
             
             while let Some(to) = targets.pop_lsb() {
                  list.push(Move::new_drop(pt, to));
             }
        }
    }
}
