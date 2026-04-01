# 📝 Hướng Dẫn Sử Dụng Hệ Thống Logging

## 🎯 Tổng Quan

Hệ thống logging đã được tích hợp vào **TẤT CẢ** các file Python trong dự án. Mỗi lần gọi hàm hoặc thực thi code sẽ được tự động log ra file và console.

## 📂 Cấu Trúc

### File Logging Chính
- **`src/utilities/logger.py`**: Module logging tập trung
- **`logs/app_YYYYMMDD.log`**: File log được tạo tự động theo ngày

### Format Log
```
YYYY-MM-DD HH:MM:SS | LEVEL    | MODULE | FUNCTION:LINE | MESSAGE
```

**Ví dụ:**
```
2026-03-27 08:30:15 | INFO     | URMS.src.api.app | health:55 | 🏥 Health check endpoint được gọi
```

## 🚀 Cách Sử Dụng

### 1. Import Logger Vào Module

```python
from src.utilities import get_logger, log_execution, log_async_execution

# Tạo logger cho module hiện tại
logger = get_logger(__name__)
```

### 2. Logging Cho Function Đồng Bộ (Sync)

```python
from src.utilities import log_execution, get_logger

logger = get_logger(__name__)

@log_execution
def calculate_total(a: int, b: int) -> int:
    logger.info(f"Tính tổng: {a} + {b}")
    result = a + b
    return result
```

**Output log:**
```
2026-03-27 08:30:15 | INFO | URMS.mymodule | calculate_total:10 | 🚀 BẮT ĐẦU: calculate_total(5, 10)
2026-03-27 08:30:15 | INFO | URMS.mymodule | calculate_total:11 | Tính tổng: 5 + 10
2026-03-27 08:30:15 | INFO | URMS.mymodule | wrapper:89 | ✅ THÀNH CÔNG: calculate_total | Kết quả: 15 | Thời gian: 0.0001s
```

### 3. Logging Cho Async Function

```python
from src.utilities import log_async_execution, get_logger

logger = get_logger(__name__)

@log_async_execution
async def fetch_user(user_id: int) -> dict:
    logger.info(f"Đang lấy thông tin user ID: {user_id}")
    # ... fetch from DB
    return user_data
```

### 4. Logging Cho Toàn Bộ Class

```python
from src.utilities import auto_log_class, get_logger

logger = get_logger(__name__)

@auto_log_class
class UserService:
    def get_all_users(self):
        logger.info("Lấy danh sách tất cả users")
        # All public methods sẽ tự động được log
        return users
    
    async def create_user(self, data: dict):
        logger.info(f"Tạo user mới: {data.get('name')}")
        # Async methods cũng được log tự động
        return new_user
```

**Lưu ý**: `@auto_log_class` chỉ log các method **public** (không bắt đầu bằng `_`)

### 5. Logging Cho API Endpoints

```python
from src.utilities import log_api_request

@app.post("/users")
@log_api_request("/users", "POST")
async def create_user(user_data: UserCreate):
    # API request/response sẽ tự động được log
    return created_user
```

**Output log:**
```
2026-03-27 08:30:15 | INFO | URMS.API | wrapper:201 | 📨 API REQUEST [20260327083015123456] | POST /users | Args: () | Kwargs: {'user_data': {...}}
2026-03-27 08:30:16 | INFO | URMS.API | wrapper:215 | 📤 API RESPONSE [20260327083015123456] | POST /users | Status: SUCCESS | Time: 0.8523s
```

## 📊 Log Levels

### Sử dụng Các Mức Log Khác Nhau

```python
logger.debug("Chi tiết kỹ thuật cho debugging")
logger.info("Thông tin hoạt động bình thường")
logger.warning("Cảnh báo - có thể có vấn đề")
logger.error("Lỗi xảy ra - nhưng app vẫn chạy được")
logger.critical("Lỗi nghiêm trọng - app có thể crash")
```

### Khi Nào Dùng Mức Nào?

| Level | Khi Nào Dùng | Ví Dụ |
|-------|-------------|-------|
| `DEBUG` | Chi tiết kỹ thuật, chỉ dùng khi dev/debug | `logger.debug(f"SQL Query: {query}")` |
| `INFO` | Thông tin hoạt động bình thường | `logger.info("User logged in successfully")` |
| `WARNING` | Cảnh báo nhưng không ảnh hưởng nghiêm trọng | `logger.warning("API rate limit đang gần đạt max")` |
| `ERROR` | Lỗi cần xử lý nhưng app vẫn hoạt động | `logger.error("Failed to send email")` |
| `CRITICAL` | Lỗi nghiêm trọng, app có thể ngưng hoạt động | `logger.critical("Database connection lost")` |

## 🎨 Emoji Icons Được Sử Dụng

Để dễ đọc và phân biệt nhanh trong log file:

| Emoji | Ý Nghĩa |
|-------|---------|
| 🚀 | Bắt đầu thực thi function/process |
| ✅ | Thành công |
| ❌ | Lỗi, thất bại |
| ⚠️ | Cảnh báo |
| 📨 | API Request nhận vào |
| 📤 | API Response trả về |
| 💥 | API Error |
| 🔧 | Tool/Utility được gọi |
| 🔍 | Tìm kiếm/Query database |
| 📋 | Danh sách/List data |
| 💬 | Chat/Message |
| 🏥 | Health check |
| 🤖 | LLM/AI operation |
| 🔄 | Retry/Fallback |
| 📞 | Function call |
| 🛠️ | Tool execution |
| 🔌 | Connection established |
| 📦 | Package/Data loaded |
| 👋 | User action (exit, logout) |

