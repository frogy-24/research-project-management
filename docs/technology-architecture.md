# KIẾN TRÚC CÔNG NGHỆ / TECH STACK HỆ THỐNG URMS

## 1. Tổng quan tech stack

Hệ thống URMS (University Research Management System) được xây dựng theo mô hình web application hiện đại, sử dụng hệ sinh thái JavaScript/TypeScript làm nền tảng chính. Tech stack được lựa chọn nhằm đáp ứng các yêu cầu:

- Phát triển nhanh giao diện và chức năng web.
- Có khả năng mở rộng khi nghiệp vụ tăng.
- Đảm bảo type safety trong quá trình phát triển.
- Dễ kết nối cơ sở dữ liệu.
- Dễ triển khai bằng container.
- Hỗ trợ kiểm soát lỗi và vận hành production.

Tech stack chính:

```text
Next.js + React + TypeScript
        │
        ▼
TanStack Query + Axios + Zod
        │
        ▼
FastAPI AI Service
        │
        ├── LLM / OpenAI-compatible API
        ├── MCP / FastMCP
        ├── OCR / vLLM / PyMuPDF
        ├── RabbitMQ / Background Workers
        └── Vector Search / Qdrant
        │
        ▼
Prisma ORM
        │
        ▼
PostgreSQL
        │
        ▼
Docker + Nginx + Sentry
```

---

## 2. Bảng công nghệ sử dụng

| Lớp công nghệ | Công nghệ | Mục đích sử dụng |
|---|---|---|
| Ngôn ngữ chính | TypeScript | Tăng type safety, giảm lỗi khi phát triển |
| Framework web | Next.js | Xây dựng ứng dụng web full-stack |
| UI library | React | Xây dựng giao diện theo component |
| Styling | Tailwind CSS | Thiết kế giao diện nhanh, responsive |
| UI components | Shadcn/UI style components | Dùng button, dialog, table, form, input... |
| Data fetching | TanStack Query | Quản lý cache, loading, refetch dữ liệu |
| HTTP client | Axios | Gửi request từ client |
| Validation | Zod | Kiểm tra dữ liệu form và response |
| AI backend | FastAPI | Cung cấp service AI, OCR, MCP bridge |
| Python runtime | Python 3.12 | Chạy bot service và AI service |
| LLM client | OpenAI SDK | Gọi model LLM qua OpenAI-compatible API |
| LLM serving | vLLM | Chạy/inference model LLM hoặc OCR model cục bộ |
| MCP server | FastMCP, MCP SDK | Cung cấp tools/resources cho LLM gọi dữ liệu hệ thống |
| OCR | PyMuPDF, OCR model, python-docx/docx2pdf | Trích xuất văn bản từ PDF, ảnh, DOCX |
| Message broker | RabbitMQ, aio-pika | Đưa tác vụ tốn thời gian vào queue và xử lý nền |
| Background workers | Python asyncio workers | Xử lý OCR, LLM evaluation, sinh báo cáo bất đồng bộ |
| Vector database | Qdrant | Lưu embedding và tìm kiếm ngữ nghĩa |
| Embedding | sentence-transformers | Sinh vector embedding cho tài liệu/văn bản |
| ORM | Prisma | Truy vấn database bằng TypeScript |
| Database | PostgreSQL | Lưu trữ dữ liệu hệ thống |
| Package manager | pnpm | Quản lý thư viện |
| Python package manager | uv | Quản lý môi trường và dependency cho bot service |
| Container | Docker | Đóng gói ứng dụng |
| Orchestration local | Docker Compose | Chạy nhiều service khi phát triển/triển khai |
| Reverse proxy | Nginx | Điều phối request khi production |
| Monitoring | Sentry | Theo dõi lỗi client/server |

---

## 3. Ngôn ngữ lập trình: TypeScript

TypeScript được sử dụng làm ngôn ngữ chính cho toàn bộ ứng dụng.

Vai trò:

- Định nghĩa kiểu dữ liệu rõ ràng.
- Hạn chế lỗi runtime do sai kiểu dữ liệu.
- Hỗ trợ autocomplete và kiểm tra lỗi trong IDE.
- Kết hợp tốt với React, Next.js, Prisma và Zod.

Lý do chọn TypeScript:

