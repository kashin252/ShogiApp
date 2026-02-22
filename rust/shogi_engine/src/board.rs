
use crate::bitboard::Bitboard;
use crate::types::{Color, PieceType, Square, COLOR_NB, PIECE_TYPE_NB};

#[derive(Clone, Debug)]
pub struct Position {
    pub bitboards: [Bitboard; PIECE_TYPE_NB],
    pub color_bb: [Bitboard; COLOR_NB],
    pub pieces: [PieceType; 81],
    pub color_at: [Color; 81],
    pub hand: [[u8; PIECE_TYPE_NB]; COLOR_NB],
    pub turn: Color,
    pub hash: u64,
    pub material_score: i32,
    pub king_sq: [u8; 2],
}

#[derive(Clone, Copy)]
pub struct UndoInfo {
    pub hash: u64,
    pub material_score: i32,
    pub king_sq: [u8; 2],
    pub capture: PieceType,
    pub hand_update: bool,
}

impl Position {
    pub fn new() -> Self {
        Position {
            bitboards: [Bitboard::EMPTY; PIECE_TYPE_NB],
            color_bb: [Bitboard::EMPTY; COLOR_NB],
            pieces: [PieceType::Empty; 81],
            color_at: [Color::Sente; 81], // Default color, ignore if PieceType::Empty
            hand: [[0; PIECE_TYPE_NB]; COLOR_NB],
            turn: Color::Sente,
            hash: 0,
            material_score: 0,
            king_sq: [81, 81], // Not set
        }
    }

    pub fn put_piece(&mut self, sq: Square, pt: PieceType, c: Color) {
        let sq_idx = sq as usize;
        if self.pieces[sq_idx] != PieceType::Empty {
            // Remove existing piece from hash if any (usually only for setup)
            let old_pt = self.pieces[sq_idx];
            let old_c = self.color_at[sq_idx];
            self.hash ^= crate::zobrist::get_zobrist().pieces[sq_idx][old_c as usize][old_pt as usize];
            self.bitboards[old_pt as usize].clear_bit(sq);
            self.color_bb[old_c as usize].clear_bit(sq);
        }

        self.pieces[sq_idx] = pt;
        self.color_at[sq_idx] = c;
        self.bitboards[pt as usize].set_bit(sq);
        self.color_bb[c as usize].set_bit(sq);
        if pt == PieceType::King {
            self.king_sq[c as usize] = sq;
        }
        self.hash ^= crate::zobrist::get_zobrist().pieces[sq_idx][c as usize][pt as usize];
    }

    pub fn get_piece_on(&self, sq: Square) -> Option<(PieceType, Color)> {
        let pt = self.pieces[sq as usize];
        if pt == PieceType::Empty {
            None
        } else {
            Some((pt, self.color_at[sq as usize]))
        }
    }

