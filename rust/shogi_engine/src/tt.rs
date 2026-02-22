use crate::moves::Move;
use std::sync::atomic::{AtomicU64, Ordering};

pub const TT_EXACT: u8 = 0;
pub const TT_LOWER: u8 = 1; // Alpha
pub const TT_UPPER: u8 = 2; // Beta

#[derive(Clone, Copy)]
pub struct TTEntry {
    pub hash: u64,
    pub depth: u8,
    pub score: i32,
    pub flag: u8,
    pub best_move: Move,
}

struct AtomicEntry {
    key: AtomicU64,
    data: AtomicU64,
}

pub struct TT {
    table: Vec<AtomicEntry>,
    mask: usize,
}

impl TT {
    pub fn new(size_mb: usize) -> Self {
        let entry_size = std::mem::size_of::<AtomicEntry>();
        let count = (size_mb * 1024 * 1024) / entry_size;
        let n = count.next_power_of_two();
        let mask = n - 1;

        let mut table = Vec::with_capacity(n);
        for _ in 0..n {
            table.push(AtomicEntry {
                key: AtomicU64::new(0),
                data: AtomicU64::new(0),
            });
        }

        TT { table, mask }
    }

    pub fn probe(&self, hash: u64) -> Option<TTEntry> {
        let idx = (hash as usize) & self.mask;
        let entry = &self.table[idx];

        let data = entry.data.load(Ordering::Relaxed);
        let key = entry.key.load(Ordering::Relaxed);
        
        // XOR trick: key was stored as hash ^ data, so key ^ data should equal hash
        if (key ^ data) == hash {
             // Unpack
             // Move: 0-31 (32 bits)
             // Score: 32-47 (16 bits)
             // Depth: 48-55 (8 bits)
             // Flag: 56-57 (2 bits)
             
             let move_u32 = (data & 0xFFFFFFFF) as u32;
             let score = ((data >> 32) & 0xFFFF) as i16 as i32;
             let depth = ((data >> 48) & 0xFF) as u8;
             let flag = ((data >> 56) & 0x3) as u8;
             
             Some(TTEntry {
                 hash,
                 depth,
                 score,
                 flag,
                 best_move: Move(move_u32),
             })
        } else {
            None
        }
    }

    pub fn store(&self, hash: u64, depth: u8, score: i32, flag: u8, best_move: Move) {
        let idx = (hash as usize) & self.mask;
        let entry = &self.table[idx];

        // Pack
        // Score clamped to i16
        let score_i16 = score.max(-32000).min(32000) as i16 as u16 as u64;
        let move_u32 = best_move.0 as u64;
        let depth_u64 = depth as u64;
        let flag_u64 = flag as u64;
        
        let data = move_u32 | (score_i16 << 32) | (depth_u64 << 48) | (flag_u64 << 56);

        // Simple Always Replace or Depth-based Replace
        // For Atomic, we just overwrite. 
        // Ideally compare_exchange, but blind overwrite is faster and acceptable for Lazy SMP.
        // We update val then key? Or Key then Val?
        // XOR trick: Key ^ Data.
        // Standard: Store Data, then Store Key.
        // This avoids finding a valid key with invalid data (if we write Key first).
        
        // Check if we should replace?
        // Load old key/data (relaxed)
        let old_key = entry.key.load(Ordering::Relaxed);
        let old_data = entry.data.load(Ordering::Relaxed);
        let old_depth = ((old_data >> 48) & 0xFF) as u8;
        
        // Replace if: different hash (collision/empty) OR deeper depth
        if (old_key ^ old_data) != hash || depth >= old_depth {
             entry.data.store(data, Ordering::Relaxed);
             // XOR trick: store key as hash ^ data for lockless verification
             entry.key.store(hash ^ data, Ordering::Relaxed);
        }
    }
}