- Dự án có nhiều loại dữ liệu: người dùng, đề tài, hội đồng, báo cáo, giải ngân.
- Các nghiệp vụ có nhiều trạng thái và vai trò.
- TypeScript giúp kiểm soát dữ liệu giữa frontend, backend và database tốt hơn JavaScript thuần.

Ví dụ lợi ích:

```text
Project, User, Council, CouncilEvaluation
        │
        ▼
Có type rõ ràng
        │
        ▼
Giảm lỗi truyền sai dữ liệu giữa các màn hình
```

---

## 4. Framework chính: Next.js

Next.js là framework chính để xây dựng hệ thống.

Vai trò:

- Xây dựng giao diện web.
- Quản lý routing bằng App Router.
- Hỗ trợ server component và client component.
- Hỗ trợ API route trong cùng dự án.
- Hỗ trợ build production tối ưu.

Lý do chọn Next.js:

- Phù hợp xây dựng hệ thống quản lý dạng dashboard.
- Routing theo thư mục dễ tổ chức theo vai trò người dùng.
- Có thể kết hợp frontend và backend trong cùng codebase.
- Dễ triển khai trên nhiều môi trường.

Các thư mục liên quan:

```text
app/
├── admin/
├── dean/
├── lecturer/
├── student/
├── council/
├── leader/
└── api/
```

---

## 5. UI library: React

React được dùng để xây dựng giao diện theo component.

Vai trò:

- Tạo các thành phần giao diện tái sử dụng.
- Quản lý trạng thái trong component.
- Kết hợp với hook để xử lý dữ liệu.
- Tách giao diện theo từng domain nghiệp vụ.

Cách tổ chức component:

```text
components/
├── admin/
├── dean/
├── lecturer/
├── student/
├── dashboard/
├── projects/
├── layout/
└── ui/
```

Lý do chọn React:

- Phù hợp xây dựng dashboard nhiều màn hình.
- Component dễ tái sử dụng.
- Cộng đồng lớn, nhiều thư viện hỗ trợ.
- Tương thích trực tiếp với Next.js.

---

## 6. Styling: Tailwind CSS

Tailwind CSS được sử dụng để thiết kế giao diện.

Vai trò:

- Tạo layout nhanh.
- Hỗ trợ responsive design.
- Dễ thống nhất spacing, màu sắc, font size.
- Giảm việc viết CSS thủ công.

Lý do chọn Tailwind CSS:

- Phù hợp giao diện quản trị có nhiều bảng, form, card, dialog.
- Dễ chỉnh sửa giao diện trực tiếp trong component.
- Giúp tốc độ phát triển UI nhanh hơn.

Ví dụ nhóm UI thường dùng:

- Card.
- Table.
- Dialog.
- Button.
- Input.
- Form.
- Badge.
- Sidebar.

---

## 7. Component nền tảng: UI Components

Hệ thống sử dụng các component UI tái sử dụng trong thư mục `components/ui`.

Vai trò:

- Chuẩn hóa giao diện.
- Giảm lặp code.
- Tăng tính nhất quán giữa các màn hình.
- Dễ bảo trì khi thay đổi style.

Ví dụ component:

```text
components/ui/
├── button
├── input
├── table
├── dialog
├── form
├── badge
└── textarea
```

Lợi ích:

- Màn hình admin, dean, lecturer, student dùng chung style.
- Form nhập liệu có cấu trúc thống nhất.
- Dialog xác nhận, bảng dữ liệu, nút thao tác dùng cùng chuẩn.

---

## 8. Quản lý dữ liệu client: TanStack Query

TanStack Query được dùng để quản lý dữ liệu bất đồng bộ phía client.

Vai trò:

- Quản lý loading state.
- Quản lý error state.
- Cache dữ liệu.
- Refetch dữ liệu sau khi thêm/sửa/xóa.
- Giảm số lần gọi dữ liệu không cần thiết.

Lý do chọn TanStack Query:

- Hệ thống có nhiều danh sách dữ liệu: đề tài, người dùng, hội đồng, phòng, ngành, lớp.
- Cần cập nhật giao diện sau thao tác nghiệp vụ.
- Cần quản lý trạng thái tải dữ liệu rõ ràng.

Mô hình sử dụng:

```text
Component
   │
   ▼
Custom Hook
   │
   ▼
TanStack Query
   │
   ▼
API Client
```

Ví dụ hook:

- `useProjects.ts`
- `useUsers.ts`
- `useCouncils.ts`
- `useDisbursements.ts`
- `useLecturerCouncils.ts`

