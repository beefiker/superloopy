#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 4 ]]; then
    echo "Usage: $0 EXECUTABLE WIDTH HEIGHT OUTPUT_PATH" >&2
    exit 64
fi

executable=$1
width=$2
height=$3
output_path=$4

if [[ $(uname -s) != "Darwin" ]]; then
    echo "Native window capture is supported on macOS only." >&2
    exit 69
fi

if [[ ! -x ${executable} ]]; then
    echo "Executable is not runnable: ${executable}" >&2
    exit 66
fi

if [[ ! ${width} =~ ^[0-9]+$ || ! ${height} =~ ^[0-9]+$ ]]; then
    echo "Width and height must be integers." >&2
    exit 64
fi

if (( width < 900 || height < 640 )); then
    echo "Window size must be at least 900x640." >&2
    exit 64
fi

if ! command -v osascript >/dev/null 2>&1 ||
   ! command -v screencapture >/dev/null 2>&1; then
    echo "Required macOS capture tools are unavailable." >&2
    exit 69
fi

mkdir -p "$(dirname "${output_path}")"

launch_log=$(mktemp -t northstar-launch.XXXXXX)
ax_error_log=$(mktemp -t northstar-ax.XXXXXX)
app_pid=""

cleanup() {
    if [[ -n ${app_pid} ]] && kill -0 "${app_pid}" 2>/dev/null; then
        kill "${app_pid}" 2>/dev/null || true
        wait "${app_pid}" 2>/dev/null || true
    fi
    rm -f "${launch_log}" "${ax_error_log}"
}
trap cleanup EXIT INT TERM

"${executable}" --window-size "${width}x${height}" >"${launch_log}" 2>&1 &
app_pid=$!

ready_line="NORTHSTAR_READY ${width}x${height}"
ready=false
for _ in {1..150}; do
    if grep -Fq "${ready_line}" "${launch_log}"; then
        ready=true
        break
    fi
    if ! kill -0 "${app_pid}" 2>/dev/null; then
        echo "Northstar exited before rendering:" >&2
        sed 's/^/  /' "${launch_log}" >&2
        exit 70
    fi
    sleep 0.1
done

if [[ ${ready} != true ]]; then
    echo "Timed out waiting for ${ready_line}." >&2
    sed 's/^/  /' "${launch_log}" >&2
    exit 70
fi

window_id=""
if window_id=$(osascript - "${app_pid}" 2>"${ax_error_log}" <<'APPLESCRIPT'
on run argv
    set targetPid to item 1 of argv as integer
    tell application "System Events"
        set targetProcess to first application process whose unix id is targetPid
        repeat with attempt from 1 to 50
            if exists window 1 of targetProcess then
                try
                    return value of attribute "AXWindowNumber" of window 1 of targetProcess as text
                end try
            end if
            delay 0.1
        end repeat
    end tell
    error "No AX window number was available for Northstar."
end run
APPLESCRIPT
); then
    window_id=${window_id//$'\r'/}
fi

if [[ ${window_id} =~ ^[0-9]+$ ]]; then
    screencapture -x -l "${window_id}" "${output_path}"
    echo "NORTHSTAR_CAPTURE_METHOD=ax-window-id"
else
    echo "Accessibility window lookup was unavailable." >&2
    if [[ -s ${ax_error_log} ]]; then
        sed 's/^/  /' "${ax_error_log}" >&2
    fi
    echo "Select the Northstar window to complete the native capture." >&2
    screencapture -w "${output_path}"
    echo "NORTHSTAR_CAPTURE_METHOD=interactive-window-selection"
fi

if [[ ! -s ${output_path} ]]; then
    echo "Native screenshot was not created: ${output_path}" >&2
    exit 70
fi

echo "NORTHSTAR_CAPTURE_PATH=${output_path}"
