# Public distribution preparation — 2026-10-16

The owner approved the new App Store name **Führerschein Viet-Duc by Ron** after Apple Support confirmed that a new app record and binary are required. Existing Unlisted app: 6793430149, tested feature build 1.0.11 (22), update submitted for review on 2026-10-16.

## New target
- App Store name: Führerschein Viet-Duc by Ron (28 characters).
- Bundle: com.ronnguyen.fuehrerscheinvietduc.public.
- Team: 285CT4P989.
- Current version/build: **1.0.0 (2)**. Build 1 was replaced following ITMS-90035 Invalid Signature.
- App ID: **6823455331**, registered and created on 2026-10-16. All signing/probe/cleanup scripts read this target; upload rejects the old Unlisted App ID and wrong bundle/team.
- Home-screen display name and all features/API URLs remain unchanged.

## Current status — 2026-10-17
- Repaired signing lifecycle; the pipeline no longer revokes uploaded signing certificates/profiles before App Review. See `docs/SIGNATURE_FIX_2026-10-17.md` for evidence, exact changed files and rollback head.
- Successful CI run **39033000383**, commit **51bbcdaecdfcafa2066741143b7e80c373f8ee80**. All 34 tests passed; native build/archive/export and IPA signature checks passed.
- Build **1.0.0 (2)**, ID **d6086d17-43fa-469c-b465-6c7a037f67a1**, processing VALID; added to the owner TestFlight group. Registered signing certificate/profile intentionally remain active for review; local private keys were removed.
- Resubmitted **2026-10-17 19:39 Asia/Saigon** in submission **f22e63ab-7c14-4c17-99f0-c89d0a4cc6ff**. ASC confirmed **Waiting for Review**, item **1.0.0 (2)**.
- Public, free, Germany + Vietnam; automatic release after approval; metadata/screenshots/privacy preserved. Not yet released publicly. Existing Unlisted app and backend remain unchanged.

## Historical status — initial build 1 on 2026-10-16
- Signed archive/export/upload succeeded in GitHub Actions run 38847010815, commit 8e3fad2e4b2ce9674d3bc4bf045f04f61796d6e3.
- Apple processing **VALID**: version 1.0.0 (1), build ID 2c5cd37d-2be3-4ac7-8f3d-9547b7427df7. CI-owned signing resources reconciled successfully.
- Version metadata saved; build attached; automatic release after approval selected.
- Seven iPhone screenshots and one iPad screenshot copied from the existing app; Apple completed processing all assets. Reviewer contact/demo credentials copied inside the Apple account without printing or storing them in git. Metadata workflow run 38847536186 succeeded.
- Category Education, content-rights declaration preserved, DSA trader status inherited. Age questionnaire reflects messaging/UGC, infrequent alcohol/drug references in driving education, and regular Speed Room contests. Apple calculated 13+ globally, with regional exceptions including Vietnam 12+.
- Free download; Public distribution selected. Availability restricted to **Germany and Vietnam**, future countries disabled. A save for 175 regions was blocked by automatic approval review, then the scope was reduced through the UI. The old app's availability is untouched.
- Privacy questionnaire prepared for eight data types: Name, Email Address, Phone Number, Emails or Text Messages, Other User Content, User ID, Device ID, Product Interaction. All linked to account, not used for advertising tracking. App Functionality for all; Product Personalization additionally for AI content, User ID and Product Interaction.
- Owner confirmed Apple’s privacy publication agreement in chat on 2026-10-16. Published responses successfully; ASC visibly confirmed publication before submission.
- Owner TestFlight group 4dc51e69-9d15-4b69-8d87-8b926702e0fd contains build 1.0.0 (1), Ready to Test; the existing Account Holder was invited. No other users were added.
- Apple submission validation passed after publishing App Privacy. Final UI confirmed **1 Item Submitted**.
- **Submitted for App Store review on 2026-10-16 at 12:55 Asia/Saigon.** Status at that initial submission: **Waiting for Review** (later invalidated and replaced by build 2). Submission ID: **f22e63ab-7c14-4c17-99f0-c89d0a4cc6ff**. Item: **1.0.0 (1)**. Review detail URL: https://appstoreconnect.apple.com/apps/6823455331/distribution/reviewsubmissions/details/f22e63ab-7c14-4c17-99f0-c89d0a4cc6ff
- App is not yet released publicly. Public discovery/search must be verified only after approval and release; do not promise an approval date.

## Migration
The original source stores a random ios- device identifier in WKWebView localStorage. A different bundle has independent local storage, so it creates a different device identifier. An existing student moving to Public therefore needs the existing admin device-reset action once. Do not bulk-reset production devices or bypass the device lock. Learning data and AI entitlements remain server/account based; session and local preferences require sign-in in the new app. Keep the Unlisted app and branch intact.

## Next execution
1. Wait for Apple’s review decision. The owner receives Apple’s review email.
2. If Apple requests information, inspect the actual review message before changing source or metadata.
3. After approval/automatic release, verify public listing and search in Germany and Vietnam. Preserve the existing Unlisted app.

## Verification
31 tests passed: 24 existing feature tests, 4 Apple REST transport/upload tests, 3 Public target safety tests. Vite production build and www synchronization passed. Client source/native behavior was not modified.

Earlier unsigned native CI verification succeeded: https://github.com/Ducprodoi9/iphone1/actions/runs/38843970494 , commit a3a94da02a56469d2cef0c15ca224dbc1319b900. Simulator BUILD SUCCEEDED. Signing/upload was intentionally skipped in that earlier run because the new Public App ID was not configured yet. Signed delivery subsequently succeeded in run 38847010815 (see Current status).