---

## 9. HTTP client: Axios

Axios được dùng để gửi request từ client đến server.

Vai trò:

- Tạo API client dùng chung.
- Cấu hình base URL.
- Xử lý lỗi request/response.
- Dễ tái sử dụng trong các file `api/*.ts`.

File liên quan:

```text
lib/axios.ts
api/projects.ts
api/users.ts
api/councils.ts
api/disbursements.ts
api/auth.ts
```

Lý do chọn Axios:

- Cú pháp ngắn gọn.
- Hỗ trợ interceptor.
- Dễ tổ chức API client theo domain.
- Phù hợp khi kết hợp với TanStack Query.

---

## 10. Validation: Zod

Zod được dùng để xác thực dữ liệu.

Vai trò:

- Kiểm tra dữ liệu form.
- Kiểm tra dữ liệu trả về từ API.
- Sinh TypeScript type từ schema.
- Chuẩn hóa dữ liệu giữa nhiều lớp.

File liên quan:

```text
types/
├── project.schema.ts
├── user.schema.ts
├── council.schema.ts
├── council-evaluation.schema.ts
├── disbursement.schema.ts
├── organization.schema.ts
└── api.schema.ts
```

Lý do chọn Zod:

- Tương thích tốt với TypeScript.
- Dễ mô tả object phức tạp.
- Giúp form validation rõ ràng.
- Giảm rủi ro dữ liệu sai cấu trúc.

---

## 11. AI backend: FastAPI

FastAPI được dùng cho phần bot/AI service riêng trong thư mục `bot/`.

Vai trò:

- Cung cấp API cho các chức năng AI.
- Làm bridge giữa ứng dụng web và MCP server.
- Cung cấp endpoint chat sử dụng LLM + MCP tools.
- Cung cấp endpoint OCR cho PDF và ảnh.
- Cung cấp xử lý DOCX/PDF, Excel và báo cáo tự động.

File liên quan:

```text
bot/src/api/app.py
bot/src/api/routes/ocr.py
bot/src/api/routes/docx_to_pdf.py
bot/src/api/routes/file_processor.py
bot/src/api/routes/councils.py
```

Lệnh chạy:

```bash
uv run uvicorn src.api.app:app --reload --port 8000
```

Mô hình:

```text
Next.js App
   │
   ▼
FastAPI AI Service
   │
   ├── LLM Service
   ├── MCP Client
   ├── OCR Service
   └── File Processing Service
```

---

## 12. LLM: OpenAI SDK, vLLM, OpenAI-compatible API

Hệ thống dùng LLM để hỗ trợ các nghiệp vụ thông minh.

Vai trò:

- Chat với dữ liệu hệ thống.
- Sinh SQL từ câu hỏi tiếng Việt.
- Tạo báo cáo thống kê markdown.
- Tạo hội đồng nhanh từ prompt.
- Đánh giá/đối chiếu hồ sơ tự động.
- Phân tích file Excel và sinh truy vấn lấy dữ liệu.

Thư viện/công nghệ:

- `openai`: client gọi model qua OpenAI-compatible API.
- `vllm`: phục vụ model cục bộ khi chạy trên môi trường phù hợp.
- `sentence-transformers`: sinh embedding.
- `qdrant-client`: lưu và tìm kiếm vector.

File liên quan:

```text
bot/src/services/llm_service.py
bot/src/clients/llm_mcp_client.py
bot/src/services/council_service.py
bot/src/services/file_data_filler_service.py
bot/src/clients/embedding_client.py
bot/src/clients/qdrant_client.py
```

Biến môi trường:

```text
COPILOT_BASE_URL=http://localhost:4141/
LLM_MODEL=gpt-5-mini
BASE_URL=<OpenAI-compatible endpoint>
QDRANT_URL=http://127.0.0.1:6333
```

Luồng LLM + tools:

```text
User prompt
   │
   ▼
FastAPI / LLMService
   │
   ▼
OpenAI-compatible LLM
   │
   ├── Trả lời trực tiếp
   └── Gọi MCP tool khi cần dữ liệu
```

---

## 13. MCP: FastMCP và MCP SDK

MCP (Model Context Protocol) được dùng để cho LLM truy cập tools và resources của hệ thống theo chuẩn chung.

Vai trò:

