# App Crash Investigation

- [x] Capture Crash Log
    - [x] Run `adb logcat` (Failed: no device connected)
- [ ] Identify Root Cause
    - [x] Check for `react-native-iap` issues (Diagnostic build crashed)
    - [/] Check for Native module crashes
        - [x] `shogi-engine` is built by Gradle.
        - [x] **Disable `shogi-engine` to verify crash source.** (Done: Renamed package.json) <!-- id: 20 -->
    - [x] Hypothesis: R8/ProGuard stripping native module code (Mitigated)
    - [x] Hypothesis: Entry point initialization failure (Checked)
- [ ] Implement Fix
    - [x] Disable `minifyEnabled` in `build.gradle` (Done)
    - [x] Create diagnostic build 1 (IAP disabled) (Failed)
    - [x] **Create diagnostic build 2 (Remove shogi-engine)** <!-- id: 19 -->
        - [x] Rename package.json -> package.json.bak
        - [x] Update Version to 33
    - [ ] Rebuild and verify <!-- id: 9 -->

**Status: Version 33 (Diagnostic)**
Disabled `shogi-engine` native module. Waiting for verification.
