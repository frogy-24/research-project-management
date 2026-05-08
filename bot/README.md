# Bot Project

## Cau truc folder

```
src/
  api/
    app.py
  clients/
    llm_mcp_client.py
  config/
    settings.py
  db/
    client.py
  mcp/
    server.py
  repositories/
    user_repository.py
```

## Env

File .env:

```
DATABASE_URL=postgresql://postgres:example@localhost:5432/postgres?schema=public
COPILOT_BASE_URL=http://localhost:4141/
LLM_MODEL=gpt-5-mini
```

## Cai dat

```
uv venv .venv
uv sync
```

## Chay nhanh

Chay MCP server:

```
uv run python -m src.mcp.server
```

Chay LLM client + MCP:

```
uv run python -m src.clients.llm_mcp_client "Lay danh sach users va tom tat"
```

## FastAPI

Run API:

```
uv run uvicorn src.api.app:app --reload --port 8000
```

Health:

```
curl http://127.0.0.1:8000/health
```

Call MCP tool:

```
curl -X POST http://127.0.0.1:8000/mcp/call \
  -H "Content-Type: application/json" \
  -d '{"tool":"healthcheck","arguments":{}}'
```

Chat endpoint:

```
curl -X POST http://127.0.0.1:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Xem cho toi nguoi dung Nguyen Van A co trong DB khong"}'
```
