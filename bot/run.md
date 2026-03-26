# Run Commands

## 1) Start servers (direct commands, no .sh)

Open 3 terminals and run:

Terminal A (copilot-api):

```bash
cd /home/caoviet/Documents/qlctnckh/bot
npx copilot-api start
```

Terminal B (MCP server):

```bash
cd /home/caoviet/Documents/qlctnckh/bot/src/mcp
uv run server.py
```

Terminal C (FastAPI):

```bash
cd /home/caoviet/Documents/qlctnckh/bot/src/api
uv run app.py
```

## 2) Check ports are listening

```bash
cd /home/caoviet/Documents/qlctnckh/bot
ss -ltnp | grep -E ':4141|:9000|:8000' || true
```

## 3) Quick chat call

```bash
cd /home/caoviet/Documents/qlctnckh/bot
curl -s -X POST http://127.0.0.1:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Xem cho toi nguoi dung Nguyen Van A co trong DB khong"}'
```

## 4) Stop all servers by port

```bash
cd /home/caoviet/Documents/qlctnckh/bot
(fuser -k 4141/tcp || true) && (fuser -k 9000/tcp || true) && (fuser -k 8000/tcp || true)
```
