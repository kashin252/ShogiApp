
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Color {
    Sente = 0,
    Gote = 1,
}

impl Color {
    pub fn opposite(&self) -> Self {
        match self {
            Color::Sente => Color::Gote,
            Color::Gote => Color::Sente,
        }
    }
}

pub const COLOR_NB: usize = 2;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u8)]
pub enum PieceType {
    Empty = 0,
    Pawn = 1,
    Lance = 2,
    Knight = 3,
    Silver = 4,
    Gold = 5,
    Bishop = 6,
    Rook = 7,
    King = 8,
    // Promoted
    ProPawn = 9,
    ProLance = 10,
    ProKnight = 11,
    ProSilver = 12,
    Horse = 13,
    Dragon = 14,
    Elephant = 15,
    Deputy = 16,
}

pub const PIECE_TYPE_NB: usize = 17;

impl PieceType {
    #[inline(always)]
    pub fn from_u8(v: u8) -> Self {
        unsafe { std::mem::transmute(v) }
    }

    pub fn is_promoted(&self) -> bool {
        match self {
            PieceType::ProPawn | PieceType::ProLance | PieceType::ProKnight | PieceType::ProSilver | PieceType::Horse | PieceType::Dragon => true,
            _ => false,
        }
    }
}

pub type Square = u8;
