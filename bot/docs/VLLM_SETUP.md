# VLLM OCR Server Setup Guide

## Tổng quan

Dịch vụ OCR trong bot sử dụng VLLM (Very Large Language Model) server để xử lý nhận dạng ký tự quang học (OCR) cho cả ảnh và file PDF. VLLM server cần được chạy riêng biệt trước khi sử dụng chức năng OCR.

## Yêu cầu hệ thống

- Python 3.8+
- CUDA-capable GPU (khuyến nghị cho hiệu suất tốt)
- RAM: Tối thiểu 8GB (khuyến nghị 16GB+)
- Disk space: ~10-20GB cho model

## Cài đặt VLLM

### Bước 1: Cài đặt VLLM package

```bash
# Với GPU (khuyến nghị)
pip install vllm

# Hoặc với CPU only (chậm hơn)
pip install vllm-cpu-only
```

### Bước 2: Chọn model OCR

Các model được khuyến nghị:

1. **Qwen2-VL-7B-Instruct** (khuyến nghị - cân bằng giữa chất lượng và tốc độ)
   - Size: ~7B parameters
   - Hỗ trợ tiếng Việt tốt
   - Yêu cầu: ~14GB VRAM

2. **Qwen2-VL-2B-Instruct** (nhẹ hơn)
   - Size: ~2B parameters
   - Phù hợp cho GPU nhỏ
   - Yêu cầu: ~4GB VRAM

3. **Qwen/Qwen3.5-0.8B** (rất nhẹ - mặc định)
   - Size: ~0.8B parameters
   - Chạy được trên CPU
   - Yêu cầu: ~2GB RAM

## Chạy VLLM Server

### Option 1: Chạy với GPU (khuyến nghị)

```bash
# Với Qwen2-VL-7B-Instruct
vllm serve Qwen/Qwen2-VL-7B-Instruct \
  --host 127.0.0.1 \
  --port 8001 \
  --dtype auto \
  --max-model-len 4096

# Với Qwen2-VL-2B-Instruct (nhẹ hơn)
vllm serve Qwen/Qwen2-VL-2B-Instruct \
  --host 127.0.0.1 \
  --port 8001 \
  --dtype auto \
  --max-model-len 4096
```

### Option 2: Chạy với CPU (chậm hơn)

```bash
vllm serve Qwen/Qwen3.5-0.8B \
  --host 127.0.0.1 \
  --port 8001 \
  --dtype float32 \
  --max-model-len 2048 \
  --device cpu
```

### Option 3: Chạy với Docker

```bash
# Tạo Dockerfile
cat > Dockerfile.vllm << 'EOF'
FROM vllm/vllm-openai:latest

ENV MODEL_NAME=Qwen/Qwen2-VL-7B-Instruct
ENV HOST=0.0.0.0
ENV PORT=8001

CMD ["--host", "${HOST}", "--port", "${PORT}", "--model", "${MODEL_NAME}"]
EOF

# Build và chạy
docker build -f Dockerfile.vllm -t vllm-ocr .
docker run -d --gpus all -p 8001:8001 vllm-ocr
```

## Cấu hình Bot

Sau khi VLLM server đã chạy, cấu hình trong file `bot/.env`:

```env
# VLLM OCR Configuration
VLLM_BASE_URL=http://127.0.0.1:8001/v1
VLLM_API_KEY=EMPTY
VLLM_OCR_MODEL=Qwen/Qwen2-VL-7B-Instruct
OCR_TEMPERATURE=0
OCR_MAX_TOKENS=2048
OCR_MAX_PDF_PAGES=5
OCR_PDF_RENDER_ZOOM=2.0
```

### Giải thích các tham số:

- **VLLM_BASE_URL**: URL của VLLM server (mặc định: http://127.0.0.1:8001/v1)
- **VLLM_API_KEY**: API key (dùng "EMPTY" cho local server không cần xác thực)
- **VLLM_OCR_MODEL**: Tên model sử dụng (phải khớp với model đang chạy trên VLLM server)
- **OCR_TEMPERATURE**: Độ ngẫu nhiên (0 = deterministic, khuyến nghị cho OCR)
- **OCR_MAX_TOKENS**: Số token tối đa cho output
- **OCR_MAX_PDF_PAGES**: Số trang PDF tối đa được xử lý
- **OCR_PDF_RENDER_ZOOM**: Hệ số zoom khi render PDF (cao hơn = chất lượng tốt hơn nhưng file lớn hơn)

## Kiểm tra VLLM Server

### Test với curl:

```bash
curl http://127.0.0.1:8001/v1/models
```

Kết quả mong đợi:
```json
{
  "object": "list",
  "data": [
    {
      "id": "Qwen/Qwen2-VL-7B-Instruct",
      "object": "model",
      ...
    }
  ]
}
```

### Test OCR endpoint:

```bash
curl -X POST http://127.0.0.1:8000/ocr \
  -F "file=@test-image.jpg" \
  -F "prompt=Extract all text from this image"
```

## Xử lý lỗi thường gặp

### 1. Connection Error

**Lỗi**: `APIConnectionError: Connection error.`

**Nguyên nhân**: VLLM server chưa chạy hoặc URL không đúng

**Giải pháp**:
- Kiểm tra VLLM server đang chạy: `curl http://127.0.0.1:8001/v1/models`
- Kiểm tra VLLM_BASE_URL trong .env
- Kiểm tra firewall/port 8001

### 2. Out of Memory (OOM)

**Lỗi**: CUDA out of memory

**Giải pháp**:
- Dùng model nhỏ hơn (Qwen2-VL-2B-Instruct hoặc Qwen3.5-0.8B)
- Giảm `--max-model-len`
- Giảm `OCR_MAX_PDF_PAGES` trong .env
- Giảm `OCR_PDF_RENDER_ZOOM` trong .env

### 3. Model Not Found

**Lỗi**: Model not found

**Giải pháp**:
- Đảm bảo model name trong .env khớp với model đang chạy trên VLLM server
- Model sẽ tự động download lần đầu chạy (cần internet)

### 4. Slow Performance

**Giải pháp**:
- Sử dụng GPU thay vì CPU
- Giảm `OCR_MAX_TOKENS`
- Giảm `OCR_PDF_RENDER_ZOOM`
- Xử lý ít trang PDF hơn (`OCR_MAX_PDF_PAGES`)

## Production Deployment

### Khuyến nghị cho production:

1. **Sử dụng Docker Compose**:

```yaml
# Thêm vào docker-compose.yaml
services:
  vllm:
    image: vllm/vllm-openai:latest
    command:
      - --model
      - Qwen/Qwen2-VL-7B-Instruct
      - --host
      - 0.0.0.0
      - --port
      - "8001"
    ports:
      - "8001:8001"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    restart: unless-stopped
```

2. **Load Balancing**: Sử dụng nhiều VLLM instances với load balancer

3. **Monitoring**: Theo dõi memory usage, request latency

4. **Caching**: Cache kết quả OCR cho các file đã xử lý

## Tài liệu tham khảo

- [VLLM Documentation](https://docs.vllm.ai/)
- [Qwen2-VL Model Card](https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct)
- [OpenAI API Compatibility](https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html)
