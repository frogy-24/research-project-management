# Báo Cáo Tìm Hiểu MCP Server

## Mục Lục
1. [Giới Thiệu MCP](#1-giới-thiệu-mcp)
2. [FastMCP Server Là Gì?](#2-fastmcp-server-là-gì)
3. [Các Thành Phần Chính (Components)](#3-các-thành-phần-chính-components)
4. [Cách Tạo Server](#4-cách-tạo-server)
5. [Chạy Server](#5-chạy-server)
6. [Cấu Hình Server](#6-cấu-hình-server)
7. [Tag-Based Filtering](#7-tag-based-filtering)
8. [Custom Routes](#8-custom-routes)
9. [Ví Dụ Code](#9-ví-dụ-code)
10. [Kết Luận](#10-kết-luận)

---

## 1. Giới Thiệu MCP

**MCP (Model Context Protocol)** là một giao thức truyền thông cho phép các ứng dụng AI kết nối và tương tác với các server bên ngoài. MCP cho phép AI assistants truy cập vào tools, resources và prompts từ các nguồn dữ liệu khác nhau.

### MCP Server hoạt động như thế nào?
```
┌─────────────┐    MCP Protocol    ┌─────────────┐
│   Client    │ ◄───────────────► │   Server    │
│   (AI App)  │   JSON-RPC        │  (Tool/API) │
└─────────────┘                   └─────────────┘
```

---

## 2. FastMCP Server Là Gì?

**FastMCP** là một thư viện Python giúp đơn giản hóa việc tạo MCP servers. Class `FastMCP` là class server chính cho việc xây dựng ứng dụng MCP.

### Tính năng chính của FastMCP:
- **Đơn giản**: Chỉ cần một tên server là có thể bắt đầu
- **Lin hoạt**: Hỗ trợ nhiều loại transport (STDIO, HTTP)
- **Mở rộng**: Có thể thêm tools, resources, prompts một cách dễ dàng
- **Bảo mật**: Hỗ trợ authentication và middleware

---

## 3. Các Thành Phần Chính (Components)

MCP Server cung cấp **3 loại components**:

### 3.1. Tools (Công cụ)
Là các functions mà clients có thể gọi để thực hiện actions hoặc truy cập external systems.

```python
@mcp.tool()
def multiply(a: float, b: float) -> float:
    """Multiplies two numbers together."""
    return a * b
```

### 3.2. Resources (Tài nguyên)
Expose data mà clients có thể đọc - passive data sources thay vì invocable functions.

```python
@mcp.resource("data://config")
def get_config() -> dict:
    return {"theme": "dark", "version": "1.0"}
```

### 3.3. Prompts (Mẫu)
Là các reusable message templates giúp hướng dẫn tương tác với LLM.

```python
@mcp.prompt()
def analyze_data(data_points: list[float]) -> str:
    formatted_data = ", ".join(str(point) for point in data_points)
    return f"Please analyze these data points: {formatted_data}"
```

---

## 4. Cách Tạo Server

### Cách đơn giản nhất:

```python
from fastmcp import FastMCP

# Chỉ cần một tên - mọi thứ có default values
mcp = FastMCP("MyServer")
```

### Với Instructions:

```python
mcp = FastMCP(
    "DataAnalysis",
    instructions="Provides tools for analyzing numerical datasets. Start with get_summary() for an overview.",
)
```

---

## 5. Chạy Server

### Sử dụng `mcp.run()`:

```python
from fastmcp import FastMCP

mcp = FastMCP("MyServer")

@mcp.tool()
def greet(name: str) -> str:
    """Greet a user by name."""
    return f"Hello, {name}!"

if __name__ == "__main__":
    mcp.run()
```

### Transports được hỗ trợ:

| Transport | Mô tả | Use case |
|-----------|-------|----------|
| **STDIO** (default) | Local integration và CLI tools | Development, local apps |
| **HTTP** | Web services với Streamable HTTP protocol | Production web services |
| **SSE** | Legacy web transport | Deprecated |

### Ví dụ chạy với HTTP:

```python
# Run with HTTP transport
mcp.run(transport="http", host="127.0.0.1", port=9000)
```

---

## 6. Cấu Hình Server

### 6.1. Identity (Định danh)

| Parameter | Type | Default | Mô tả |
|-----------|------|---------|-------|
| `name` | str | "FastMCP" | Tên server hiển thị cho clients |
| `instructions` | str \| None | None | Hướng dẫn sử dụng server |
| `version` | str \| None | None | Version của server |
| `website_url` | str \| None | None | URL website thông tin |
| `icons` | list[Icon] \| None | None | Icon representations |

### 6.2. Composition (Thành phần)

| Parameter | Type | Mô tả |
|-----------|------|-------|
| `tools` | list[Tool \| Callable] | Danh sách tools |
| `auth` | OAuthProvider \| TokenVerifier | Authentication provider |
| `middleware` | list[Middleware] | Middleware xử lý messages |
| `providers` | list[Provider] | Dynamic components providers |
| `transforms` | list[Transform] | Server-level transforms |
| `lifespan` | Lifespan | Setup và teardown logic |

### 6.3. Behavior (Hành vi)

| Parameter | Type | Default | Mô tả |
|-----------|------|---------|-------|
| `on_duplicate` | "warn" \| "error" \| "replace" \| "ignore" | "warn" | Xử lý duplicate registrations |
| `strict_input_validation` | bool | False | Validate inputs strictly |
| `mask_error_details` | bool \| None | None | Mask internal error details |
| `list_page_size` | int \| None | None | Max items per page |
| `tasks` | bool | False | Enable background tasks |
| `client_log_level` | LoggingLevel | None | Min log level |
| `dereference_schemas` | bool | True | Dereference $ref pointers |

### 6.4. Handlers and Storage

| Parameter | Type | Mô tả |
|-----------|------|-------|
| `sampling_handler` | SamplingHandler | Handler cho sampling requests |
| `sampling_handler_behavior` | "always" \| "fallback" | Khi nào dùng handler |
| `session_state_store` | AsyncKeyValue | Persistent storage |

---

## 7. Tag-Based Filtering

Tags cho phép bạn phân loại components và selectively expose chúng. Rất hữu ích cho việc tạo different views của server cho different environments hoặc user types.

### Ví dụ:

```python
@mcp.tool(tags={"public", "utility"})
def public_tool() -> str:
    return "This tool is public"

@mcp.tool(tags={"internal", "admin"})
def admin_tool() -> str:
    return "This tool is for admins only"
```

### Filtering Logic:

- **Enable với `only=True`**: Chuyển sang allowlist mode - chỉ components có ít nhất một matching tag được expose
- **Exclude tags**: Loại trừ các components với specific tags

---

## 8. Custom Routes

FastMCP cho phép bạn thêm custom routes cho HTTP-based transports. Điều này cho phép bạn:

- Thêm API endpoints tùy chỉnh
- Xử lý webhook requests
- Tích hợp với existing web frameworks

---

## 9. Ví Dụ Code

### Ví dụ hoàn chỉnh - Data Analysis Server:

```python
from fastmcp import FastMCP
from typing import List

# Initialize server
mcp = FastMCP(
    "DataAnalysis",
    instructions="Provides tools for analyzing numerical datasets. Start with get_summary() for an overview.",
)

# Register a tool
@mcp.tool(tags={"analytics", "utility"})
def calculate_mean(numbers: List[float]) -> float:
    """Calculate the mean of a list of numbers."""
    return sum(numbers) / len(numbers) if numbers else 0

# Register a resource
@mcp.resource("data://summary")
def get_summary() -> dict:
    """Get a summary of available analytics."""
    return {
        "available_metrics": ["mean", "median", "std"],
        "version": "1.0.0"
    }

# Register a prompt
@mcp.prompt()
def analyze_data(data_points: List[float]) -> str:
    formatted = ", ".join(str(p) for p in data_points)
    return f"Please analyze these data points: {formatted}"

# Run the server
if __name__ == "__main__":
    mcp.run()
```

### Deployment với FastMCP CLI:

```bash
# Install MCP
fastmcp install my_server.py

# Run directly
fastmcp run my_server.py --transport http --port 9000
```

---

## 10. Kết Luận

### Ưu điểm của FastMCP:

✅ **Dễ sử dụng**: Chỉ cần vài dòng code để tạo server  
✅ **Linh hoạt**: Hỗ trợ nhiều transports và configurations  
✅ **Mở rộng**: Dễ dàng thêm tools, resources, prompts  
✅ **Type-safe**: Tích hợp tốt với Pydantic validation  
✅ **Production-ready**: Hỗ trợ authentication, middleware, logging  

### Use Cases phổ biến:

1. **AI Agents**: Cung cấp tools cho AI agents để tương tác với external systems
2. **Data Processing**: Xử lý và phân tích dữ liệu
3. **API Gateway**: Tạo unified API layer cho multiple services
4. **Automation**: Tự động hóa các tác vụ thông qua AI

### Tài liệu tham khảo:
- Website: https://gofastmcp.com/servers/server
- GitHub: https://github.com/PrefectHQ/fastmcp

---

*Report được viết ngày: 2026-05-10*  
*Nguồn: https://gofastmcp.com/servers/server*