    pub fn is_attacked(&self, sq: u8, attacker: Color) -> bool {
        let occ = self.color_bb[Color::Sente as usize] | self.color_bb[Color::Gote as usize];
        let defenders_perspective = attacker.opposite();

        // 1. Pawn
        if (crate::lookup::get_pawn_attacks(sq, defenders_perspective) & self.bitboards[PieceType::Pawn as usize] & self.color_bb[attacker as usize]).0 != 0 {
            return true;
        }
        
        // 2. Knight
        if (crate::lookup::get_knight_attacks(sq, defenders_perspective) & self.bitboards[PieceType::Knight as usize] & self.color_bb[attacker as usize]).0 != 0 {
            return true;
        }

        // 3. Silver
        if (crate::lookup::get_silver_attacks(sq, defenders_perspective) & self.bitboards[PieceType::Silver as usize] & self.color_bb[attacker as usize]).0 != 0 {
            return true;
        }

        // 4. Gold / Promoted
        let golds = self.bitboards[PieceType::Gold as usize] | 
                    self.bitboards[PieceType::ProPawn as usize] | 
                    self.bitboards[PieceType::ProLance as usize] | 
                    self.bitboards[PieceType::ProKnight as usize] | 
                    self.bitboards[PieceType::ProSilver as usize];
        if (crate::lookup::get_gold_attacks(sq, defenders_perspective) & golds & self.color_bb[attacker as usize]).0 != 0 {
            return true;
        }

        // 5. Lance
        if (crate::lookup::get_lance_attacks(sq, defenders_perspective, occ) & self.bitboards[PieceType::Lance as usize] & self.color_bb[attacker as usize]).0 != 0 {
            return true;
        }
        
        // 6. Bishop / Horse
        let bishops = self.bitboards[PieceType::Bishop as usize] | self.bitboards[PieceType::Horse as usize];
        if (crate::lookup::get_bishop_attacks(sq, occ) & bishops & self.color_bb[attacker as usize]).0 != 0 {
            return true;
        }
        if (crate::lookup::get_king_attacks(sq) & self.bitboards[PieceType::Horse as usize] & self.color_bb[attacker as usize]).0 != 0 {
            return true;
        }
        
        // 7. Rook / Dragon
        let rooks = self.bitboards[PieceType::Rook as usize] | self.bitboards[PieceType::Dragon as usize];
        if (crate::lookup::get_rook_attacks(sq, occ) & rooks & self.color_bb[attacker as usize]).0 != 0 {
            return true;
        }
        if (crate::lookup::get_king_attacks(sq) & self.bitboards[PieceType::Dragon as usize] & self.color_bb[attacker as usize]).0 != 0 {
            return true;
        }

        // 8. King
        if (crate::lookup::get_king_attacks(sq) & self.bitboards[PieceType::King as usize] & self.color_bb[attacker as usize]).0 != 0 {
            return true;
        }

        // 9. Elephant / Deputy
        if (crate::lookup::get_elephant_attacks(sq, defenders_perspective) & self.bitboards[PieceType::Elephant as usize] & self.color_bb[attacker as usize]).0 != 0 {
            return true;
        }
        if (crate::lookup::get_deputy_attacks(sq) & self.bitboards[PieceType::Deputy as usize] & self.color_bb[attacker as usize]).0 != 0 {
            return true;
        }

        false
    }

    pub fn is_in_check(&self, c: Color) -> bool {
        let sq = self.king_sq[c as usize];
        if sq >= 81 { return false; }
        self.is_attacked(sq, c.opposite())
    }

