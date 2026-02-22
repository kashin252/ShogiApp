
use std::ops::{BitAnd, BitOr, BitXor, Not};

#[derive(Clone, Copy, PartialEq, Eq, Debug, Default)]
pub struct Bitboard(pub u128);

impl Bitboard {
    pub const EMPTY: Bitboard = Bitboard(0);

    #[inline(always)]
    pub fn new(val: u128) -> Self {
        Bitboard(val)
    }

    #[inline(always)]
    pub fn is_empty(&self) -> bool {
        self.0 == 0
    }

    #[inline(always)]
    pub fn count_ones(&self) -> u32 {
        self.0.count_ones()
    }

    #[inline(always)]
    pub fn set_bit(&mut self, sq: u8) {
        self.0 |= 1u128 << sq;
    }

    #[inline(always)]
    pub fn clear_bit(&mut self, sq: u8) {
        self.0 &= !(1u128 << sq);
    }

    #[inline(always)]
    pub fn is_set(&self, sq: u8) -> bool {
        (self.0 & (1u128 << sq)) != 0
    }

    #[inline(always)]
    pub fn trailing_zeros(&self) -> u32 {
        self.0.trailing_zeros()
    }

    #[inline(always)]
    pub fn pop_lsb(&mut self) -> Option<u8> {
        if self.0 == 0 {
            None
        } else {
            let idx = self.0.trailing_zeros() as u8;
            self.0 &= self.0 - 1;
            Some(idx)
        }
    }
}

// Operator Overloading for convenient usage
impl BitAnd for Bitboard {
    type Output = Self;
    fn bitand(self, rhs: Self) -> Self::Output {
        Bitboard(self.0 & rhs.0)
    }
}

impl BitOr for Bitboard {
    type Output = Self;
    fn bitor(self, rhs: Self) -> Self::Output {
        Bitboard(self.0 | rhs.0)
    }
}

impl BitXor for Bitboard {
    type Output = Self;
    fn bitxor(self, rhs: Self) -> Self::Output {
        Bitboard(self.0 ^ rhs.0)
    }
}

impl Not for Bitboard {
    type Output = Self;
    fn not(self) -> Self::Output {
        // Shogi board is 81 squares. We should mask out the upper bits.
        // 2^81 - 1
        const MASK: u128 = (1u128 << 81) - 1;
        Bitboard(!self.0 & MASK)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_set_clear_bit() {
        let mut bb = Bitboard::default();
        bb.set_bit(10);
        assert!(bb.is_set(10));
        assert!(!bb.is_set(11));

        bb.clear_bit(10);
        assert!(!bb.is_set(10));
    }

    #[test]
    fn test_pop_lsb() {
        let mut bb = Bitboard::default();
        bb.set_bit(5);
        bb.set_bit(10);
        
        assert_eq!(bb.pop_lsb(), Some(5));
        assert_eq!(bb.pop_lsb(), Some(10));
        assert_eq!(bb.pop_lsb(), None);
    }
}
