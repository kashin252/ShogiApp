use crate::board::Position;
use crate::evaluate::evaluate;
use crate::move_gen::{generate_moves, generate_captures, MoveList};
use crate::moves::{Move, MAX_MOVES};
use crate::types::PieceType;
use crate::pst::PIECE_VALUES;
use crate::tt::{TT, TT_EXACT, TT_LOWER, TT_UPPER};
use std::time::Instant;

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};

pub struct SearchResult {
    pub best_move: Move,
    pub score: i32,
    pub nodes: u64,
    pub depth: u8,
    pub time_ms: u64,
}

struct SearchContext<'a> {
    nodes: u64,
    start_time: Instant,
    time_limit_ms: u64,
    stopped: &'a AtomicBool,
    tt: &'a TT,
    killers: [[Move; 2]; 64],
    history: [[i32; 81]; 81],  // History Heuristic: [from][to]
    thread_id: usize,
    global_nodes: Option<&'a AtomicU64>,
}

pub fn iterative_deepening(
    pos: &Position, 
    time_limit_ms: u64, 
    max_depth: u8,
    tt: &TT, 
    stopped: &AtomicBool, 
    thread_id: usize,
    global_nodes: Option<&AtomicU64>
) -> SearchResult {
    let mut ctx = SearchContext {
        nodes: 0,
        start_time: Instant::now(),
        time_limit_ms,
        stopped,
        tt,
        killers: [[Move::NONE; 2]; 64],
        history: [[0i32; 81]; 81],
        thread_id,
        global_nodes,
    };

    let mut working_pos = pos.clone();
    let mut best_move = Move::NONE;
    let mut best_score = 0i32;
    let mut completed_depth = 0;
    
    // Main thread resets stop signal (helpers shouldn't)
    if ctx.thread_id == 0 {
        ctx.stopped.store(false, Ordering::Relaxed);
        if let Some(gn) = ctx.global_nodes {
            gn.store(0, Ordering::Relaxed);
        }
    }

    for depth in 1..=max_depth {
        // Aspiration Window: narrow search window based on previous score
        let score;
        if depth >= 4 && best_score.abs() < 15000 {
            let mut delta = 50;
            let mut a = best_score - delta;
            let mut b = best_score + delta;
            let mut asp_score = best_score; // default fallback
            
            loop {
                let s = alpha_beta(&mut ctx, &mut working_pos, depth, a, b, 0);
                if ctx.stopped.load(Ordering::Relaxed) { asp_score = s; break; }
                
                if s <= a {
                    a = (a - delta).max(-30000);
                    delta *= 2;
                } else if s >= b {
                    b = (b + delta).min(30000);
                    delta *= 2;
                } else {
                    asp_score = s;
                    break;
                }
                
                if delta > 2000 {
                    asp_score = alpha_beta(&mut ctx, &mut working_pos, depth, -30000, 30000, 0);
                    break;
                }
            }
            if ctx.stopped.load(Ordering::Relaxed) { break; }
            score = asp_score;
        } else {
            score = alpha_beta(&mut ctx, &mut working_pos, depth, -30000, 30000, 0);
            if ctx.stopped.load(Ordering::Relaxed) { break; }
        }
        
        if let Some(entry) = ctx.tt.probe(working_pos.hash) {
            best_move = entry.best_move;
        }
        best_score = score;
        completed_depth = depth;

        // Use more of the time limit (up to 95%)
        if ctx.start_time.elapsed().as_millis() as u64 > (time_limit_ms * 95 / 100) {
            ctx.stopped.store(true, Ordering::Relaxed);
            break;
        }
    }

    let elapsed = ctx.start_time.elapsed().as_millis() as u64;
    
    // Aggregate Global Nodes if Main Thread
    let total_nodes = if let Some(gn) = ctx.global_nodes {
        gn.load(Ordering::Relaxed)
    } else {
        ctx.nodes
    };
    
    SearchResult {
        best_move,
        score: best_score,
        nodes: total_nodes,
        depth: completed_depth,
        time_ms: elapsed,
    }
}

