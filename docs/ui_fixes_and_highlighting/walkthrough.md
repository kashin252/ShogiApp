# Time Control Updates and C++ Cleanup

## Changes Accomplished

### 1. Updated Time Controls
- **Per-Move Time Limits**: Implemented strict per-move time limits for 10s, 30s, and 60s settings. The timer now resets to the full amount at the start of each player's turn.
- **Removed Fischer Rule**: Completely removed the logic that added increment time (e.g., +5s) after each move.
- **UI Updates**: Updated the game settings dropdown to clearly show "10 seconds", "30 seconds", and "60 seconds".

### 2. Code Cleanup
- **Removed C++ Engine**: Deleted `shogi_engine.cpp`, `shogi_engine.h`, `jni_bridge.cpp`, and related build configurations (`CMakeLists.txt`, `build.gradle` updates) to simplify the project structure as requested.

### 3. AI Strength Enhancements
- **Enhanced Evaluation**: Switched to `evaluate.ts` for more accurate judgment.
- **Increased thinking Time**: Increased allocation to 80% of per-move limits.

### 4. UI Fixes and Highlighting
- **Sente-Relative Score**: Fixed the evaluation score display to always be from Sente's perspective (+ for Sente, - for Gote), regardless of which side the AI is playing.
- **Enhanced Highlighting**: Improved the visibility of the "last move" square with a stronger yellow background and a bright border.

## Verification Results

### UI Verification
- **Score Polarity**: Verified in `GameScreen.tsx` that `searchResult.score` is negated when `settings.aiSide === 1` (Gote).
- **Square Highlight**: Verified in `Board.tsx` that the `lastMove` style now includes `borderWidth: 2` and a more vivid color.
