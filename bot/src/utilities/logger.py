"""
Hệ thống logging tập trung cho toàn bộ dự án.
Tự động log mọi function call, input/output, và thời gian thực thi.
"""
import functools
import inspect
import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, TypeVar

# Tạo thư mục logs nếu chưa có
LOG_DIR = Path(__file__).resolve().parents[2] / "logs"
LOG_DIR.mkdir(exist_ok=True)

# Cấu hình format logging
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
DEFAULT_LOG_LEVEL_NAME = os.getenv("URMS_LOG_LEVEL", "INFO").upper()
DEFAULT_LOG_LEVEL = getattr(logging, DEFAULT_LOG_LEVEL_NAME, logging.INFO)
LOG_VALUE_PREVIEW_CHARS = int(os.getenv("URMS_LOG_VALUE_PREVIEW_CHARS", "400"))

# Cấu hình logger gốc
logging.basicConfig(
    level=DEFAULT_LOG_LEVEL,
    format=LOG_FORMAT,
    datefmt=DATE_FORMAT,
    handlers=[
        # Log ra file với tên theo ngày
        logging.FileHandler(
            LOG_DIR / f"app_{datetime.now().strftime('%Y%m%d')}.log",
            encoding="utf-8",
        ),
        # Log ra console
        logging.StreamHandler(),
    ],
)

# Logger chung cho toàn project
logger = logging.getLogger("URMS")
logger.setLevel(DEFAULT_LOG_LEVEL)


if os.getenv("URMS_VERBOSE_NETWORK_LOGS", "0") != "1":
    # Giảm nhiễu và overhead từ thư viện mạng khi không debug sâu.
    for noisy_logger in ("httpcore", "httpx", "openai", "mcp.client.streamable_http", "asyncio"):
        logging.getLogger(noisy_logger).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Tạo logger cho từng module cụ thể.
    
    Args:
        name: Tên module (thường dùng __name__)
    
    Returns:
        Logger instance đã được cấu hình
    """
    module_logger = logging.getLogger(f"URMS.{name}")
    module_logger.setLevel(DEFAULT_LOG_LEVEL)
    return module_logger


T = TypeVar("T", bound=Callable[..., Any])


def _safe_preview(value: Any, max_len: int = LOG_VALUE_PREVIEW_CHARS) -> str:
    text = repr(value)
    if len(text) <= max_len:
        return text
    return f"{text[:max_len]}...<truncated {len(text) - max_len} chars>"


def log_execution(func: T) -> T:
    """
    Decorator để tự động log mọi lời gọi hàm (sync).
    Log: Tên hàm, tham số đầu vào, kết quả trả về, thời gian thực thi.
    
    Usage:
        @log_execution
        def my_function(a, b):
            return a + b
    """
    func_logger = get_logger(func.__module__)
    
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        # Log thông tin bắt đầu
        func_name = func.__qualname__
        args_repr = [_safe_preview(a) for a in args]
        kwargs_repr = [f"{k}={_safe_preview(v)}" for k, v in kwargs.items()]
        signature = ", ".join(args_repr + kwargs_repr)
        
        func_logger.info(f"🚀 BẮT ĐẦU: {func_name}({signature})")
        
        start_time = time.time()
        try:
            # Thực thi function
            result = func(*args, **kwargs)
            
            # Log kết quả thành công
            elapsed_time = time.time() - start_time
            func_logger.info(
                f"✅ THÀNH CÔNG: {func_name} | "
                f"Kết quả: {_safe_preview(result)} | "
                f"Thời gian: {elapsed_time:.4f}s"
            )
            return result
            
        except Exception as e:
            # Log lỗi
            elapsed_time = time.time() - start_time
            func_logger.error(
                f"❌ LỖI: {func_name} | "
                f"Exception: {type(e).__name__}: {str(e)} | "
                f"Thời gian: {elapsed_time:.4f}s",
                exc_info=True,
            )
            raise
    
    return wrapper  # type: ignore


def log_async_execution(func: T) -> T:
    """
    Decorator để tự động log mọi lời gọi hàm async.
    Tương tự log_execution nhưng cho async functions.
    
    Usage:
        @log_async_execution
        async def my_async_function(a, b):
            return a + b
    """
    func_logger = get_logger(func.__module__)
    
    @functools.wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> Any:
        # Log thông tin bắt đầu
        func_name = func.__qualname__
        args_repr = [_safe_preview(a) for a in args]
        kwargs_repr = [f"{k}={_safe_preview(v)}" for k, v in kwargs.items()]
        signature = ", ".join(args_repr + kwargs_repr)
        
        func_logger.info(f"🚀 BẮT ĐẦU [ASYNC]: {func_name}({signature})")
        
        start_time = time.time()
        try:
            # Thực thi async function
            result = await func(*args, **kwargs)
            
            # Log kết quả thành công
            elapsed_time = time.time() - start_time
            func_logger.info(
                f"✅ THÀNH CÔNG [ASYNC]: {func_name} | "
                f"Kết quả: {_safe_preview(result)} | "
                f"Thời gian: {elapsed_time:.4f}s"
            )
            return result
            
        except Exception as e:
            # Log lỗi
            elapsed_time = time.time() - start_time
            func_logger.error(
                f"❌ LỖI [ASYNC]: {func_name} | "
                f"Exception: {type(e).__name__}: {str(e)} | "
                f"Thời gian: {elapsed_time:.4f}s",
                exc_info=True,
            )
            raise
    
    return wrapper  # type: ignore


def auto_log_class(cls: type) -> type:
    """
    Decorator để tự động thêm logging cho tất cả methods trong một class.
    
    Usage:
        @auto_log_class
        class MyClass:
            def method1(self):
                pass
            
            async def method2(self):
                pass
    """
    for name, method in inspect.getmembers(cls, predicate=inspect.isfunction):
        # Bỏ qua magic methods và private methods
        if name.startswith("_"):
            continue
        
        # Xác định method là sync hay async
        if inspect.iscoroutinefunction(method):
            setattr(cls, name, log_async_execution(method))
        else:
            setattr(cls, name, log_execution(method))
    
    return cls


def log_api_request(endpoint: str, method: str = "POST") -> Callable:
    """
    Decorator đặc biệt cho API endpoints.
    Log chi tiết request và response của API.
    
    Usage:
        @app.post("/api/users")
        @log_api_request("/api/users", "POST")
        async def create_user(user_data: dict):
            pass
    """
    api_logger = get_logger("API")
    
    def decorator(func: T) -> T:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            request_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
            
            api_logger.info(
                f"📨 API REQUEST [{request_id}] | "
                f"{method} {endpoint} | "
                f"Args: {args!r} | "
                f"Kwargs: {kwargs!r}"
            )
            
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                elapsed_time = time.time() - start_time
                
                api_logger.info(
                    f"📤 API RESPONSE [{request_id}] | "
                    f"{method} {endpoint} | "
                    f"Status: SUCCESS | "
                    f"Time: {elapsed_time:.4f}s"
                )
                return result
                
            except Exception as e:
                elapsed_time = time.time() - start_time
                api_logger.error(
                    f"💥 API ERROR [{request_id}] | "
                    f"{method} {endpoint} | "
                    f"Error: {type(e).__name__}: {str(e)} | "
                    f"Time: {elapsed_time:.4f}s",
                    exc_info=True,
                )
                raise
        
        return wrapper  # type: ignore
    
    return decorator


# Export các utilities chính
__all__ = [
    "logger",
    "get_logger",
    "log_execution",
    "log_async_execution",
    "auto_log_class",
    "log_api_request",
]
