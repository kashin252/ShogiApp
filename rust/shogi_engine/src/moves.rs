
use crate::types::{PieceType, Square};

pub const MAX_MOVES: usize = 1024;

/// Move representation
/// We use a u32 to store move information compactly.
/// Bits 0-6:   To Square (0-80)
/// Bits 7-13:  From Square (0-80, or specialized value for Drop)
/// Bit  14:    Promote Flag
/// Bit  15:    Drop Flag (If set, From Square is interpreted as PieceType to drop)
/// Bits 16-19: Captured PieceType (0 if none)
/// Bits 20-23: Moved PieceType
#[derive(Clone, Copy, PartialEq, Eq, Default)]
pub struct Move(pub u32);

impl Move {
    pub const NONE: Move = Move(0);

    // Masks and Shifts (Matching TS encodeMove)
    const FROM_MASK: u32 = 0x7F;
    const FROM_SHIFT: u32 = 0;
    const TO_MASK: u32 = 0x7F;
    const TO_SHIFT: u32 = 7;
    const PROMOTE_FLAG: u32 = 1 << 14;
    const DROP_FLAG: u32 = 1 << 15;
    const PIECE_MASK: u32 = 0x1F;
    const PIECE_SHIFT: u32 = 16;
    const CAPTURE_MASK: u32 = 0x1F;
    const CAPTURE_SHIFT: u32 = 21;

    #[inline(always)]
    pub fn new(from: Square, to: Square, promote: bool, moved: PieceType, captured: PieceType) -> Self {
        let mut val = ((from as u32) & Self::FROM_MASK) << Self::FROM_SHIFT;
        val |= ((to as u32) & Self::TO_MASK) << Self::TO_SHIFT;
        if promote { val |= Self::PROMOTE_FLAG; }
        val |= (moved as u8 as u32) << Self::PIECE_SHIFT;
        val |= (captured as u8 as u32) << Self::CAPTURE_SHIFT;
        Move(val)
    }

    #[inline(always)]
    pub fn new_drop(piece: PieceType, to: Square) -> Self {
        let mut val = ((piece as u8 as u32) & Self::FROM_MASK) << Self::FROM_SHIFT; // Store piece in From field (matching TS)
        val |= ((to as u32) & Self::TO_MASK) << Self::TO_SHIFT;
        val |= Self::DROP_FLAG;
        val |= (piece as u8 as u32) << Self::PIECE_SHIFT; // Moved piece is the dropped piece
        Move(val)
    }

    #[inline(always)]
    pub fn to(&self) -> Square {
        ((self.0 >> Self::TO_SHIFT) & Self::TO_MASK) as Square
    }

    #[inline(always)]
    pub fn from(&self) -> Square {
        ((self.0 >> Self::FROM_SHIFT) & Self::FROM_MASK) as Square
    }

    #[inline(always)]
    pub fn is_promote(&self) -> bool {
        (self.0 & Self::PROMOTE_FLAG) != 0
    }

    #[inline(always)]
    pub fn is_drop(&self) -> bool {
        (self.0 & Self::DROP_FLAG) != 0
    }

    #[inline(always)]
    pub fn captured(&self) -> PieceType {
        PieceType::from_u8(((self.0 >> Self::CAPTURE_SHIFT) & Self::CAPTURE_MASK) as u8)
    }

    #[inline(always)]
    pub fn piece(&self) -> PieceType {
        PieceType::from_u8(((self.0 >> Self::PIECE_SHIFT) & Self::PIECE_MASK) as u8)
    }

    /// For debug formatting
    pub fn as_u32(&self) -> u32 {
        self.0
    }
    pub fn to_usi(&self) -> String {
        if self.is_drop() {
            let pt_char = match self.piece() {
                PieceType::Pawn => "P",
                PieceType::Lance => "L",
                PieceType::Knight => "N",
                PieceType::Silver => "S",
                PieceType::Gold => "G",
                PieceType::Bishop => "B",
                PieceType::Rook => "R",
                PieceType::Elephant => "E",
                PieceType::Deputy => "D",
                _ => "?",
            };
            format!("{}*{}", pt_char, sq_to_usi(self.to()))
        } else {
            format!("{}{}{}", 
                sq_to_usi(self.from()), 
                sq_to_usi(self.to()), 
                if self.is_promote() { "+" } else { "" }
            )
        }
    }
}

pub fn sq_to_usi(sq: Square) -> String {
    let x = (sq % 9);
    let y = (sq / 9);
    // x=0(9)..8(1). File = 9 - x.
    let file = 9 - x; 
    // y=0(a)..8(i). Rank = a + y.
    let rank = (b'a' + y) as char;
    format!("{}{}", file, rank)
}

use std::fmt;
impl fmt::Debug for Move {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.is_drop() {
            write!(f, "Drop({:?}->{})", self.piece(), self.to())
        } else {
            write!(f, "Move({}->{}{}{})", 
                self.from(), 
                self.to(), 
                if self.is_promote() { "+" } else { "" },
                if self.captured() != PieceType::Empty { format!(" captured:{:?}", self.captured()) } else { "".to_string() }
            )
        }
    }
}
