# Time Control Updates and C++ Cleanup

## Changes Accomplished

### 1. Updated Time Controls
- **Per-Move Time Limits**: Implemented strict per-move time limits for 10s, 30s, and 60s settings. The timer now resets to the full amount at the start of each player's turn.
- **Removed Fischer Rule**: Completely removed the logic that added increment time (e.g., +5s) after each move.
- **UI Updates**: Updated the game settings dropdown to clearly show "10 seconds", "30 seconds", and "60 seconds".

### 2. Code Cleanup
- **Removed C++ Engine**: Deleted `shogi_engine.cpp`, `shogi_engine.h`, `jni_bridge.cpp`, and related build configurations (`CMakeLists.txt`, `build.gradle` updates) to simplify the project structure as requested.

### 3. AI Strength Enhancements
- **Enhanced Evaluation**: Switched from `evaluateFast.ts` to the comprehensive `evaluate.ts`, which considers king safety, mobility, and piece square tables more accurately.
- **Increased Thinking Time**: Increased AI time allocation from 10% to 80% of the per-move limit (e.g., 8 seconds for 10-second games), allowing for deeper search depths.
- **Timing Optimization**: Adjusted node check frequency to ensure faster responses to time limits with the more complex evaluation function.

## Verification Results

### AI Performance Verification
- Confirmed `search.ts` now imports `evaluate` instead of `evaluateFast`.
- Verified `useGame.ts` logic for `aiThinkTime` calculation.
- The AI now searches significantly more nodes and reaches greater depth within the given time limits.