- Cung cấp tools cho LLM gọi dữ liệu.
- Cung cấp resource schema database.
- Cho phép LLM sinh SQL và truy vấn dữ liệu có kiểm soát.
- Tách phần AI reasoning khỏi phần truy cập dữ liệu.

Công nghệ:

- `fastmcp`: tạo MCP server.
- `mcp`: MCP client/session SDK.
- `streamable_http_client`: kết nối MCP qua HTTP transport.

File liên quan:

```text
bot/src/mcp/server.py
bot/src/api/mcp_client.py
bot/src/clients/llm_mcp_client.py
docs/mcp-server-report.md
```

Lệnh chạy MCP server:

```bash
uv run python -m src.mcp.server
```

Luồng MCP:

```text
LLM
   │ yêu cầu tool call
   ▼
MCP Client
   │ HTTP /mcp
   ▼
FastMCP Server
   │
   ├── Tools
   ├── Resources
   └── Database access
```

Ví dụ endpoint bridge:

```text
POST http://127.0.0.1:8000/mcp/call
POST http://127.0.0.1:8000/chat
```

---

## 14. OCR và xử lý tài liệu

OCR được dùng để trích xuất nội dung từ file phục vụ kiểm tra hồ sơ và tự động hóa nghiệp vụ.

Vai trò:

- OCR file PDF.
- OCR hình ảnh.
- Trích xuất văn bản hồ sơ đăng ký.
- Đối chiếu nội dung OCR với dữ liệu đăng ký.
- Hỗ trợ phê duyệt tự động bằng LLM.
- Chuyển đổi DOCX sang PDF khi cần.

Công nghệ:

- `PyMuPDF`: đọc/xử lý PDF.
- `python-docx`: xử lý file DOCX.
- `docx2pdf`: chuyển DOCX sang PDF.
- `python-multipart`: nhận file upload trong FastAPI.
- `vLLM`/OCR model: xử lý nhận dạng văn bản bằng model AI.
- `OpenAI SDK`: gọi OCR model qua OpenAI-compatible API.

File liên quan:

```text
bot/src/api/routes/ocr.py
bot/src/services/ocr_service.py
bot/src/clients/ocr_client.py
bot/src/api/routes/docx_to_pdf.py
bot/src/services/docx_to_pdf_service.py
bot/src/workers/auto_approval_consumer.py
```

Endpoint OCR:

```text
POST /ocr/file
POST /ocr/image
POST /convert-docx-to-pdf/
```

Luồng OCR:

```text
Upload PDF/Image/DOCX
   │
   ▼
FastAPI
   │
   ▼
OCR/File Service
   │
   ├── PyMuPDF / DOCX processing
   ├── OCR model / vLLM
   └── LLM evaluation
   │
   ▼
Text + structured result
```

---

## 15. Python runtime và uv

Phần bot/AI service dùng Python 3.12 và `uv` để quản lý môi trường.

File liên quan:

```text
bot/pyproject.toml
bot/uv.lock
bot/src/
```

Lệnh cài đặt:

```bash
uv venv .venv
uv sync
```

Dependency chính:

```text
fastapi
uvicorn
fastmcp
mcp
openai
vllm
pymupdf
python-docx
docx2pdf
qdrant-client
sentence-transformers
asyncpg
aio-pika
sentry-sdk
```

---

## 16. RabbitMQ và background workers

RabbitMQ được dùng để xử lý các tác vụ tốn thời gian theo cơ chế hàng đợi, tránh làm request HTTP chờ quá lâu.

Vai trò:

- Đưa job vào queue khi người dùng yêu cầu tác vụ nặng.
- Xử lý nền các tác vụ dùng LLM, OCR, sinh báo cáo.
- Giảm timeout cho API request.
- Cho phép giới hạn số job xử lý đồng thời bằng `prefetch`.
- Hỗ trợ RPC pattern khi API cần chờ kết quả trả về.

Công nghệ:

- `RabbitMQ`: message broker.
- `aio-pika`: client RabbitMQ bất đồng bộ cho Python.
- Python `asyncio`: chạy consumer/worker.

File liên quan:

```text
bot/src/clients/rabbitmq_client.py
bot/src/workers/auto_approval_consumer.py
bot/src/workers/report_generation_consumer.py
bot/src/workers/auto_approval_worker.py
bot/src/api/routes/dean_auto_approval.py
bot/src/api/app.py
```

