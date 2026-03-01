#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${PUSHOVER_APP_TOKEN:-}" || -z "${PUSHOVER_USER_KEY:-}" ]]; then
	echo "PUSHOVER_APP_TOKEN と PUSHOVER_USER_KEY を設定してください。" >&2
	exit 1
fi

payload="$(cat)"

summary="$(
	python3 -c '
import json, sys
raw = sys.stdin.read().strip()
default = "Copilot Chat の処理が完了しました。"
if not raw:
    print(default)
    raise SystemExit
try:
    data = json.loads(raw)
except Exception:
    print(default)
    raise SystemExit
event = data.get("event") or data.get("hook_event") or "completed"
status = data.get("status") or "success"
prompt = (
    data.get("prompt")
    or data.get("request", {}).get("prompt")
    or data.get("message")
    or ""
)
if prompt:
    prompt = prompt.replace("\\n", " ").strip()
    if len(prompt) > 120:
        prompt = prompt[:117] + "..."
    print(f"{event} / {status}: {prompt}")
else:
    print(f"{event} / {status}")
' <<<"$payload"
)"

curl --silent --show-error --fail \
	-X POST "https://api.pushover.net/1/messages.json" \
	-F "token=${PUSHOVER_APP_TOKEN}" \
	-F "user=${PUSHOVER_USER_KEY}" \
	-F "title=${PUSHOVER_TITLE:-Copilot Chat}" \
	-F "message=${summary}" \
	${PUSHOVER_DEVICE:+-F "device=${PUSHOVER_DEVICE}"} \
	${PUSHOVER_PRIORITY:+-F "priority=${PUSHOVER_PRIORITY}"} \
	${PUSHOVER_SOUND:+-F "sound=${PUSHOVER_SOUND}"} \
	>/dev/null
