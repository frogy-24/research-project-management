# 🔍 OCR + LLM Information Extraction Bot

Hệ thống trích xuất thông tin thông minh từ ảnh sử dụng **PaddleOCR** (nhận dạng text) và **LLM** (phân tích thông tin).

## ✨ Tính năng

- 📸 Upload ảnh hoặc nhập URL ảnh
- 🔤 OCR với **PaddleOCR** - hỗ trợ tiếng Việt
- 🤖 Phân tích thông tin với **LLM** (GPT-4 via Copilot hoặc OpenAI)
- 🎨 Giao diện web đẹp, dễ sử dụng
- 🚀 FastAPI backend với MCP Server architecture

## 🏗️ Cấu trúc dự án

```
bot/
├── .env                    # API keys (tạo từ .env.example)
├── app.py                  # FastAPI web server
├── pyproject.toml          # Dependencies
│
├── src/
│   ├── server/             # MCP Server - Định nghĩa Tools
│   │   ├── main.py         # FastMCP server
│   │   └── tools/
│   │       └── ocr.py      # OCR tool với PaddleOCR
│   │
│   └── agent/              # AI Agent Logic
│       ├── chatbot.py      # LLM client
│       └── prompts.py      # System prompts
│
├── static/                 # Static files
├── templates/              # HTML templates
└── uploads/                # Uploaded images
```

## 🚀 Cài đặt & Chạy

### Cài nhanh bản GPU (khuyến nghị cho Linux)

Nếu bạn gặp lỗi `uv sync --extra gpu` tự nhảy sang Python 3.12 hoặc báo unsatisfiable, dùng đúng quy trình sau:

```bash
# 1) Cài Python 3.10
uv python install 3.10

# 2) Tạo lại virtual env bằng Python 3.10
uv venv --python 3.10
source .venv/bin/activate

# 3) Sync dependencies GPU
uv lock
uv sync --extra gpu
```

Kiểm tra nhanh backend GPU của Paddle:

```bash
python -c "import paddle; print(paddle.__version__); print(paddle.is_compiled_with_cuda()); print(paddle.device.cuda.device_count()); print(paddle.device.get_device())"
```

Kỳ vọng:
- `True` ở `is_compiled_with_cuda()`
- `cuda.device_count() >= 1`
- device là `gpu:0`

### 1. Cài đặt dependencies

```bash
# Clone repository
git clone <repo-url>
cd bot

# Tạo virtual environment với uv
uv venv
source .venv/bin/activate

# Cài đặt thư viện (đã cài rồi)
uv add fastmcp paddleocr paddlepaddle fastapi uvicorn python-multipart langchain-openai python-dotenv httpx pillow
```

### 2. Cấu hình API Key

```bash
# Copy file .env.example
cp .env.example .env

# Chỉnh sửa .env và thêm API key của bạn
nano .env
```

**Chọn 1 trong 2 options:**

**Option 1: GitHub Copilot API**
```env
GITHUB_COPILOT_API_KEY=your_github_token_here
OPENAI_API_BASE=https://api.github.com/
MODEL_NAME=gpt-4o
```

**Option 2: OpenAI API**
```env
OPENAI_API_KEY=sk-your-openai-key-here
MODEL_NAME=gpt-4o
```

### 3. Chạy ứng dụng

#### Chạy Web Server (FastAPI)
```bash
# Activate virtual environment
source .venv/bin/activate

# Chạy server
python app.py

# Hoặc dùng uvicorn
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Mở trình duyệt: **http://localhost:8000**

#### Chạy MCP Server (Optional - cho AI Agent)
```bash
python -m src.server.main
```

## 📖 Sử dụng

### Web Interface

1. Mở http://localhost:8000
2. Chọn tab **Upload File** hoặc **URL Ảnh**
3. Upload ảnh hoặc nhập URL
4. Click **Phân Tích Ảnh**
5. Xem kết quả:
   - Văn bản OCR
   - Thông tin đã trích xuất (JSON)

### API Endpoints

#### Upload file
```bash
curl -X POST "http://localhost:8000/api/upload" \
  -F "file=@/path/to/image.jpg"
```

#### Process URL
```bash
curl -X POST "http://localhost:8000/api/process-url" \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/image.jpg"}'
```

#### Health check
```bash
curl http://localhost:8000/health
```

## 🛠️ Công nghệ sử dụng

- **PaddleOCR** - OCR engine hỗ trợ 80+ ngôn ngữ
- **FastAPI** - Modern web framework
- **LangChain + OpenAI** - LLM integration
- **FastMCP** - MCP server framework
- **UV** - Package manager cho Python

## 📝 Lưu ý

- Lần đầu chạy, PaddleOCR sẽ tải model (khoảng 10-50MB)
- Cần API key từ GitHub Copilot hoặc OpenAI
- Hỗ trợ các định dạng ảnh: JPG, PNG, JPEG, BMP, TIFF

## 🔧 Development

### Test OCR Tool
```python
from src.server.tools.ocr import extract_text_from_image

result = await extract_text_from_image("path/to/image.jpg")
print(result)
```

### Test LLM Extraction
```python
from src.agent.chatbot import OCRChatbot

bot = OCRChatbot()
result = await bot.extract_information("Sample OCR text here")
print(result)
```

## 📄 License

MIT License

## 👨‍💻 Author

Created with ❤️ using AI Assistant
