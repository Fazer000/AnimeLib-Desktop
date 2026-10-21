#!/bin/bash
# Запуск на Linux: Ubuntu 24.04+ запрещает обычным программам песочницу
# через пространства имён. Если запрет есть, а chrome-sandbox не SUID
# (всегда так в AppImage), Chromium падает при старте — тогда без песочницы
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
