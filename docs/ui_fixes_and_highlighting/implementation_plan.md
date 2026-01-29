# UI Fixes and last-move Highlighting

## Proposed Changes

### UI
#### [MODIFY] [GameScreen.tsx](file:///Users/user/ShogiApp/src/screens/GameScreen.tsx)
- Adjust the evaluation score display logic.
- If the AI is Gote (side 1), negate the `searchResult.score` to make it Sente-relative.

#### [MODIFY] [Board.tsx](file:///Users/user/ShogiApp/src/components/Board.tsx)
- Use the `lastMovePos` prop to apply a highlight style to the corresponding square.
- Add a style for the last move highlight (e.g., a subtle background color or border).

## Verification Plan

### Manual Verification
- **Score Display**:
  1. Play as Sente against AI (Gote).
  2. Gain an advantage.
  3. Verify that the score is negative (indicating Gote is losing, or Sente is winning).
- **Last Move Highlighting**:
  1. Make a move on the board.
  2. Verify that the square you moved TO is highlighted.
  3. Observe AI move. Verify the square it moved TO is highlighted.
