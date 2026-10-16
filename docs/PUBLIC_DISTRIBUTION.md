# Public distribution preparation — 2026-10-16

The owner approved the new App Store name **Führerschein Viet-Duc by Ron** after Apple Support confirmed that a new app record and binary are required. Existing Unlisted app: 6793430149, tested feature build 1.0.11 (22), update submitted for review on 2026-10-16.

## New target
- App Store name: Führerschein Viet-Duc by Ron (28 characters).
- Bundle: com.ronnguyen.fuehrerscheinvietduc.public.
- Team: 285CT4P989.
- Version/build: 1.0.0 (1), the initial release of the separate Public record.
- App ID: **6823455331**, registered and created on 2026-10-16. All signing/probe/cleanup scripts read this target; upload rejects the old Unlisted App ID and wrong bundle/team.
- Home-screen display name and all features/API URLs remain unchanged.

## Current status
- Signed archive/export/upload succeeded in GitHub Actions run 38847010815, commit 8e3fad2e4b2ce9674d3bc4bf045f04f61796d6e3.
- Apple processing **VALID**: version 1.0.0 (1), build ID 2c5cd37d-2be3-4ac7-8f3d-9547b7427df7. CI-owned signing resources reconciled successfully.
- Version metadata saved; build attached; automatic release after approval selected.
- Seven iPhone screenshots and one iPad screenshot copied from the existing app; Apple completed processing all assets. Reviewer contact/demo credentials copied inside the Apple account without printing or storing them in git. Metadata workflow run 38847536186 succeeded.
- Category Education, content-rights declaration preserved, DSA trader status inherited. Age questionnaire reflects messaging/UGC, infrequent alcohol/drug references in driving education, and regular Speed Room contests. Apple calculated 13+ globally, with regional exceptions including Vietnam 12+.
- Free download; Public distribution selected. Availability restricted to **Germany and Vietnam**, future countries disabled. A save for 175 regions was blocked by automatic approval review, then the scope was reduced through the UI. The old app's availability is untouched.
- Privacy questionnaire prepared for eight data types: Name, Email Address, Phone Number, Emails or Text Messages, Other User Content, User ID, Device ID, Product Interaction. All linked to account, not used for advertising tracking. App Functionality for all; Product Personalization additionally for AI content, User ID and Product Interaction.
- **Privacy publication remains pending owner confirmation**: Apple's Publish dialog includes agreement that responses are accurate, comply with law/guidelines and will be promptly updated. Do not click acceptance before action-time confirmation.
- New Public app has **not yet been submitted or released**. Do not claim public App Store search availability before approval and release.

## Migration
The original source stores a random ios- device identifier in WKWebView localStorage. A different bundle has independent local storage, so it creates a different device identifier. An existing student moving to Public therefore needs the existing admin device-reset action once. Do not bulk-reset production devices or bypass the device lock. Learning data and AI entitlements remain server/account based; session and local preferences require sign-in in the new app. Keep the Unlisted app and branch intact.

## Next execution
1. Complete Apple's submission validation and owner TestFlight access.
2. Obtain owner confirmation for Apple's privacy publication agreement, publish the prepared responses, and submit the Public version.
3. Verify actual review status. Preserve the existing Unlisted app and its pending update.
4. After approval/release, verify public listing and search in permitted storefronts.

## Verification
31 tests passed: 24 existing feature tests, 4 Apple REST transport/upload tests, 3 Public target safety tests. Vite production build and www synchronization passed. Client source/native behavior was not modified.

Native CI verification succeeded: https://github.com/Ducprodoi9/iphone1/actions/runs/38843970494 , commit a3a94da02a56469d2cef0c15ca224dbc1319b900. Simulator BUILD SUCCEEDED. Signing/upload skipped because the new Public app record/App ID is not configured.
