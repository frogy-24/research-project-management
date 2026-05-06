from dataclasses import dataclass, field

SUPPORTED_IMAGE_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
    ".gif",
}


@dataclass
class OcrResult:
    text: str
    page_count: int
    model: str
    pages: list[dict] = field(default_factory=list)
