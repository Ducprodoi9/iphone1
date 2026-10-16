# Public distribution preparation — 2026-10-16

The owner approved the new App Store name **Führerschein Viet-Duc by Ron** after Apple Support confirmed that a new app record and binary are required. Existing Unlisted app: 6793430149, tested feature build 1.0.11 (22), update submitted for review on 2026-10-16.

## New target
- App Store name: Führerschein Viet-Duc by Ron (28 characters).
- Bundle: com.ronnguyen.fuehrerscheinvietduc.public.
- Team: 285CT4P989.
- Version/build: 1.0.0 (1), the initial release of the separate Public record.
- App ID: not yet created. ci/app-target.json appID remains null on purpose. All signing/probe/cleanup scripts read this target; upload rejects the old Unlisted App ID and wrong bundle/team.
- Home-screen display name and all features/API URLs remain unchanged.

## Status / blocker
The browser's ASC session expired. The secure password request was declined; authentication has not been retried. No new Bundle ID or app record has been registered yet. New Public metadata, screenshots, privacy declarations, distribution availability and review submission remain pending. A green verification run with appID=null means unsigned native compilation only, never TestFlight delivery.

## Migration
The original source stores a random ios- device identifier in WKWebView localStorage. A different bundle has independent local storage, so it creates a different device identifier. An existing student moving to Public therefore needs the existing admin device-reset action once. Do not bulk-reset production devices or bypass the device lock. Learning data and AI entitlements remain server/account based; session and local preferences require sign-in in the new app. Keep the Unlisted app and branch intact.

## Next execution
1. Sign in to ASC through the secure browser flow only after user authorizes retry.
2. Register the exact new Bundle ID and create the approved app name with Public distribution. Capture actual numeric App ID; store as a string in ci/app-target.json. Never reuse 6793430149.
3. Run the existing workflow on codex/ios-public-20261016. Confirm ARCHIVE/EXPORT SUCCEEDED and Apple processing VALID for 1.0.0 (1).
4. Add the owner to Public TestFlight and complete accurate metadata/privacy/screenshots. Explain the replacement of the Unlisted app to App Review. Preserve old app/users; do not remove or rename the old listing.

## Verification
31 tests passed: 24 existing feature tests, 4 Apple REST transport/upload tests, 3 Public target safety tests. Vite production build and www synchronization passed. Client source/native behavior was not modified.

Native CI verification succeeded: https://github.com/Ducprodoi9/iphone1/actions/runs/38843970494 , commit a3a94da02a56469d2cef0c15ca224dbc1319b900. Simulator BUILD SUCCEEDED. Signing/upload skipped because the new Public app record/App ID is not configured.
