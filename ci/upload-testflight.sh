#!/usr/bin/env bash
set +x
set -euo pipefail
umask 077
for setting in ASC_KEY_ID ASC_ISSUER_ID ASC_PRIVATE_KEY; do
  if [[ -z "${!setting:-}" ]]; then
    printf 'Missing GitHub Actions secret: %s\n' "$setting" >&2
    exit 1
  fi
done
node ci/verify-asc-access.mjs
archive_path="${RUNNER_TEMP:-/tmp}/FuehrerscheinVietDuc.xcarchive"
xcodebuild \
  -project ios/FuehrerscheinVietDuc/FuehrerscheinVietDuc.xcodeproj \
  -scheme FuehrerscheinVietDuc -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$archive_path" \
  -derivedDataPath "${RUNNER_TEMP:-/tmp}/fuehrerschein-device-derived" \
  DEVELOPMENT_TEAM=285CT4P989 CODE_SIGNING_ALLOWED=NO archive
node ci/rest-testflight.mjs "$archive_path"
