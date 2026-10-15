#!/usr/bin/env bash
set -euo pipefail
# Run only on a trusted GitHub macOS runner. Never enable shell tracing here.
for setting in ASC_KEY_ID ASC_ISSUER_ID ASC_PRIVATE_KEY; do
  if [[ -z "${!setting:-}" ]]; then
    printf 'Missing GitHub Actions secret: %s\n' "$setting" >&2
    exit 1
  fi
done
[[ "$ASC_KEY_ID" =~ ^[A-Za-z0-9]+$ ]] || { printf 'Invalid ASC_KEY_ID format\n' >&2; exit 1; }
node ci/verify-asc-access.mjs
command -v xcodebuild >/dev/null
signing_dir="$(mktemp -d "${RUNNER_TEMP:-/tmp}/fuehrerschein-signing.XXXXXX")"
trap 'rm -rf "$signing_dir"' EXIT
umask 077
printf '%s\n' "$ASC_PRIVATE_KEY" > "$signing_dir/AuthKey_${ASC_KEY_ID}.p8"
openssl pkey -in "$signing_dir/AuthKey_${ASC_KEY_ID}.p8" -noout >/dev/null
# Keep the existing local ExportOptions intact; cloud signing must not pin an old local certificate.
python3 - "$signing_dir/ExportOptions.plist" <<'PY'
import plistlib,sys
with open(sys.argv[1], 'wb') as f:
    plistlib.dump({
        'method': 'app-store-connect', 'destination': 'upload',
        'signingStyle': 'automatic', 'teamID': '285CT4P989',
        'manageAppVersionAndBuildNumber': False, 'uploadSymbols': True,
    }, f)
PY
archive_path="${RUNNER_TEMP:-/tmp}/FuehrerscheinVietDuc.xcarchive"
# Authentication is used by Xcode only; private key is never printed or uploaded as an artifact.
auth_flags=(-allowProvisioningUpdates -authenticationKeyPath "$signing_dir/AuthKey_${ASC_KEY_ID}.p8" -authenticationKeyID "$ASC_KEY_ID" -authenticationKeyIssuerID "$ASC_ISSUER_ID")
xcodebuild \
  -project ios/FuehrerscheinVietDuc/FuehrerscheinVietDuc.xcodeproj \
  -scheme FuehrerscheinVietDuc -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$archive_path" \
  -derivedDataPath "${RUNNER_TEMP:-/tmp}/fuehrerschein-device-derived" \
  "${auth_flags[@]}" DEVELOPMENT_TEAM=285CT4P989 CODE_SIGN_STYLE=Automatic archive
xcodebuild -exportArchive -archivePath "$archive_path" \
  -exportPath "${RUNNER_TEMP:-/tmp}/fuehrerschein-export" \
  -exportOptionsPlist "$signing_dir/ExportOptions.plist" "${auth_flags[@]}"
printf 'Archive/export upload command completed; verify Apple processing and TestFlight build status in App Store Connect.\n'
