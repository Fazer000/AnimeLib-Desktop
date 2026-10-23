#!/bin/bash
HERE="$(dirname "$(readlink -f "$0")")"
BIN="$HERE/animelib-desktop-bin"
SANDBOX="$HERE/chrome-sandbox"
RESTRICT_FILE="${ANIMELIB_USERNS_RESTRICT_FILE:-/proc/sys/kernel/apparmor_restrict_unprivileged_userns}"

suid_sandbox() {
  [ -u "$SANDBOX" ] && [ "$(stat -c %u "$SANDBOX" 2>/dev/null)" = "0" ]
}

userns_restricted() {
  [ "$(cat "$RESTRICT_FILE" 2>/dev/null)" = "1" ]
}

if userns_restricted && ! suid_sandbox; then
  exec "$BIN" --no-sandbox "$@"
fi

exec "$BIN" "$@"
