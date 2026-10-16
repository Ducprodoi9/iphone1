# Public Distribution Implementation Plan

> Execute inline on feature/ios-public-distribution; preserve the tested Unlisted branch.

Goal: distribute the same tested AI + Speed Room application as Führerschein Viet-Duc by Ron through Public distribution.
Architecture: reuse the UIKit/WKWebView shell, frontend and production API. Separate app identity and release configuration. The Public target must never upload to App ID 6793430149.

## Constraints
- Name approved by owner: Führerschein Viet-Duc by Ron.
- Bundle: com.ronnguyen.fuehrerscheinvietduc.public; Team 285CT4P989.
- Initial Public record version 1.0.0 build 1; feature source equals tested 1.0.11 (22).
- No production backend/database changes; retain device lock and Apple demo behavior.
- Each app has isolated local storage. Existing learners switching apps need one admin device reset; server learning data remains account based.

## Tasks
1. Configure project identity and central CI target. Guard absent/wrong App ID before signing/API mutations. Verify feature code unchanged and run existing 28 tests plus target validation.
2. Register Bundle ID and create new Public app record in ASC; capture actual App ID and update central target. Verify old record untouched.
3. Run macOS CI build/archive/REST upload and wait for Apple VALID. Add owner to internal TestFlight.
4. Reuse accurate metadata/assets/privacy declarations; explain Public replacement and Apple Support case to review. Submit only after required fields and target identity verified.

## Ledger
- Source baseline local 632f2f7; remote 8a70c132cc63f95ffd1dd8b0792af10e919491c5.
- Owner approved new Public name. Separate local worktree created; no source code behavior changed.
- Browser login expired; secure password request was declined. Do not retry authentication without user request. Tasks 2–4 blocked at app-record creation; finish independent Task 1 and native CI first.