    pub fn make_move(&mut self, m: crate::moves::Move) -> UndoInfo {
        let zobrist = crate::zobrist::get_zobrist();
        let turn = self.turn;
        let opp = turn.opposite();
        
        let undo = UndoInfo {
            hash: self.hash,
            material_score: self.material_score,
            king_sq: self.king_sq,
            capture: m.captured(),
            hand_update: m.is_drop() || m.captured() != PieceType::Empty,
        };

        self.hash ^= zobrist.turn;
        self.turn = opp;

        if m.is_drop() {
            let to = m.to() as usize;
            let pt = m.piece();
            
            self.hash ^= zobrist.hand[turn as usize][pt as usize][self.hand[turn as usize][pt as usize] as usize];
            self.hand[turn as usize][pt as usize] -= 1;
            self.hash ^= zobrist.hand[turn as usize][pt as usize][self.hand[turn as usize][pt as usize] as usize];
            
            self.pieces[to] = pt;
            self.color_at[to] = turn;
            self.bitboards[pt as usize].set_bit(to as u8);
            self.color_bb[turn as usize].set_bit(to as u8);
            self.hash ^= zobrist.pieces[to][turn as usize][pt as usize];

            let pst_val = crate::pst::get_pst(pt, to as u8, turn);
            if turn == Color::Sente { self.material_score += pst_val; } else { self.material_score -= pst_val; }
        } else {
             let from = m.from() as usize;
             let to = m.to() as usize;
             let pt = m.piece();
             let promoted = m.is_promote();
             let capture = m.captured();
             
             self.hash ^= zobrist.pieces[from][turn as usize][pt as usize];
             self.bitboards[pt as usize].clear_bit(from as u8);
             self.color_bb[turn as usize].clear_bit(from as u8);
             self.pieces[from] = PieceType::Empty;

             let old_pst = crate::pst::get_pst(pt, from as u8, turn);
             if turn == Color::Sente { self.material_score -= old_pst; } else { self.material_score += old_pst; }
             
             if capture != PieceType::Empty {
                 self.hash ^= zobrist.pieces[to][opp as usize][capture as usize];
                 self.bitboards[capture as usize].clear_bit(to as u8);
                 self.color_bb[opp as usize].clear_bit(to as u8);
                 
                 let cap_val = crate::pst::PIECE_VALUES[capture as usize];
                 let cap_pst = crate::pst::get_pst(capture, to as u8, opp);
                 if opp == Color::Sente {
                     self.material_score -= cap_val + cap_pst;
                 } else {
                     self.material_score += cap_val + cap_pst;
                 }

                 let raw_cap = capture as u8;
                 let hand_pt = match capture {
                     PieceType::ProPawn | PieceType::ProLance | PieceType::ProKnight | PieceType::ProSilver => (raw_cap - 8) as usize,
                     PieceType::Horse | PieceType::Dragon => (raw_cap - 7) as usize,
                     PieceType::Deputy => PieceType::Elephant as usize,
                     _ => raw_cap as usize,
                 };
                 
                 self.hash ^= zobrist.hand[turn as usize][hand_pt][self.hand[turn as usize][hand_pt] as usize];
                 self.hand[turn as usize][hand_pt] += 1;
                 self.hash ^= zobrist.hand[turn as usize][hand_pt][self.hand[turn as usize][hand_pt] as usize];

                 let unpromoted_val = crate::pst::PIECE_VALUES[hand_pt];
                 if turn == Color::Sente { self.material_score += unpromoted_val; } else { self.material_score -= unpromoted_val; }
             }
             
             let new_pt = if promoted {
                 match pt {
                     PieceType::Pawn => PieceType::ProPawn,
                     PieceType::Lance => PieceType::ProLance,
                     PieceType::Knight => PieceType::ProKnight,
                     PieceType::Silver => PieceType::ProSilver,
                     PieceType::Bishop => PieceType::Horse,
                     PieceType::Rook => PieceType::Dragon,
                     PieceType::Elephant => PieceType::Deputy,
                     _ => pt,
                 }
             } else {
                 pt
             };
             
             self.pieces[to] = new_pt;
             self.color_at[to] = turn;
             self.bitboards[new_pt as usize].set_bit(to as u8);
             self.color_bb[turn as usize].set_bit(to as u8);
             if new_pt == PieceType::King {
                 self.king_sq[turn as usize] = to as u8;
             }
             self.hash ^= zobrist.pieces[to][turn as usize][new_pt as usize];

             let new_val = crate::pst::PIECE_VALUES[new_pt as usize];
             let new_pst = crate::pst::get_pst(new_pt, to as u8, turn);
             if promoted {
                 let old_val = crate::pst::PIECE_VALUES[pt as usize];
                 if turn == Color::Sente {
                     self.material_score += (new_val + new_pst) - old_val;
                 } else {
                     self.material_score -= (new_val + new_pst) - old_val;
                 }
             } else {
                 if turn == Color::Sente { self.material_score += new_pst; } else { self.material_score -= new_pst; }
             }
        }
        undo
    }

    pub fn make_null_move(&mut self) -> UndoInfo {
        let zobrist = crate::zobrist::get_zobrist();
        let undo = UndoInfo {
            hash: self.hash,
            material_score: self.material_score,
            king_sq: self.king_sq,
            capture: PieceType::Empty,
            hand_update: false,
        };
        
        self.hash ^= zobrist.turn;
        self.turn = self.turn.opposite();
        
        undo
    }

    pub fn unmake_null_move(&mut self, undo: UndoInfo) {
        self.turn = self.turn.opposite();
        self.hash = undo.hash;
    }

