"""
OCR Tool sử dụng PaddleOCR để trích xuất text từ ảnh
"""
import os

# =====================================================
# VÔ HIỆU HÓA ONEDNN/MKL-DNN TRƯỚC KHI IMPORT PADDLE
# Để tránh lỗi: ConvertPirAttribute2RuntimeAttribute not support
# =====================================================
os.environ['FLAGS_use_mkldnn'] = '0'
os.environ['FLAGS_enable_pir_api'] = '0'
os.environ['FLAGS_enable_pir_in_executor'] = '0'
os.environ['FLAGS_pir_apply_inplace_pass'] = '0'
os.environ['MKLDNN_VERBOSE'] = '0'
os.environ['GLOG_v'] = '0'
os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'

# Import paddle và cấu hình trước paddleocr
import paddle

_runtime_device = os.getenv("OCR_DEVICE", "gpu:0")
try:
    paddle.set_device(_runtime_device)
except Exception:
    # Cho phép fallback trong quá trình init OCR engine nếu GPU chưa sẵn sàng.
    paddle.set_device("cpu")

from paddleocr import PaddleOCR
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Khởi tạo PaddleOCR với tiếng Việt
ocr_engine = None


def _gpu_available() -> bool:
    """Kiểm tra CUDA backend có sẵn và có ít nhất 1 GPU usable."""
    try:
        if not paddle.is_compiled_with_cuda():
            return False
        return paddle.device.cuda.device_count() > 0
    except Exception:
        return False


def _resolve_ocr_device(preferred_device: str, force_gpu: bool) -> str:
    """Chuẩn hóa device OCR để tránh fallback mơ hồ gây lỗi runtime."""
    wants_gpu = preferred_device.startswith("gpu")
    if not wants_gpu:
        return preferred_device

    if _gpu_available():
        return preferred_device

    message = "OCR GPU requested but Paddle CUDA backend/device is unavailable"
    if force_gpu:
        raise RuntimeError(message)

    logger.warning("%s. Falling back to CPU.", message)
    return "cpu"


def _to_python_value(value):
    """Chuyển numpy/paddle scalar hoặc array về kiểu Python thuần."""
    if hasattr(value, "tolist"):
        return value.tolist()
    return value


def _normalize_polygon(polygon):
    """Đưa polygon về format list[[x, y], ...] với int."""
    points = _to_python_value(polygon)
    normalized = []
    for point in points:
        x, y = point
        normalized.append([int(x), int(y)])
    return normalized


def _extract_from_v3_result(result_item):
    """Parse 1 phần tử kết quả từ PaddleOCR 3.x Result object."""
    payload = result_item
    if hasattr(result_item, "json"):
        payload = result_item.json
    payload = _to_python_value(payload)

    if isinstance(payload, dict) and "res" in payload and isinstance(payload["res"], dict):
        payload = payload["res"]

    if not isinstance(payload, dict):
        return [], []

    texts = payload.get("rec_texts") or []
    scores = payload.get("rec_scores") or []
    polygons = payload.get("rec_polys") or payload.get("dt_polys") or []

    normalized_texts = []
    details = []
    for idx, text in enumerate(texts):
        confidence = 0.0
        if idx < len(scores):
            confidence = float(scores[idx])

        bbox = []
        if idx < len(polygons):
            bbox = _normalize_polygon(polygons[idx])

        normalized_text = str(text).strip()
        normalized_texts.append(normalized_text)
        details.append({
            "text": normalized_text,
            "confidence": round(confidence, 4),
            "bbox": bbox,
        })

    return normalized_texts, details


def _extract_from_legacy_result(result_item):
    """Parse output kiểu cũ: [[box, (text, confidence)], ...]."""
    if not isinstance(result_item, (list, tuple)):
        return [], []

    texts = []
    details = []
    for line in result_item:
        if not isinstance(line, (list, tuple)) or len(line) < 2:
            continue

        box, text_info = line[0], line[1]
        text = ""
        confidence = 0.0

        if isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
            text = str(text_info[0]).strip()
            confidence = float(text_info[1])

        bbox = _normalize_polygon(box)
        texts.append(text)
        details.append({
            "text": text,
            "confidence": round(confidence, 4),
            "bbox": bbox,
        })

    return texts, details


def _create_ocr_engine():
    """Khởi tạo OCR engine tương thích cả API mới và cũ."""
    preferred_device = os.getenv("OCR_DEVICE", "gpu:0")
    force_gpu = os.getenv("OCR_FORCE_GPU", "false").lower() in {"1", "true", "yes", "on"}
    resolved_device = _resolve_ocr_device(preferred_device, force_gpu)

    def _build_v3(device: str):
        return PaddleOCR(
            lang="vi",
            use_textline_orientation=True,
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            enable_mkldnn=False,
            device=device,
        )

    try:
        return _build_v3(resolved_device)
    except TypeError:
        # Fallback cho phiên bản paddleocr cũ hơn.
        use_gpu = resolved_device.startswith("gpu")
        if use_gpu:
            try:
                return PaddleOCR(
                    lang="vi",
                    use_angle_cls=True,
                    enable_mkldnn=False,
                    use_gpu=True,
                )
            except Exception:
                if force_gpu:
                    raise

        return PaddleOCR(
            lang="vi",
            use_angle_cls=True,
            enable_mkldnn=False,
            use_gpu=False,
        )
    except Exception:
        if force_gpu:
            raise

        logger.warning("OCR GPU init failed, fallback to CPU")
        try:
            return _build_v3("cpu")
        except TypeError:
            return PaddleOCR(
                lang="vi",
                use_angle_cls=True,
                enable_mkldnn=False,
                use_gpu=False,
            )

def get_ocr_engine():
    """Lazy loading OCR engine để tránh tải model khi import"""
    global ocr_engine
    if ocr_engine is None:
        logger.info("Initializing PaddleOCR engine...")
        ocr_engine = _create_ocr_engine()
    return ocr_engine


async def extract_text_from_image(image_path: str) -> dict:
    """
    Trích xuất text từ ảnh sử dụng PaddleOCR
    
    Args:
        image_path: Đường dẫn đến file ảnh
        
    Returns:
        dict với các key:
        - success: bool
        - text: str (toàn bộ text)
        - details: list (chi tiết từng dòng text với confidence)
        - error: str (nếu có lỗi)
    """
    try:
        # Kiểm tra file tồn tại
        if not Path(image_path).exists():
            return {
                "success": False,
                "error": f"File not found: {image_path}",
                "text": "",
                "details": []
            }
        
        # Lấy OCR engine
        ocr = get_ocr_engine()
        
        # Thực hiện OCR (PaddleOCR v3.x sử dụng predict)
        result = ocr.predict(image_path)

        if not result:
            return {
                "success": True,
                "text": "",
                "details": [],
                "message": "No text detected in image"
            }

        # Parse cả output mới (Result object) lẫn output cũ.
        texts = []
        details = []

        for item in result:
            item_texts, item_details = _extract_from_v3_result(item)
            if not item_details:
                item_texts, item_details = _extract_from_legacy_result(item)

            if item_texts:
                texts.extend(item_texts)
            if item_details:
                details.extend(item_details)

        full_text = "\n".join([t for t in texts if t])

        if not details:
            return {
                "success": True,
                "text": "",
                "details": [],
                "message": "No text detected in image"
            }
        
        return {
            "success": True,
            "text": full_text,
            "details": details,
            "total_lines": len(details)
        }
        
    except Exception as e:
        logger.error(f"OCR Error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "details": []
        }