## 📁 Quản Lý File Log

### Vị Trí File Log
```
bot/
├── logs/
│   ├── app_20260327.log  ← Log của ngày 27/03/2026
│   ├── app_20260328.log  ← Log của ngày 28/03/2026
│   └── ...
```

### Rotation Tự Động
- File log được tạo mới **mỗi ngày** tự động
- Tên file theo format: `app_YYYYMMDD.log`
- Không cần cleanup thủ công (nhưng nên xóa log cũ định kỳ)

### Đọc Log File

**Xem log realtime:**
```bash
# Windows
Get-Content logs\app_20260327.log -Wait -Tail 50

# Linux/Mac
tail -f logs/app_20260327.log
```

**Tìm kiếm lỗi:**
```bash
# Windows PowerShell
Select-String -Path "logs\app_20260327.log" -Pattern "ERROR|CRITICAL"

# Linux/Mac
grep -E "ERROR|CRITICAL" logs/app_20260327.log
```

**Lọc theo module:**
```bash
grep "URMS.src.api.app" logs/app_20260327.log
```

## 🔧 Cấu Hình Nâng Cao

### Thay Đổi Log Level

Trong `src/utilities/logger.py`:

```python
# Hiện tại: DEBUG (log tất cả)
logger.setLevel(logging.DEBUG)

# Production: Chỉ log INFO trở lên
logger.setLevel(logging.INFO)

# Chỉ log WARNING và ERROR
logger.setLevel(logging.WARNING)
```

### Tắt Console Output (Chỉ Log File)

```python
# Trong logger.py, xóa StreamHandler:
logging.basicConfig(
    level=logging.DEBUG,
    format=LOG_FORMAT,
    datefmt=DATE_FORMAT,
    handlers=[
        logging.FileHandler(...),
        # logging.StreamHandler(),  ← Comment dòng này
    ],
)
```

## 📋 Best Practices

### ✅ NÊN:
1. **Luôn log khi bắt đầu/kết thúc một task quan trọng**
   ```python
   logger.info("Bắt đầu xử lý đơn hàng #12345")
   # ... process order
   logger.info("Hoàn thành xử lý đơn hàng #12345")
   ```

2. **Log các thông tin quan trọng cho debugging**
   ```python
   logger.debug(f"Query params: {params}")
   logger.debug(f"Database response: {rows}")
   ```

3. **Log exception với stack trace**
   ```python
   try:
       risky_operation()
   except Exception as e:
       logger.error(f"Operation failed: {str(e)}", exc_info=True)
   ```

### ❌ KHÔNG NÊN:
1. **Không log thông tin nhạy cảm**
   ```python
   # ❌ TRÁNH
   logger.info(f"User password: {password}")
   
   # ✅ AN TOÀN
   logger.info(f"User {username} logged in")
   ```

2. **Không log quá nhiều trong vòng lặp**
   ```python
   # ❌ TRÁNH
   for item in items:
       logger.info(f"Processing {item}")  # Spam logs
   
   # ✅ TỐT HƠN
   logger.info(f"Processing {len(items)} items")
   for item in items:
       process(item)
   logger.info("Processing completed")
   ```

3. **Không để empty message**
   ```python
   # ❌ TRÁNH
   logger.info("")
   
   # ✅ LUÔN CÓ MESSAGE RÕ RÀNG
   logger.info("Database connection established")
   ```

## 🧪 Testing Logging

Để test xem logging có hoạt động:

```python
# test_logging.py
from src.utilities import get_logger, log_execution

logger = get_logger(__name__)

@log_execution
def test_function():
    logger.info("This is a test log message")
    logger.warning("This is a warning")
    logger.error("This is an error")
    return "Success"

if __name__ == "__main__":
    result = test_function()
    print(f"Result: {result}")
```

Chạy và kiểm tra file log trong `logs/`.

## 🆘 Troubleshooting

### Vấn Đề: Không thấy log xuất hiện

**Giải pháp:**
1. Kiểm tra thư mục `logs/` đã được tạo chưa
2. Kiểm tra quyền ghi file trong thư mục logs
3. Xem log level có đang bị set quá cao không

### Vấn Đề: File log quá lớn

**Giải pháp:**
1. Xóa các file log cũ:
   ```bash
   # Xóa log cũ hơn 7 ngày
   find logs/ -name "app_*.log" -mtime +7 -delete
   ```

2. Hoặc giảm log level xuống INFO/WARNING trong production

### Vấn Đề: Encoding lỗi với tiếng Việt

**Giải pháp:** File logging đã được config với `encoding="utf-8"`, nếu vẫn lỗi, kiểm tra terminal encoding.

## 📚 Tài Liệu Tham Khảo

- [Python Logging Documentation](https://docs.python.org/3/library/logging.html)
- [Logging Best Practices](https://docs.python.org/3/howto/logging.html)
- Code implementation: `src/utilities/logger.py`

---

**Lưu ý:** Hệ thống logging đã được tích hợp **TỰ ĐỘNG** vào tất cả các file Python trong dự án. Bạn chỉ cần import và sử dụng!
