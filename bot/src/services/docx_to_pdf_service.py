from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from docx2pdf import convert


def is_docx_filename(filename: str) -> bool:
    return filename.lower().endswith(".docx")


def build_pdf_filename(filename: str) -> str:
    return f"{Path(filename).stem}.pdf"


def save_upload_file(upload_file: UploadFile, temp_dir: Path) -> Path:
    filename = Path(upload_file.filename or "uploaded.docx").name
    input_path = temp_dir / f"{uuid4().hex}_{filename}"

    with input_path.open("wb") as buffer:
        file_obj = upload_file.file
        file_obj.seek(0)
        buffer.write(file_obj.read())

    return input_path


def convert_docx_file_to_pdf(input_path: Path) -> Path:
    output_path = input_path.with_suffix(".pdf")
    convert(str(input_path), str(output_path))
    return output_path


def cleanup_files(paths: list[Path]) -> None:
    for path in paths:
        try:
            if path.exists():
                path.unlink()
        except OSError:
            # Cleanup best-effort to avoid breaking response lifecycle.
            continue