Queue chính:

```text
AUTO_APPROVAL_QUEUE=auto_approval_queue
REPORT_QUEUE=report_generation_queue
```

Biến môi trường:

```text
RABBITMQ_URL=amqp://admin:admin123@localhost:5672/
AUTO_APPROVAL_PREFETCH=1
REPORT_PREFETCH=1
```

Endpoint publish job:

```text
POST /queues/publish
```

Luồng xử lý bất đồng bộ:

```text
User request
   │
   ▼
FastAPI
   │ publish message
   ▼
RabbitMQ Queue
   │ consume
   ▼
Background Worker
   │
   ├── OCR hồ sơ
   ├── LLM đánh giá tự động
   ├── LLM sinh báo cáo
   └── Cập nhật database / gửi reply
```

Các tác vụ phù hợp đưa vào RabbitMQ:

- Phê duyệt/đánh giá đề tài tự động bằng OCR + LLM.
- Sinh báo cáo bằng LLM.
- Xử lý file lớn.
- Tác vụ cần gọi nhiều API/model bên ngoài.
- Tác vụ có thể chạy nền và trả trạng thái `QUEUED`.

---

## 17. ORM: Prisma

Prisma được dùng làm ORM để kết nối ứng dụng với cơ sở dữ liệu.

Vai trò:

- Định nghĩa model dữ liệu.
- Sinh Prisma Client.
- Truy vấn dữ liệu bằng TypeScript.
- Quản lý migration.
- Hỗ trợ quan hệ giữa các bảng.

File liên quan:

```text
prisma/
├── schema.prisma
├── migrations/
├── seed.ts
├── seed-org.ts
└── seed-templates.ts

lib/prisma.ts
```

Lý do chọn Prisma:

- Type-safe query.
- Dễ làm việc với database nhiều bảng.
- Dễ maintain schema.
- Dễ seed dữ liệu mẫu.

Vai trò trong hệ thống:

```text
Next.js
   │
   ▼
Prisma Client
   │
   ▼
Database
```

---

## 18. Database: SQL Server / PostgreSQL

Database dùng để lưu trữ dữ liệu nghiệp vụ của hệ thống.

Vai trò:

- Lưu thông tin người dùng.
- Lưu đề tài nghiên cứu.
- Lưu đợt đăng ký.
- Lưu báo cáo tiến độ.
- Lưu hội đồng và đánh giá.
- Lưu giải ngân, thông báo, lịch họp.

Hệ thống có tài liệu PostgreSQL trong thư mục `database/`, đồng thời cấu hình môi trường có thể dùng PostgreSQL qua biến `DATABASE_URL`.

Nhóm dữ liệu chính:

```text
Organization & User
Project & Report
Call Round
Council & Evaluation
Finance & Notification
```

Lý do chọn database quan hệ:

- Dữ liệu có nhiều quan hệ khóa ngoại.
- Cần đảm bảo ràng buộc dữ liệu.
- Phù hợp với nghiệp vụ quản lý trường học.
- Dễ truy vấn báo cáo và thống kê.

---

## 19. Package manager: pnpm

pnpm được dùng để quản lý dependency.

Vai trò:

- Cài đặt thư viện.
- Chạy script phát triển.
- Quản lý lockfile.
- Tối ưu dung lượng node_modules.

File liên quan:

```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
```

Lệnh thường dùng:

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm prisma generate
```

Lý do chọn pnpm:

- Cài package nhanh.
- Tiết kiệm dung lượng.
- Lockfile ổn định.
- Phù hợp dự án TypeScript/Next.js.

---

## 20. Container hóa: Docker

Docker được dùng để đóng gói ứng dụng.

Vai trò:

- Đóng gói môi trường chạy.
- Giảm khác biệt giữa máy dev và server.
- Dễ triển khai production.
- Kết hợp được với database và reverse proxy.

File liên quan:

```text
Dockerfile
docker-compose.yaml
docker-compose.prod.yml
```

Lý do chọn Docker:

- Dễ tái lập môi trường.
- Dễ deploy.
- Hạn chế lỗi “chạy được trên máy tôi”.
- Phù hợp triển khai nhiều service.

---

## 21. Reverse proxy: Nginx

Nginx được dùng trong hạ tầng triển khai.

Vai trò:

- Làm reverse proxy cho ứng dụng Next.js.
- Điều phối request từ bên ngoài vào container.
- Hỗ trợ cấu hình domain, HTTPS, caching nếu cần.
- Tách lớp truy cập bên ngoài khỏi ứng dụng.

File liên quan:

```text
infra/nginx/
```

Mô hình triển khai:

```text
Internet
   │
   ▼
