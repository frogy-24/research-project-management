#!/usr/bin/env python3
"""
Test script to debug Qdrant indexing for auto-approval.
Run standalone: uv run python test_qdrant_debug.py
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load env
load_dotenv(Path(__file__).parent / ".env")

print("=" * 60)
print("QDRANT DEBUG TEST SCRIPT")
print("=" * 60)

# Test 1: Qdrant Connection
print("\n=== Test 1: Qdrant Connection ===")
try:
    from qdrant_client import QdrantClient
    client = QdrantClient(
        host=os.getenv("QDRANT_HOST", "localhost"),
        port=int(os.getenv("QDRANT_PORT", "6333"))
    )
    info = client.get_collections()
    print(f"✅ Qdrant connected!")
    print(f"   Collections: {[c.name for c in info.collections]}")
except Exception as exc:
    print(f"❌ Qdrant connection failed: {exc}")
    sys.exit(1)

# Test 2: Check collection exists
collection_name = os.getenv("QDRANT_COLLECTION", "nguyen-cu-khoa-hoc-nam-2026")
print(f"\n=== Test 2: Collection '{collection_name}' ===")
try:
    collections = client.get_collections().collections
    collection_exists = any(c.name == collection_name for c in collections)
    if collection_exists:
        coll_info = client.get_collection(collection_name)
        print(f"✅ Collection exists! Vectors: {coll_info.vectors_count}")
    else:
        print(f"⚠️ Collection '{collection_name}' does not exist yet")
        print(f"   It will be created on first index.")
except Exception as exc:
    print(f"❌ Failed to check collection: {exc}")

# Test 3: Check if any points exist
print(f"\n=== Test 3: Check existing points ===")
try:
    from qdrant_client.models import Filter, ScrollResponse
    result = client.scroll(collection_name=collection_name, limit=5, with_payload=True)
    if result[0]:
        print(f"✅ Found {len(result[0])} points in collection")
        for p in result[0][:3]:
            payload = p.payload or {}
            print(f"   - ID: {p.id}, Project: {payload.get('projectTitle', 'N/A')}")
    else:
        print(f"   No points yet in collection")
except Exception as exc:
    print(f"   Error checking points: {exc}")

# Test 4: OCR Matching Logic
print("\n=== Test 4: OCR Filename Matching ===")
match_names_str = os.getenv("OCR_MATCH_FILENAMES", "mau_dang_ky_test.doc")
match_names = [name.strip().lower() for name in match_names_str.split(",")]

print(f"OCR_MATCH_FILENAMES: {match_names}")

project_files = [
    "ISO-IT13-M03.Mau De tai tot nghiep (2024).doc.pdf",
    "1776789842688-maudangkytest.doc",
    "proposal.docx",
    "mau_dang_ky_de_tai.doc",
    "MauDangKy.doc",
]

print("\nFile matching results:")
for fname in project_files:
    fname_lower = fname.lower()
    exact_match = fname_lower in match_names
    contains_match = any(name in fname_lower for name in match_names)
    
    if contains_match:
        print(f"✅ '{fname}' -> MATCH!")
    else:
        print(f"❌ '{fname}' -> NO MATCH")

print("\n" + "=" * 60)
print("SUGGESTED FIXES:")
print("=" * 60)
print("1. Update OCR_MATCH_FILENAMES to use partial matching")
print("   e.g., 'mau_dang_ky,maudangky' instead of exact filenames")
print("2. Add .doc to supported file extensions")
print("3. Use 'in' operator instead of '==' for filename matching")
print("=" * 60)