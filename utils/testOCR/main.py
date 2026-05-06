import base64
import io
import tempfile
import os
from pathlib import Path

import fitz  # PyMuPDF
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from openai import OpenAI

# ── Cấu hình ───────────────────────────────────────────────────────────────
BASE_URL  = "http://localhost:20128/v1"
MODEL     = "openrouter/baidu/qianfan-ocr-fast:free"
DPI       = 150   # Độ phân giải rasterize (150 DPI = cân bằng chất lượng / tốc độ)
MAX_PAGES = 50    # Giới hạn trang để tránh request quá nặng

client = OpenAI(
    base_url=BASE_URL,
    api_key="placeholder",  # OpenRouter-compatible không cần key thật
)

app = FastAPI(
    title="PDF OCR API",
    description="Nhận file PDF, OCR từng trang qua model AI, trả về toàn bộ text.",
    version="1.0.0",
)


def pdf_page_to_base64(page: fitz.Page, dpi: int = DPI) -> str:
    """Rasterize một trang PDF thành ảnh JPEG rồi encode base64."""
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
    img_bytes = pix.tobytes("jpeg")
    return base64.b64encode(img_bytes).decode("utf-8")


def ocr_page(image_b64: str, page_num: int) -> str:
    """Gọi model OCR với ảnh base64, trả về text đã nhận dạng."""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_b64}",
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "Bạn là công cụ OCR chuyên nghiệp. "
                            "Hãy trích xuất TOÀN BỘ văn bản từ ảnh này, "
                            "giữ nguyên cấu trúc dòng và đoạn văn, "
                            "không thêm bất kỳ nhận xét hay giải thích nào."
                        ),
                    },
                ],
            }
        ],
        max_tokens=4096,
    )
    return response.choices[0].message.content or ""


@app.post(
    "/ocr",
    summary="OCR file PDF",
    response_description="Text đã trích xuất từ toàn bộ trang PDF",
)
async def ocr_pdf(file: UploadFile = File(..., description="File PDF cần OCR")):
    """
    Nhận một file PDF, OCR từng trang bằng model AI, trả về JSON chứa:

    - **filename**: tên file gốc
    - **total_pages**: tổng số trang đã xử lý
    - **pages**: danh sách text theo từng trang
    - **full_text**: toàn bộ text ghép lại
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận file PDF (.pdf)")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File rỗng")

    try:
        doc = fitz.open(stream=content, filetype="pdf")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Không thể mở file PDF: {e}")

    total_pages = len(doc)
    pages_to_process = min(total_pages, MAX_PAGES)
    warning = (
        f"File có {total_pages} trang; chỉ xử lý {MAX_PAGES} trang đầu."
        if total_pages > MAX_PAGES
        else None
    )

    pages_result = []
    errors = []

    for i in range(pages_to_process):
        page = doc[i]
        try:
            img_b64 = pdf_page_to_base64(page)
            text = ocr_page(img_b64, i + 1)
            pages_result.append({"page": i + 1, "text": text})
        except Exception as e:
            errors.append({"page": i + 1, "error": str(e)})
            pages_result.append({"page": i + 1, "text": ""})

    doc.close()

    full_text = "\n\n".join(
        f"--- Trang {p['page']} ---\n{p['text']}"
        for p in pages_result
        if p["text"]
    )

    response_body: dict = {
        "filename": file.filename,
        "total_pages": pages_to_process,
        "pages": pages_result,
        "full_text": full_text,
    }
    if warning:
        response_body["warning"] = warning
    if errors:
        response_body["errors"] = errors

    return JSONResponse(content=response_body)


@app.get("/health", summary="Kiểm tra trạng thái API")
async def health():
    return {"status": "ok", "model": MODEL, "base_url": BASE_URL}