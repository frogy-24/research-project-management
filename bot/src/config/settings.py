import os
from dataclasses import dataclass
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv

load_dotenv()

DEFAULT_DATABASE_URL = "postgresql://postgres:example@localhost:5432/postgres?schema=public"


@dataclass(frozen=True)
class DatabaseConfig:
    dsn: str
    schema: str


def _extract_schema_from_dsn(dsn: str) -> tuple[str, str]:
    parts = urlsplit(dsn)
    query_items = parse_qsl(parts.query, keep_blank_values=True)

    schema = "public"
    filtered_items: list[tuple[str, str]] = []
    for key, value in query_items:
        if key.lower() == "schema" and value:
            schema = value
            continue
        filtered_items.append((key, value))

    normalized_query = urlencode(filtered_items)
    normalized_dsn = urlunsplit((parts.scheme, parts.netloc, parts.path, normalized_query, parts.fragment))
    return normalized_dsn, schema


def load_database_config() -> DatabaseConfig:
    raw_dsn = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
    normalized_dsn, schema = _extract_schema_from_dsn(raw_dsn)
    return DatabaseConfig(dsn=normalized_dsn, schema=schema)