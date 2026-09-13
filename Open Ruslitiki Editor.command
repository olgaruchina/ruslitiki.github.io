#!/bin/zsh
set -eu
cd -- "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1 || [[ ! -d node_modules ]]; then
  print 'The editor needs its one-time setup. Please ask your website maintainer to run npm install in this folder.'
  read -r '?Press Return to close.'
  exit 1
fi
node scripts/studio.mjs &
ruslitiki_editor_pid=$!
trap 'kill "$ruslitiki_editor_pid" 2>/dev/null || true' EXIT INT TERM
sleep 1
if kill -0 "$ruslitiki_editor_pid" 2>/dev/null; then
  open 'http://127.0.0.1:4310'
  wait "$ruslitiki_editor_pid"
fi
