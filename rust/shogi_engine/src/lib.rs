
pub mod bitboard;
pub mod types;
pub mod board;
pub mod moves;
pub mod move_gen;
pub mod lookup;
pub mod pst;
pub mod evaluate;
pub mod zobrist;
pub mod tt;
mod search;

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int};
use std::sync::OnceLock;
use std::sync::atomic::{AtomicBool, AtomicU64};
use std::thread;

static GLOBAL_TT: OnceLock<tt::TT> = OnceLock::new();

fn get_tt() -> &'static tt::TT {
    GLOBAL_TT.get_or_init(|| tt::TT::new(32)) // 32MB Persistent Lockless TT
}

fn run_search_parallel(pos: &board::Position, time_limit: u64, max_depth: u8) -> String {
    // Ensure lookup tables are initialized once (subsequent calls are no-ops via OnceLock)
    lookup::init_lookups();
    let tt = get_tt();
    let stopped = AtomicBool::new(false);
    let global_nodes = AtomicU64::new(0);
    
    // Lazy SMP: Spawn helper threads
    // Total 4 threads (1 main + 3 helpers)
    let result = thread::scope(|s| {
        for i in 1..=3 {
            let p_clone = pos.clone();
            let stopped_ref = &stopped;
            let nodes_ref = &global_nodes;
            s.spawn(move || {
                search::iterative_deepening(&p_clone, time_limit, max_depth, tt, stopped_ref, i, Some(nodes_ref));
            });
        }
        
        // Main Logic (Thread ID 0)
        search::iterative_deepening(pos, time_limit, max_depth, tt, &stopped, 0, Some(&global_nodes))
    });
    
    format!("{}|{}|{}|{}", result.best_move.to_usi(), result.score, result.depth, result.nodes)
}

#[unsafe(no_mangle)]
pub extern "C" fn rust_shogi_search(sfen_ptr: *const c_char, time_limit: c_int, max_depth: c_int) -> *mut c_char {
    let c_str = unsafe {
        if sfen_ptr.is_null() { return std::ptr::null_mut(); }
        CStr::from_ptr(sfen_ptr)
    };

    let sfen = match c_str.to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };
    
    // Parse SFEN
    let pos = match board::Position::from_sfen(sfen) {
        Some(p) => p,
        None => return CString::new("error:parse|0|0|0").unwrap().into_raw(),
    };
    
    let depth = if max_depth > 0 { max_depth as u8 } else { 25 };
    
    // Parallel Search
    let output = run_search_parallel(&pos, time_limit as u64, depth);
    
    CString::new(output).unwrap().into_raw()
}

#[unsafe(no_mangle)]
pub extern "C" fn rust_shogi_free(ptr: *mut c_char) {
    if ptr.is_null() { return; }
    unsafe {
        let _ = CString::from_raw(ptr);
    }
}

#[cfg(target_os = "android")]
#[allow(non_snake_case)]
pub mod android {
    use super::*;
    use jni::JNIEnv;
    use jni::objects::JString;
    use jni::sys::{jint, jstring};

    #[unsafe(no_mangle)]
    pub extern "system" fn Java_expo_modules_shogiengine_ShogiEngineModule_nativeSearch(
        mut env: JNIEnv,
        _this: jni::objects::JObject, // instance method: second arg is 'this' object
        sfen: JString,
        time_limit: jint,
        max_depth: jint,
    ) -> jstring {
        let sfen_str: String = env.get_string(&sfen).expect("Couldn't get java string!").into();
        
        // Parse
        let pos = match board::Position::from_sfen(&sfen_str) {
            Some(p) => p,
            None => return env.new_string("error:parse|0|0|0").unwrap().into_raw(),
        };

        let depth = if max_depth > 0 { max_depth as u8 } else { 25 };

        // Parallel Search
        let res_str = run_search_parallel(&pos, time_limit as u64, depth);
        
        let output = env.new_string(res_str).expect("Couldn't create java string!");
        output.into_raw()
    }
}

#[cfg(test)]
mod integration_tests {
    use super::*;

    fn run_test_search(sfen: &str, time_ms: u64, depth: u8) -> String {
        let pos = board::Position::from_sfen(sfen).expect(&format!("Failed to parse SFEN: {}", sfen));
        run_search_parallel(&pos, time_ms, depth)
    }

    fn validate_result(result: &str) -> (String, i32, i32, i32) {
        let parts: Vec<&str> = result.split('|').collect();
        assert_eq!(parts.len(), 4, "Result format should be move|score|depth|nodes, got: {}", result);
        let best_move = parts[0].to_string();
        let score: i32 = parts[1].parse().expect("score parse failed");
        let depth: i32 = parts[2].parse().expect("depth parse failed");
        let nodes: i32 = parts[3].parse().expect("nodes parse failed");
        (best_move, score, depth, nodes)
    }

    #[test]
    fn test_initial_position() {
        let sfen = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";
        let result = run_test_search(sfen, 500, 4);
        println!("Initial Position Result: {}", result);
        let (mv, _score, depth, nodes) = validate_result(&result);
        assert!(mv.len() >= 4, "Move should be valid USI: {}", mv);
        assert!(depth >= 1, "Should search at least depth 1");
        assert!(nodes > 0, "Should visit some nodes");
    }

    #[test]
    fn test_midgame_position() {
        // 中盤局面
        let sfen = "lnsg1gsnl/1r5b1/ppppkpppp/4p4/9/4P4/PPPP1PPPP/1B5R1/LNSGKGSNL b - 5";
        let result = run_test_search(sfen, 500, 4);
        println!("Midgame Result: {}", result);
        let (mv, _score, _depth, _nodes) = validate_result(&result);
        assert!(!mv.starts_with("error"), "Should not be an error: {}", mv);
    }

    #[test]
    fn test_sfen_with_hand_pieces() {
        // 持ち駒ありの局面
        let sfen = "lnsgkgsnl/1r5b1/pppppp1pp/6p2/9/2P6/PP1PPPPPP/1B5R1/LNSGKGSNL b Pp 3";
        let result = run_test_search(sfen, 500, 4);
        println!("Hand Pieces Result: {}", result);
        let (mv, _score, _depth, _nodes) = validate_result(&result);
        assert!(!mv.starts_with("error"), "Should not be an error: {}", mv);
    }

    #[test]
    fn test_sfen_with_custom_pieces_skipped() {
        // カスタム駒（ZOU=E）を含むSFEN → Rustはスキップするが1マスとしてカウントする
        // Rank 1: l n s g k E s n l (9 chars)
        // Rank 9: L N S G K e S N L (9 chars)
        let sfen = "lnsgkEsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKeSNL b - 1";
        let result = run_test_search(sfen, 500, 3);
        println!("Custom Piece SFEN Result: {}", result);
        let (mv, _score, _depth, _nodes) = validate_result(&result);
        assert!(!mv.starts_with("error"), "Custom piece SFEN should not cause error: {}", mv);
    }

    #[test]
    fn test_multiple_moves_sequence() {
        // 棋譜テスト：初期局面から複数手進めた局面
        // 7六歩 → 3四歩 の後
        let sfen = "lnsgkgsnl/1r5b1/pppppp1pp/6p2/9/2P6/PP1PPPPPP/1B5R1/LNSGKGSNL b - 3";
        let result = run_test_search(sfen, 1000, 5);
        println!("After 2 moves Result: {}", result);
        let (mv, score, depth, nodes) = validate_result(&result);
        assert!(!mv.starts_with("error"), "Should produce valid move");
        println!("  Best Move: {}, Score: {}, Depth: {}, Nodes: {}", mv, score, depth, nodes);
    }
}