fn alpha_beta(ctx: &mut SearchContext, pos: &mut Position, depth: u8, mut alpha: i32, beta: i32, ply: usize) -> i32 {
    if ctx.nodes & 2047 == 0 {
        if ctx.start_time.elapsed().as_millis() as u64 > ctx.time_limit_ms {
            ctx.stopped.store(true, Ordering::Relaxed);
        }
    }
    if ctx.stopped.load(Ordering::Relaxed) { return 0; }

    ctx.nodes += 1;
    if let Some(gn) = ctx.global_nodes {
        if ctx.nodes & 1023 == 0 {
            gn.fetch_add(1024, Ordering::Relaxed);
        }
    }

    // TT Probe
    let tt_move = if let Some(entry) = ctx.tt.probe(pos.hash) {
        if entry.depth >= depth {
            match entry.flag {
                TT_EXACT => return entry.score,
                TT_LOWER => if entry.score >= beta { return entry.score; },
                TT_UPPER => if entry.score <= alpha { return entry.score; },
                _ => {}
            }
        }
        entry.best_move
    } else {
        Move::NONE
    };

    if depth == 0 {
        return quiescence(ctx, pos, alpha, beta, ply);
    }
    
    let turn = pos.turn;
    let in_check = pos.is_in_check(turn);

    // Check Extension: search deeper when in check
    let effective_depth = if in_check && depth < 25 {
        depth + 1
    } else {
        depth
    };

    // Null Move Pruning (skip if in check)
    if effective_depth >= 3 && ply > 0 && !in_check {
        let r = if effective_depth >= 6 { 4 } else { 3 }; // Adaptive R
        let undo = pos.make_null_move();
        let nm_score = -alpha_beta(ctx, pos, effective_depth.saturating_sub(1 + r), -beta, -beta + 1, ply + 1);
        pos.unmake_null_move(undo);
        if ctx.stopped.load(Ordering::Relaxed) { return 0; }
        if nm_score >= beta { return beta; }
    }

    let mut list = MoveList::new();
    generate_moves(pos, &mut list);

    // Move Ordering with History Heuristic
    let mut scores = [0i32; MAX_MOVES];
    for i in 0..list.count {
        let m = list.moves[i];
        if m == tt_move {
            scores[i] = 10_000_000;
        } else if m.captured() != PieceType::Empty {
            // MVV-LVA: Victim value * 10 - Attacker value
            let victim_val = PIECE_VALUES[m.captured() as usize];
            let attacker_val = PIECE_VALUES[m.piece() as usize];
            scores[i] = 1_000_000 + victim_val * 10 - attacker_val;
        } else if m == ctx.killers[ply][0] {
            scores[i] = 900_000;
        } else if m == ctx.killers[ply][1] {
            scores[i] = 800_000;
        } else if !m.is_drop() {
            // History Heuristic for quiet moves
            let from = m.from() as usize;
            let to = m.to() as usize;
            if from < 81 && to < 81 {
                scores[i] = ctx.history[from][to];
            }
        }
        
        // Lazy SMP Divergence
        if ctx.thread_id > 0 && m != tt_move {
            let noise = ((pos.hash.wrapping_add(i as u64).wrapping_mul(ctx.nodes)) % 256) as i32;
            scores[i] += noise;
        }
    }

    let mut best_score = -30000;
    let mut best_move = Move::NONE;
    let mut legal_moves_found = 0;
    let old_alpha = alpha;

    // Pre-compute static eval for Futility Pruning
    let static_eval = if effective_depth <= 3 && !in_check && ply > 0 {
        Some(evaluate(pos))
    } else {
        None
    };

    for i in 0..list.count {
        // Selection sort
        let mut best_idx = i;
        for j in i + 1..list.count {
            if scores[j] > scores[best_idx] {
                best_idx = j;
            }
        }
        scores.swap(i, best_idx);
        list.moves.swap(i, best_idx);

        let m = list.moves[i];
        let is_capture = m.captured() != PieceType::Empty;
        let is_promotion = m.is_promote();
        
        // Futility Pruning (skip before make_move, so don't count as legal)
        if !is_capture && !is_promotion && best_score > -30000 {
            if let Some(st_eval) = static_eval {
                let margin = 200 * effective_depth as i32;
                if st_eval + margin < alpha {
                    continue;
                }
            }
        }

        let undo = pos.make_move(m);
        if pos.is_in_check(turn) {
            pos.unmake_move(m, undo);
            continue;
        }
        legal_moves_found += 1;

        // LMR (Late Move Reduction)
        let mut reduction = 0;
        if effective_depth >= 3 && legal_moves_found >= 4 && !is_capture && !is_promotion && !in_check {
            reduction = 1;
            if legal_moves_found >= 10 { reduction = 2; }
            // Reduce more for moves with low history score
            if !m.is_drop() && m.from() < 81 && m.to() < 81 {
                if ctx.history[m.from() as usize][m.to() as usize] < 0 {
                    reduction += 1;
                }
            }
        }

        // PVS (Principal Variation Search)
        let mut score;
        if legal_moves_found == 1 {
            score = -alpha_beta(ctx, pos, effective_depth - 1, -beta, -alpha, ply + 1);
        } else {
            // Step 1: Reduced depth null window
            let r_depth = effective_depth.saturating_sub(1 + reduction);
            score = -alpha_beta(ctx, pos, r_depth, -alpha - 1, -alpha, ply + 1);
            
            // Step 2: Full depth null window (if LMR was applied)
            if score > alpha && reduction > 0 {
                score = -alpha_beta(ctx, pos, effective_depth - 1, -alpha - 1, -alpha, ply + 1);
            }
            
            // Step 3: Full depth full window
            if score > alpha && score < beta {
                score = -alpha_beta(ctx, pos, effective_depth - 1, -beta, -alpha, ply + 1);
            }
        }

        pos.unmake_move(m, undo);

        if ctx.stopped.load(Ordering::Relaxed) { return 0; }

        if score > best_score {
            best_score = score;
            best_move = m;
        }

        if score > alpha {
            alpha = score;
            if alpha >= beta {
                // Update Killer and History for quiet moves causing beta cutoff
                if m.captured() == PieceType::Empty {
                    ctx.killers[ply][1] = ctx.killers[ply][0];
                    ctx.killers[ply][0] = m;
                    
                    // History Heuristic: bonus for cutoff move
                    if !m.is_drop() && m.from() < 81 && m.to() < 81 {
                        let bonus = (effective_depth as i32) * (effective_depth as i32);
                        let entry = &mut ctx.history[m.from() as usize][m.to() as usize];
                        *entry += bonus - *entry * bonus.abs() / 16384i32;
                    }
                }
                
                // History Malus: penalize quiet moves that didn't cause cutoff
                for j in 0..i {
                    let prev = list.moves[j];
                    if prev.captured() == PieceType::Empty && !prev.is_drop() && prev.from() < 81 && prev.to() < 81 {
                        let malus = -(effective_depth as i32) * (effective_depth as i32);
                        let entry = &mut ctx.history[prev.from() as usize][prev.to() as usize];
                        *entry += malus - *entry * malus.abs() / 16384i32;
                    }
                }
                break;
            }
        }
    }
    
    if legal_moves_found == 0 {
        if pos.is_in_check(turn) {
            return -20000 + ply as i32;
        } else {
            return 0;
        }
    }
    
    // TT Store
    let flag = if best_score <= old_alpha { TT_UPPER } else if best_score >= beta { TT_LOWER } else { TT_EXACT };
    if ctx.thread_id == 0 || effective_depth > 4 {
        ctx.tt.store(pos.hash, effective_depth, best_score, flag, best_move);
    }

    best_score
}

