#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

PID_DIR=".pids"
LOG_DIR=".logs"

mkdir -p "$PID_DIR" "$LOG_DIR"

start_service() {
  name="$1"
  command="$2"
  pid_file="$PID_DIR/$name.pid"
  log_file="$LOG_DIR/$name.log"

  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    echo "$name is already running (pid $(cat "$pid_file"))"
    return 0
  fi

  echo "Starting $name..."
  nohup sh -c "$command" >"$log_file" 2>&1 &
  echo "$!" >"$pid_file"
  echo "$name started (pid $!, log: $log_file)"
}

stop_service() {
  name="$1"
  pid_file="$PID_DIR/$name.pid"

  if [ ! -f "$pid_file" ]; then
    echo "$name is not running"
    return 0
  fi

  pid="$(cat "$pid_file")"
  if kill -0 "$pid" 2>/dev/null; then
    echo "Stopping $name (pid $pid)..."
    kill "$pid" || true
  fi
  rm -f "$pid_file"
}

status_service() {
  name="$1"
  pid_file="$PID_DIR/$name.pid"

  if [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
    echo "$name: running (pid $(cat "$pid_file"))"
  else
    echo "$name: stopped"
  fi
}

usage() {
  cat <<'EOF'
Usage: ./run.sh <command> [args]

Commands:
  start                    Start 3 servers (copilot-api, mcp, fastapi)
  stop                     Stop 3 servers
  status                   Show status of 3 servers
  llm "prompt"             Run LLM + MCP client with prompt
  health                   Call FastAPI health endpoint
  chat "message"           Call FastAPI /chat endpoint
EOF
}

cmd="${1:-}"

if [ -z "$cmd" ]; then
  cmd="start"
fi

start_all() {
  start_service "copilot_api" "cd '$PWD' && npx copilot-api start"
  start_service "mcp_server" "cd '$PWD' && uv run python -m src.mcp.server"
  start_service "fastapi" "cd '$PWD' && uv run uvicorn src.api.app:app --host 127.0.0.1 --port 8000"
}

stop_all() {
  stop_service "fastapi"
  stop_service "mcp_server"
  stop_service "copilot_api"
}

status_all() {
  status_service "copilot_api"
  status_service "mcp_server"
  status_service "fastapi"
}

case "$cmd" in
  start)
    start_all
    status_all
  exit 0
    ;;
  stop)
    stop_all
    ;;
  status)
    status_all
    ;;
  llm)
    prompt="${2:-Lay danh sach users va tom tat}"
    uv run python -m src.clients.llm_mcp_client "$prompt"
    ;;
  health)
    curl -s http://127.0.0.1:8000/health
    echo
    ;;
  chat)
    message="${2:-Xem cho toi nguoi dung Nguyen Van A co trong DB khong}"
    curl -s -X POST http://127.0.0.1:8000/chat \
      -H "Content-Type: application/json" \
      -d "{\"message\":\"$message\"}"
    echo
    ;;
  *)
    echo "Unknown command: $cmd"
    usage
    exit 1
    ;;
esac
