"""
Auto Approval Worker - Xử lý phê duyệt tự động với LLM
Worker này poll database để tìm jobs QUEUED, xử lý và cập nhật kết quả
"""

import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

# Add parent directory to path for imports
if str(Path(__file__).resolve().parents[2]) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.repositories.auto_approval_repository import fetch_pending_jobs
from src.services.auto_approval_service import process_job

load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/research_db")

async def get_db_pool():
    """Tạo connection pool tới PostgreSQL"""
    return await asyncpg.create_pool(DATABASE_URL)


async def worker_loop():
    """Main worker loop"""
    print("=" * 80)
    print("🚀 Starting Auto Approval Worker...")
    print("=" * 80)
    print(f"📅 Started at: {datetime.now(timezone.utc).isoformat()}")
    print(f"🔗 Database: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'localhost'}")
    print(f"⏱️  Polling interval: 5 seconds")
    print("=" * 80)
    
    pool = await get_db_pool()
    print("✅ Database connection pool created")
    
    iteration = 0
    try:
        while True:
            iteration += 1
            try:
                print(f"\n[Iteration #{iteration}] 🔍Sửa Checking for pending jobs...")
                
                # Fetch pending jobs
                jobs = await fetch_pending_jobs(pool)
                
                if jobs:
                    print(f"✨ Found {len(jobs)} pending job(s)")
                    for idx, job in enumerate(jobs, 1):
                        print(f"\n{'='*60}")
                        print(f"📋 Processing job {idx}/{len(jobs)}")
                        print(f"{'='*60}")
                        await process_job(pool, job)
                else:
                    print("💤 No pending jobs. Waiting 5 seconds...")
                    await asyncio.sleep(5)
                    
            except Exception as e:
                print(f"\n❌ Error in worker loop: {e}")
                import traceback
                traceback.print_exc()
                print("⏳ Waiting 10 seconds before retry...")
                await asyncio.sleep(10)
                
    finally:
        print("\n" + "=" * 80)
        print("🛑 Shutting down worker...")
        await pool.close()
        print("✅ Database connection pool closed")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(worker_loop())