fn quiescence(ctx: &mut SearchContext, pos: &mut Position, mut alpha: i32, beta: i32, ply: usize) -> i32 {
    if ctx.nodes & 2047 == 0 {
        if ctx.start_time.elapsed().as_millis() as u64 > ctx.time_limit_ms {
            ctx.stopped.store(true, Ordering::Relaxed);
        }
    }
    if ctx.stopped.load(Ordering::Relaxed) { return 0; }

    ctx.nodes += 1;
    if let Some(gn) = ctx.global_nodes {
        if ctx.nodes & 1023 == 0 {
            gn.fetch_add(1024, Ordering::Relaxed);
        }
    }

    let stand_pat = evaluate(pos);
    if stand_pat >= beta {
        return beta;
    }
    if alpha < stand_pat {
        alpha = stand_pat;
    }

    if ply >= 64 { return stand_pat; }

    // Delta Pruning: if even capturing the most valuable piece can't raise alpha, skip
    let big_delta = 1300; // Dragon value (most valuable capturable piece)
    if stand_pat + big_delta < alpha {
        return alpha;
    }

    // Generate only captures (not all moves!)
    let mut list = MoveList::new();
    generate_captures(pos, &mut list);

    let turn = pos.turn;

    // MVV-LVA sort for captures
    let mut scores = [0i32; MAX_MOVES];
    for i in 0..list.count {
        let m = list.moves[i];
        let victim_val = PIECE_VALUES[m.captured() as usize];
        let attacker_val = PIECE_VALUES[m.piece() as usize];
        scores[i] = victim_val * 10 - attacker_val;
    }

    for i in 0..list.count {
        // Selection sort
        let mut best_idx = i;
        for j in i + 1..list.count {
            if scores[j] > scores[best_idx] {
                best_idx = j;
            }
        }
        scores.swap(i, best_idx);
        list.moves.swap(i, best_idx);

        let m = list.moves[i];

        // Delta Pruning per move: skip if this capture can't possibly beat alpha
        let captured_val = PIECE_VALUES[m.captured() as usize];
        if stand_pat + captured_val + 200 < alpha && !m.is_promote() {
            continue;
        }

        let undo = pos.make_move(m);
        if pos.is_in_check(turn) {
            pos.unmake_move(m, undo);
            continue;
        }
        let score = -quiescence(ctx, pos, -beta, -alpha, ply + 1);
        pos.unmake_move(m, undo);

        if ctx.stopped.load(Ordering::Relaxed) { return 0; }

        if score >= beta {
            return beta;
        }
        if score > alpha {
            alpha = score;
        }
    }

    alpha
}
