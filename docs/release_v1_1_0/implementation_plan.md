# Monetization Implementation Plan

Implement a daily limit of 5 games per day and restrict the "Undo" (Matta) feature to premium users, preparing for Google Play release.

## User Review Required

> [!IMPORTANT]
> - **Daily Limit**: 5 games per day. We will store the last played date and count in `AsyncStorage`.
> - **Undo Feature**: Will be locked unless `isPremium` is true.
> - **IAP Integration**: We will set up the code structure for billing, but actual terminal testing of Google Play Store purchases requires a native Android environment, not a web preview.

## Proposed Changes

### Storage and State
#### [NEW] [userStatsService.ts](file:///Users/user/ShogiApp/src/services/userStatsService.ts)
- Functions to increment daily game count and retrieve current count.
- Logic to reset count if the current date is different from the last saved date.

#### [NEW] [premiumService.ts](file:///Users/user/ShogiApp/src/services/premiumService.ts)
- A simple store to track `isPremium` status.
- Placeholder for actual IAP (react-native-iap) calls.

### UI Components
#### [MODIFY] [GameScreen.tsx](file:///Users/user/ShogiApp/src/screens/GameScreen.tsx)
- Add "Limit Reached" modal.
- Modify `handleNewGame` to check the daily limit.
- Modify `undo` button handler to check for premium status.

#### [MODIFY] [Board.tsx](file:///Users/user/ShogiApp/src/components/Board.tsx)
- Optional: Add a "Premium" lock icon to the undo button if applicable (if the button is on the board).

## Verification Plan
### Automated Tests
- Mock `AsyncStorage` to verify daily count logic (reset on new day).
### Manual Verification
1. Open the app and start 5 games.
2. On the 6th attempt, verify the "Daily Limit Reached" modal appears.
3. Click "Undo" as a free user and verify the "Premium Required" message/modal appears.
