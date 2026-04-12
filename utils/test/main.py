from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from docx2pdf import convert
import shutil
import os
import uuid

app = FastAPI(title="Word to PDF Converter API")

# Tạo thư mục tạm để xử lý file
TEMP_DIR = "temp_files"
os.makedirs(TEMP_DIR, exist_ok=True)

@app.post("/convert-docx-to-pdf/")
async def convert_docx_to_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ định dạng file .docx")

    unique_id = str(uuid.uuid4())
    input_path = os.path.join(TEMP_DIR, f"{unique_id}_{file.filename}")
    output_path = input_path.replace(".docx", ".pdf")

    try:
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        convert(input_path, output_path)

        return FileResponse(
            path=output_path, 
            filename=file.filename.replace(".docx", ".pdf"),
            media_type='application/pdf'
        )

    except Exception as e:
        return {"error": str(e)}
    
    # Lưu ý: Trong thực tế, bạn nên có một task định kỳ để xóa file trong TEMP_DIR

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)