Nginx
   │
   ▼
Next.js Container
   │
   ▼
Database
```

---

## 22. Monitoring: Sentry

Sentry được dùng để theo dõi lỗi.

Vai trò:

- Ghi nhận lỗi frontend.
- Ghi nhận lỗi server.
- Hỗ trợ debug production.
- Theo dõi lỗi runtime theo môi trường.

File liên quan:

```text
sentry.client.config.ts
sentry.server.config.ts
sentry.edge.config.ts
instrumentation-client.ts
```

Lý do chọn Sentry:

- Dễ tích hợp với Next.js.
- Theo dõi được lỗi client và server.
- Phù hợp khi hệ thống đưa vào vận hành thực tế.

---

## 23. Mối liên hệ giữa các công nghệ

```text
React Components
   │ dùng
   ▼
Tailwind CSS + UI Components
   │ lấy dữ liệu qua
   ▼
TanStack Query
   │ gọi
   ▼
Axios API Client
   │ nhận/validate dữ liệu bằng
   ▼
Zod Schemas
   │
   ▼
FastAPI AI Service
   │
   ├── LLM / OpenAI-compatible API
   ├── MCP / FastMCP tools
   ├── OCR / vLLM / PyMuPDF
   ├── RabbitMQ / Background Workers
   └── Vector Search / Qdrant
   │
   ▼
Prisma ORM + PostgreSQL
```

Ở tầng triển khai:

```text
Docker đóng gói ứng dụng
Nginx điều phối request
Sentry theo dõi lỗi
pnpm quản lý dependency
uv quản lý dependency Python bot service
RabbitMQ chạy queue cho tác vụ nền
```

---

## 24. Lý do tech stack phù hợp với URMS

Tech stack này phù hợp vì URMS là hệ thống quản lý nghiệp vụ có nhiều màn hình, nhiều bảng dữ liệu và nhiều vai trò người dùng.

Điểm phù hợp:

- **Next.js + React:** phù hợp dashboard quản trị và trang nghiệp vụ.
- **TypeScript:** phù hợp hệ thống có nhiều entity và trạng thái.
- **Prisma:** phù hợp database quan hệ nhiều bảng.
- **Zod:** phù hợp validate form đăng ký, duyệt, đánh giá, giải ngân.
- **TanStack Query:** phù hợp màn hình danh sách và thao tác CRUD.
- **Tailwind CSS:** phù hợp phát triển UI nhanh.
- **FastAPI:** phù hợp tách AI service riêng, nhẹ và nhanh.
- **LLM + MCP:** phù hợp hỏi đáp dữ liệu, sinh SQL, báo cáo, tạo hội đồng.
- **OCR + vLLM + PyMuPDF:** phù hợp xử lý hồ sơ PDF, ảnh, DOCX.
- **RabbitMQ + workers:** phù hợp tác vụ tốn thời gian như OCR, LLM evaluation, sinh báo cáo.
- **Qdrant + sentence-transformers:** phù hợp tìm kiếm ngữ nghĩa và lưu embedding.
- **Docker:** phù hợp đóng gói và triển khai.
- **Sentry:** phù hợp theo dõi lỗi khi vận hành.

---

## 25. Kết luận

Kiến trúc công nghệ của URMS sử dụng stack chính gồm **Next.js, React, TypeScript, Tailwind CSS, TanStack Query, Axios, Zod, FastAPI, Python 3.12, OpenAI SDK, vLLM, FastMCP/MCP SDK, OCR, PyMuPDF, RabbitMQ, aio-pika, background workers, Qdrant, sentence-transformers, Prisma, SQL Server/PostgreSQL, pnpm, uv, Docker, Nginx và Sentry**.

Đây là tech stack phù hợp cho hệ thống quản lý nghiên cứu khoa học vì vừa hỗ trợ phát triển web nhanh, vừa bổ sung lớp AI service cho LLM, MCP, OCR, phân tích tài liệu, sinh báo cáo, tự động hóa nghiệp vụ và xử lý nền các tác vụ tốn thời gian bằng RabbitMQ.