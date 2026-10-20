# Android AI release — 2026-10-20

Version 1.0.1 (code 2), package `com.ronnguyen.fuehrerscheinvietduc`.

The shared frontend is ported exactly from iOS feature commit `a3a8aa53405da8d354d7cd79b9aed117523a794e`, also present in the latest public and legacy iOS AI releases. It restores the per-question AI explanation button. Existing AI Assistant, Speed Room, learning and exam behavior remain intact. Active exams do not expose explanations; backend entitlements still govern access.

Android now packages the fresh Vite `dist` after tests/build, rather than a previously committed iOS `www`. Required AI/Speed assets are checked before replacing the packaged web directory. No iOS native project, backend or student data was changed.

Build source: `cbf745813f7eabd1dc8f2e204673194e7589e7d1`.
GitHub Actions run: https://github.com/Ducprodoi9/iphone1/actions/runs/39374927737 — SUCCESS, including Android 15 emulator login/native HTTP/device identity/explanation-module smoke test.

Verification: 35 frontend tests, 6 Android bootstrap/packaging tests, TypeScript and Vite build passed. Fresh independent review found no critical/important findings. APK and AAB inspected to match exact explanation JS/CSS and React slot from latest iOS. APK version/package/targetSDK36 checked; APK v2/v3 and AAB JAR signatures verified using the existing upload key. Private key/password remain outside Git.

Signed delivery SHA-256:
- APK: `d875b53b49260507fd1037a5cabf4b5d11037611c8aa52b0a2906587cec34dbe`
- AAB: `c47c2923c33441884132effef2071b2bf0b3d58890f730f113a51cd00ea7a0ac`

This supersedes the packaging description in `ANDROID-20261019.md`. The deliverable APK uses the release package, separate from yesterday's `.preview` APK. New device-local session identity requires login and may need the existing authorized device-reset flow if the test account is device-bound.

Google Play status: new application form prepared, package availability confirmed; two legal declarations await owner action-time approval. No driving app has been created, no bundle uploaded, and no public release claimed yet. After approval, create the app, upload this signed AAB and complete store disclosures/reviewer access/testing requirements.
