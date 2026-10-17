# Public app signature repair — 2026-10-17

## Evidence
- App 6823455331, bundle `com.ronnguyen.fuehrerscheinvietduc.public`, version 1.0.0 (1): ASC shows Invalid Binary; review submission has Unresolved Issues.
- Apple's delivery message on 2026-10-16 reports **ITMS-90035: Invalid Signature** and requests a new binary.
- Run 38847010815 created the signing certificate, reported build VALID at 03:48:36 UTC, then immediately removed its profile and revoked its certificate. App Review submission occurred later at 05:55 UTC.
- Apple documents that already uploaded builds not yet submitted for review may become Invalid Binary when their signing certificate is revoked: https://developer.apple.com/help/account/certificates/certificates-overview/

## Changes
- `ci/rest-testflight.mjs`: keep registered signing assets after upload, including after VALID processing. Still erase local private key, temporary keychain, profile copies and export directory. Verify the exported IPA with strict codesign, compare its actual leaf certificate with the distribution certificate, and validate App Store profile identity/type/expiry before uploading.
- `ci/cleanup-signing.mjs`: never revoke signing assets for an uploaded build merely because processing is terminal. Preserve their journal IDs for deliberate later management. Cleanup remains available for a failure before upload or a definitive upload-commit rejection after its abandoned upload is removed.
- `ci/signing-retention.test.mjs`: execute the real cleanup command against an isolated fake Apple network; verify no revocation for either already VALID or reconciled VALID builds and verify owned cleanup for a preupload failure.
- `ci/app-target.json` and both native project configurations: version remains 1.0.0; build increases to **2**.
- `.github/workflows/ios-verify.yml`: include signing lifecycle regression tests.

No frontend, native feature implementation, backend API, database, account/device-lock or existing Unlisted app settings are changed. The prior GitHub head remains in history for rollback: `7a49bd3d01a730e291f629f7332ee1433ef78da3`. Do not restore the old certificate-revocation behavior.

## Validation
Before the fix, two lifecycle regression tests failed because the signing certificate was revoked after upload. After the fix, all ten CI transport/target/lifecycle tests pass locally. Native signature checks, frontend tests and upload will run on the macOS CI runner.

## Delivery
Build 1.0.0 (2) pending CI and resubmission. Preserve Public free distribution in Germany and Vietnam, existing metadata/screenshots and the published privacy questionnaire. Do not claim review acceptance from TestFlight processing status.
