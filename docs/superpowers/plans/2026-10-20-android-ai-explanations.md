# Android AI Explanations Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish the driving Android app with the same per-question AI explanations as the latest approved iOS version.

**Architecture:** Port the tested shared UI change from iOS commit a3a8aa53405da8d354d7cd79b9aed117523a794e. Package the fresh Vite build directly into Capacitor Android, retaining existing Android device identity and native HTTP.

**Tech Stack:** React, Vite, Capacitor 8.4.0, Android SDK 36, GitHub Actions.

**Spec:** User request on 20 October 2026; existing iOS behavior documented in docs/AI_EXPLANATION_FIX_2026-10-19.md at the source commit.

## Global Constraints
- Same Android package com.ronnguyen.fuehrerscheinvietduc and existing upload key.
- Include AI assistant, Speed Room and per-question AI explanations.
- Preserve backend entitlements; no AI help during a running exam.
- Do not change backend, student data, iOS release state or signing assets.

## Review Focus
- Fresh build must win over stale checked-in iOS assets: packaging regression test.
- Existing device identity persists: existing Android bootstrap tests.
- No AI entitlement, wrong question response, network failure, account switch and active exam: port the existing 11 explanation tests.
- Android runtime mounts the module: add assertion to existing Android instrumentation test.
- Release provenance and signatures: compare packaged assets and verify APK/AAB signatures.

### Task 1: Restore tested explanation UI
- [ ] Run existing baseline tests.
- [ ] Port iOS explanation tests first and reproduce missing question-screen button.
- [ ] Copy the exact shared source files from the verified iOS feature commit.
- [ ] Run full frontend suite and TypeScript check.

### Task 2: Package current source and build
- [ ] Add failing packaging test with distinct fresh-dist and stale-iOS fixtures.
- [ ] Change scripts/prepare-driving-android.mjs to use dist with required-feature checks.
- [ ] Set Android versionName 1.0.1 and versionCode 2; update artifact names and CI branch trigger.
- [ ] Extend existing native smoke test to assert the explanation module is mounted.
- [ ] Run frontend, packaging and Android bootstrap tests; build locally and run Android CI including emulator.
- [ ] Recover existing upload key, sign APK/AAB, verify signatures and save deliverables.

### Task 3: Google Play
- [ ] Inspect current developer account for an existing driving app.
- [ ] Upload the verified new AAB and configure an internal test release.
- [ ] Complete available store setup; stop only at missing reviewer details or required legal consent.