    pub fn unmake_move(&mut self, m: crate::moves::Move, undo: UndoInfo) {
        let turn = self.turn.opposite(); // Original turn
        let opp = self.turn;

        if m.is_drop() {
            let to = m.to() as usize;
            let pt = m.piece();
            
            self.bitboards[pt as usize].clear_bit(to as u8);
            self.color_bb[turn as usize].clear_bit(to as u8);
            self.pieces[to] = PieceType::Empty;
            self.hand[turn as usize][pt as usize] += 1;
        } else {
            let from = m.from() as usize;
            let to = m.to() as usize;
            let pt = m.piece();
            let promoted = m.is_promote();
            let capture = undo.capture;
            
            let moved_pt = if promoted {
                match pt {
                    PieceType::Pawn => PieceType::ProPawn,
                    PieceType::Lance => PieceType::ProLance,
                    PieceType::Knight => PieceType::ProKnight,
                    PieceType::Silver => PieceType::ProSilver,
                    PieceType::Bishop => PieceType::Horse,
                    PieceType::Rook => PieceType::Dragon,
                    PieceType::Elephant => PieceType::Deputy,
                    _ => pt,
                }
            } else {
                pt
            };
            
            self.bitboards[moved_pt as usize].clear_bit(to as u8);
            self.color_bb[turn as usize].clear_bit(to as u8);
            
            if capture != PieceType::Empty {
                self.pieces[to] = capture;
                self.color_at[to] = opp;
                self.bitboards[capture as usize].set_bit(to as u8);
                self.color_bb[opp as usize].set_bit(to as u8);
                
                let raw_cap = capture as u8;
                let hand_pt = match capture {
                    PieceType::ProPawn | PieceType::ProLance | PieceType::ProKnight | PieceType::ProSilver => (raw_cap - 8) as usize,
                    PieceType::Horse | PieceType::Dragon => (raw_cap - 7) as usize,
                    PieceType::Deputy => PieceType::Elephant as usize,
                    _ => raw_cap as usize,
                };
                self.hand[turn as usize][hand_pt] -= 1;
            } else {
                self.pieces[to] = PieceType::Empty;
            }
            
            self.pieces[from] = pt;
            self.color_at[from] = turn;
            self.bitboards[pt as usize].set_bit(from as u8);
            self.color_bb[turn as usize].set_bit(from as u8);
        }
        
        self.turn = turn;
        self.hash = undo.hash;
        self.material_score = undo.material_score;
        self.king_sq = undo.king_sq;
    }

