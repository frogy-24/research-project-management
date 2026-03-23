"""
Test OCR Tool với ảnh trong thư mục uploads
"""
import os
import sys

# ĐẶT BIẾN MÔI TRƯỜNG TRƯỚC KHI IMPORT BẤT KỲ MODULE NÀO
# Vô hiệu hóa hoàn toàn OneDNN/MKL-DNN để tránh lỗi
os.environ['FLAGS_use_mkldnn'] = '0'
os.environ['FLAGS_enable_pir_api'] = '0'
os.environ['FLAGS_enable_pir_in_executor'] = '0'
os.environ['FLAGS_pir_apply_inplace_pass'] = '0'
os.environ['MKLDNN_VERBOSE'] = '0'
os.environ['GLOG_v'] = '0'
os.environ['PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK'] = 'True'

# Import paddle và set device trước
import paddle
paddle.set_device('cpu')

# Thêm path để import src
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from pathlib import Path


def _parse_texts_from_predict_result(result):
    """Hỗ trợ parse output cho cả PaddleOCR v3 và format cũ."""
    parsed = []
    for item in result or []:
        payload = item.json if hasattr(item, "json") else item

        if isinstance(payload, dict):
            if isinstance(payload.get("res"), dict):
                payload = payload["res"]
            rec_texts = payload.get("rec_texts") or []
            rec_scores = payload.get("rec_scores") or []
            for idx, text in enumerate(rec_texts):
                score = float(rec_scores[idx]) if idx < len(rec_scores) else 0.0
                parsed.append((str(text), score))
            continue

        if isinstance(payload, (list, tuple)):
            for line in payload:
                if isinstance(line, (list, tuple)) and len(line) >= 2:
                    text_info = line[1]
                    if isinstance(text_info, (list, tuple)) and len(text_info) >= 2:
                        parsed.append((str(text_info[0]), float(text_info[1])))

    return parsed


async def test_ocr_direct():
    """Test OCR trực tiếp với PaddleOCR (không qua module)"""
    print("=" * 60)
    print("TEST 1: OCR trực tiếp với PaddleOCR")
    print("=" * 60)
    
    try:
        from paddleocr import PaddleOCR
        
        # Khởi tạo OCR với API mới (PaddleOCR v3.x+)
        print("Initializing PaddleOCR...")
        ocr_device = os.getenv('OCR_DEVICE', 'gpu:0')
        ocr = PaddleOCR(
            lang='vi',  # Tiếng Việt
            use_textline_orientation=True,  # Thay thế use_angle_cls
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            enable_mkldnn=False,
            device=ocr_device,
        )
        
        # Đường dẫn ảnh
        image_path = "uploads/Optimized-Phoi-can-cuoc-cong-dan-PSD.jpg"
        
        if not Path(image_path).exists():
            print(f"❌ File không tồn tại: {image_path}")
            return False
        
        print(f"Processing image: {image_path}")
        
        # Thực hiện OCR
        result = ocr.predict(image_path)
        
        parsed_lines = _parse_texts_from_predict_result(result)
        if parsed_lines:
            print("\n✅ OCR thành công!")
            print(f"Số dòng text phát hiện: {len(parsed_lines)}")
            print("\n--- Text trích xuất ---")
            for text, confidence in parsed_lines:
                print(f"[{confidence:.2%}] {text}")
            return True
        else:
            print("⚠️ Không phát hiện text trong ảnh")
            return True
            
    except Exception as e:
        print(f"❌ Lỗi: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_ocr_module():
    """Test OCR qua module src.server.tools.ocr"""
    print("\n" + "=" * 60)
    print("TEST 2: OCR qua module extract_text_from_image")
    print("=" * 60)
    
    try:
        from src.server.tools.ocr import extract_text_from_image
        
        image_path = "uploads/Optimized-Phoi-can-cuoc-cong-dan-PSD.jpg"
        
        print(f"Processing image: {image_path}")
        result = await extract_text_from_image(image_path)
        
        if result["success"]:
            print("\n✅ OCR thành công!")
            print(f"Số dòng: {result.get('total_lines', 0)}")
            print("\n--- Full Text ---")
            print(result["text"])
            return True
        else:
            print(f"❌ OCR thất bại: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Lỗi: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    print("\n🔧 TESTING OCR MODULE")
    print("Ảnh test: uploads/Optimized-Phoi-can-cuoc-cong-dan-PSD.jpg\n")
    
    # Test 1: Direct PaddleOCR
    result1 = await test_ocr_direct()
    
    # Test 2: Module OCR
    result2 = await test_ocr_module()
    
    print("\n" + "=" * 60)
    print("KẾT QUẢ")
    print("=" * 60)
    print(f"Test 1 (Direct): {'✅ PASS' if result1 else '❌ FAIL'}")
    print(f"Test 2 (Module): {'✅ PASS' if result2 else '❌ FAIL'}")


if __name__ == "__main__":
    asyncio.run(main())
