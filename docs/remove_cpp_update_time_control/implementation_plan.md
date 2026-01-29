# Update Time Control Settings

Use `timeControl` settings of 10 and 30 seconds to represent "per move" time limits, where the timer resets for every move, as opposed to the existing Fischer time control (initial time + increment).

## User Review Required

> [!IMPORTANT]
> - **All time controls** (10s, 30s, 60s) will function as **Per Move** time limits (Byoyomi-like).
> - The **reset** happens every time a player makes a move.
> - **Fischer Increment** logic will be completely removed.
> - "Unlimited" remains available for PvP.

## Proposed Changes

### UI
#### [MODIFY] [GameScreen.tsx](file:///Users/user/ShogiApp/src/screens/GameScreen.tsx)
- Update `Dropdown` options for `timeControl`:
  - Add "10 seconds"
  - Add "30 seconds"
  - Change "60 seconds" to simple "60 seconds" (no increment)
  - Remove existing Fischer options

### Logic
#### [MODIFY] [useGame.ts](file:///Users/user/ShogiApp/src/hooks/useGame.ts)
- Modify `makeMove` to handle time updates:
  - **Always reset** the next player's time to `settings.timeControl` after a move.
  - **Remove** any logic that adds `+5` seconds.
- Ensure `undo` logic respects the mode (reset to `timeControl` value).

## Verification Plan

### Manual Verification
- **Test 10s/30s/60s Mode**:
  1. Start a game with the setting.
  2. Verify timer starts at the selected time.
  3. Make a move. Verify **next** player's timer resets to the selected time.
  4. Verify **no time is added** to the moved player's clock (other than the reset for their *next* turn, which happens when *their* turn comes again, but immediately after their move, it doesn't matter). Actually, in simple Byoyomi, the previous player's time doesn't matter until their turn comes again. So mainly check that the *active* timer is correct.
