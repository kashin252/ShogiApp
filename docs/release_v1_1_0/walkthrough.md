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
- **Sente-Relative Score**: Fixed the evaluation score display to always be from Sente's perspective.
- **Enhanced Highlighting**: Improved visibility of the "last move" square.

### 6. Release Build (AAB)
- **Environment**: Configured local build environment using Android Studio's bundled JDK and the SDK at `~/Library/Android/sdk`.
- **EAS Build**: Successfully generated the production Android App Bundle (AAB) locally.
- **Artifact**: The final AAB is located at `/Users/user/ShogiApp/build-1769576097002.aab`.

## Verification Results

### Monetization Verification
- **Limit Enforcement**: Verified that `StorageService.canPlay()` returns `false` after 5 increments.
- **Undo Restriction**: Verified that `handleUndo` redirects to the premium screen for non-premium users.
- **Mock Purchase**: Confirmed that the "Purchase" button on the Web preview successfully upgrades the user to premium status.

### Release Build Verification
- **Build Success**: Confirmed `eas build --local` finished with exit code 0.
- **Artifact Presence**: Verified the existence of the `.aab` file in the project directory.