    pub fn from_sfen(sfen: &str) -> Option<Self> {
        let mut pos = Position::new();
        let parts: Vec<&str> = sfen.split_whitespace().collect();
        if parts.len() < 3 { return None; }
        
        let board_str = parts[0];
        let turn_str = parts[1];
        let hand_str = parts[2];
        
        let mut chars = board_str.chars().peekable();
        let mut x = 0;
        let mut y = 0;
        
        while let Some(ch) = chars.next() {
            if ch == '/' {
                y += 1;
                x = 0;
                continue;
            }
            
            if let Some(digit) = ch.to_digit(10) {
                x += digit as usize;
                continue;
            }
            
            let mut pt_char = ch;
            let mut promoted = false;
            
            if ch == '+' {
                promoted = true;
                if let Some(next_ch) = chars.next() {
                    pt_char = next_ch;
                } else {
                    return None;
                }
            }
            
            let (pt, color) = match pt_char {
                'P' => (PieceType::Pawn, Color::Sente),
                'L' => (PieceType::Lance, Color::Sente),
                'N' => (PieceType::Knight, Color::Sente),
                'S' => (PieceType::Silver, Color::Sente),
                'G' => (PieceType::Gold, Color::Sente),
                'B' => (PieceType::Bishop, Color::Sente),
                'R' => (PieceType::Rook, Color::Sente),
                'K' => (PieceType::King, Color::Sente),
                'p' => (PieceType::Pawn, Color::Gote),
                'l' => (PieceType::Lance, Color::Gote),
                'n' => (PieceType::Knight, Color::Gote),
                's' => (PieceType::Silver, Color::Gote),
                'g' => (PieceType::Gold, Color::Gote),
                'b' => (PieceType::Bishop, Color::Gote),
                'r' => (PieceType::Rook, Color::Gote),
                'k' => (PieceType::King, Color::Gote),
                'E' => (PieceType::Elephant, Color::Sente),
                'e' => (PieceType::Elephant, Color::Gote),
                'D' => (PieceType::Deputy, Color::Sente),
                'd' => (PieceType::Deputy, Color::Gote),
                _ => {
                    x += 1;
                    continue;
                }
            };
            
            let final_pt = if promoted {
                match pt {
                    PieceType::Pawn => PieceType::ProPawn,
                    PieceType::Lance => PieceType::ProLance,
                    PieceType::Knight => PieceType::ProKnight,
                    PieceType::Silver => PieceType::ProSilver,
                    PieceType::Bishop => PieceType::Horse,
                    PieceType::Rook => PieceType::Dragon,
                    PieceType::Elephant => PieceType::Deputy,
                     _ => pt,
                }
            } else {
                pt
            };
            
            let sq = (y * 9 + x) as u8;
            pos.put_piece(sq, final_pt, color);
            
            let val = crate::pst::PIECE_VALUES[final_pt as usize];
            let pst = crate::pst::get_pst(final_pt, sq, color);
            if color == Color::Sente {
                pos.material_score += val + pst;
            } else {
                pos.material_score -= val + pst;
            }

            x += 1;
        }
        
        pos.turn = if turn_str == "b" { Color::Sente } else { Color::Gote };
        if pos.turn == Color::Gote {
            pos.hash ^= crate::zobrist::get_zobrist().turn;
        }
        
        if hand_str != "-" {
            let mut count = 0;
             let mut chars_hand = hand_str.chars().peekable();
             let zobrist = crate::zobrist::get_zobrist();
             while let Some(ch) = chars_hand.next() {
                 if let Some(digit) = ch.to_digit(10) {
                     let mut num = digit as u8;
                     while let Some(&next_ch) = chars_hand.peek() {
                         if let Some(d2) = next_ch.to_digit(10) {
                             num = num * 10 + (d2 as u8);
                             chars_hand.next();
                         } else {
                             break;
                         }
                     }
                     count = num;
                     continue;
                 }
                 if count == 0 { count = 1; }
                 
                 let (pt, color) = match ch {
                    'P' => (PieceType::Pawn, Color::Sente),
                    'L' => (PieceType::Lance, Color::Sente),
                    'N' => (PieceType::Knight, Color::Sente),
                    'S' => (PieceType::Silver, Color::Sente),
                    'G' => (PieceType::Gold, Color::Sente),
                    'B' => (PieceType::Bishop, Color::Sente),
                    'R' => (PieceType::Rook, Color::Sente),
                    'p' => (PieceType::Pawn, Color::Gote),
                    'l' => (PieceType::Lance, Color::Gote),
                    'n' => (PieceType::Knight, Color::Gote),
                    's' => (PieceType::Silver, Color::Gote),
                    'g' => (PieceType::Gold, Color::Gote),
                    'b' => (PieceType::Bishop, Color::Gote),
                    'r' => (PieceType::Rook, Color::Gote),
                     _ => continue,
                 };
                 let val = crate::pst::PIECE_VALUES[pt as usize];
                 for _ in 0..count {
                     let old_count = pos.hand[color as usize][pt as usize] as usize;
                     pos.hash ^= zobrist.hand[color as usize][pt as usize][old_count];
                     pos.hand[color as usize][pt as usize] += 1;
                     let new_count = pos.hand[color as usize][pt as usize] as usize;
                     pos.hash ^= zobrist.hand[color as usize][pt as usize][new_count];
                 }
                 
                 if color == Color::Sente {
                     pos.material_score += val * count as i32;
                 } else {
                     pos.material_score -= val * count as i32;
                 }

                 count = 0;
             }
        }
        
        Some(pos)
    }
}
