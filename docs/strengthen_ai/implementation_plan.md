# Strengthen AI and Update Time Controls

Address the perceived weakness of the AI by increasing its thinking time and using a more sophisticated evaluation function, while maintaining the new per-move time control settings.

## User Review Required

> [!IMPORTANT]
> - **All time controls** (10s, 30s, 60s) will function as **Per Move** time limits (Byoyomi-like).
> - **AI Thinking Time** will be increased to **80%** of the per-move limit (e.g., 8s for a 10s limit).
> - **AI Evaluation** will be switched from `evaluateFast.ts` to the more comprehensive `evaluate.ts`.
> - **Fischer Increment** logic remains removed.
> - "Unlimited" remains available for PvP.

# Break Circular Dependencies and Fix App Crash

The app continues to crash, likely due to a persistent circular dependency: `game.ts` -> `search.ts` -> `evaluate.ts` -> `game.ts`. We will break this by using interfaces and `import type`.

## Proposed Changes

### [Types] Component

#### [MODIFY] [game.types.ts](file:///Users/user/ShogiApp/src/types/game.types.ts)
- Update `GameState` to include all fields needed by `evaluate` and `search` (incremental scores, King positions, TT, etc.).

### [Engine] Component

#### [MODIFY] [evaluate.ts](file:///Users/user/ShogiApp/src/engine/evaluate.ts)
- Change `import { ShogiGame } from './game'` to `import type { GameState } from '../types/game.types'`.
- This ensures that `evaluate.ts` does not trigger a runtime load of `game.ts`.

#### [MODIFY] [search.ts](file:///Users/user/ShogiApp/src/engine/search.ts)
- Change `import { ShogiGame } from './game'` to `import type { GameState } from '../types/game.types'`.
- Similarly, this breaks the search -> game value dependency.

#### [MODIFY] [game.ts](file:///Users/user/ShogiApp/src/engine/game.ts)
- Keep standard imports for `search`, but since `search` no longer loads `game` as a value, the cycle is broken.
- Refactor `initScores` to avoid any direct value-level circularity if possible (already uses `require`).

## Verification Plan

### Manual Verification
- **Build and Run (Version 21)**: Confirm the app opens and AI works without crashing.
  2. Verify timer starts at the selected time.
  3. Make a move. Verify **next** player's timer resets to the selected time.
  4. Verify **no time is added** to the moved player's clock (other than the reset for their *next* turn, which happens when *their* turn comes again, but immediately after their move, it doesn't matter). Actually, in simple Byoyomi, the previous player's time doesn't matter until their turn comes again. So mainly check that the *active* timer is correct.
