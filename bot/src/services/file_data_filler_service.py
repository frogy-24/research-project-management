"""
FileDataFillerService - LLM phân tích file Excel + sinh SQL + fill data
"""

import os
import json
from datetime import datetime
from typing import Any

from src.services.excel_processor_service import get_excel_processor, ExcelProcessorService
from src.services.sql_assistant_service import get_sql_assistant_service
from src.services.llm_service import get_llm_service
from src.db import db
from src.utilities import get_logger

logger = get_logger(__name__)


# Prompt template cho LLM phân tích file và sinh SQL
FILE_ANALYSIS_PROMPT = """
Ban la chuyen gia phan tich du lieu va thiet ke co so du lieu.

Nhiem vu:
1. Phan tich cau truc file Excel
2. Xac dinh y nghia cua cac cot/columns
3. Doan doan du lieu nao can lay tu database
4. Sinh cau lenh SQL de lay du lieu

==================================================
FILE STRUCTURE
==================================================

{file_structure}

==================================================
DATABASE SCHEMA (tham khao)
==================================================

{schema}

==================================================
QUY TAC QUAN TRONG
==================================================

1. Phan tich file:
   - Neu co cot "Ten de tai" / "Project Title" -> can lay thong tin de tai
   - Neu co cot "Ten sinh vien" / "Student Name" -> can lay thong tin sinh vien
   - Neu co cot "Ma sinh vien" / "Student Code" -> co the join voi bang User
   - Neu co cot "Trang thai" / "Status" -> hien thi trang thai hien tai

2. Xac dinh du lieu can lay:
   - Thong tin dang ky de tai: ProjectRegistration + User + CallRound
   - Thong tin de tai: Project + User (leader)
   - Thong tin giang vien: User (role = LECTURER)

3. SQL sinh ra phai:
   - Chi SELECT (khong INSERT/UPDATE/DELETE)
   - Su dung den ngoac kep cho ten bang va cot
   - JOIN dung quan he

4. Tra ve JSON format:
   {{
     "analysis": "Mo ta ngan ve y nghia cua file",
     "dataType": "PROJECT_REGISTRATION | PROJECT | USER | COUNCIL | CALL_ROUND | OTHER",
     "sql": "SELECT ... FROM ... WHERE ...",
     "columnMappings": {{
       "cot_1": "ten_cot_database_1",
       "cot_2": "ten_cot_database_2"
     }},
     "filters": ["mo ta filter neu can"]
   }}

==================================================
VI DU
==================================================

File co cau truc:
- Cot 1: Ma SV (text)
- Cot 2: Ten de tai (text)  
- Cot 3: Trang thai (text)

Tra ve:
{{
  "analysis": "Danh sach sinh vien dang ky de tai",
  "dataType": "PROJECT_REGISTRATION",
  "sql": "SELECT pr.\"title\" as \"Ten de tai\", u.\"name\" as \"Ten sinh vien\", u.\"code\" as \"Ma SV\", pr.\"status\" as \"Trang thai\" FROM \"ProjectRegistration\" pr JOIN \"User\" u ON pr.\"userId\" = u.id",
  "columnMappings": {{}},
  "filters": []
}}

"""


class FileDataFillerService:
    """
    Service de fill du lieu vao file Excel su dung LLM.
    
    Flow:
    1. Doc va phan tich cau truc file Excel
    2. Su dung LLM de xac dinh y nghia cac cot
    3. Sinh SQL de lay du lieu tu database
    4. Fill du lieu vao file va tra ve
    """

    def __init__(self):
        self.excel_processor = get_excel_processor()
        self.sql_service = get_sql_assistant_service()

    async def analyze_and_fill(self, file_path: str, output_dir: str = None) -> dict[str, Any]:
        """
        Phan tich file va fill du lieu.
        
        Args:
            file_path: Duong dan file Excel can xu ly
            output_dir: Thu muc chua file output (mac dinh: /tmp)
            
        Returns:
            {
                "success": bool,
                "outputPath": str,
                "analysis": {...},
                "rowCount": int,
                "error": str (neu co)
            }
        """
        logger.info(f"🚀 Starting file data fill: {file_path}")
        
        try:
            # 1. Validate file
            if not self.excel_processor.is_valid_excel(file_path):
                raise ValueError(f"File khong phai Excel: {file_path}")
            
            # 2. Phan tich cau truc file
            analysis = self.excel_processor.analyze_excel(file_path)
            file_description = self.excel_processor.describe_for_llm(analysis)
            logger.info(f"📊 File analysis:\n{file_description}")
            
            # 3. Su dung LLM de phan tich va sinh SQL
            llm_result = await self._analyze_with_llm(file_description)
            logger.info(f"🧠 LLM analysis: {llm_result.get('dataType')}")
            
            # 4. Execute SQL
            sql = llm_result.get("sql", "")
            if sql:
                data = await self._execute_query(sql)
                logger.info(f"📦 Fetched {len(data)} rows from database")
            else:
                data = []
            
            # 5. Fill data vao file
            output_path = self._fill_excel(file_path, data, llm_result, output_dir)
            
            return {
                "success": True,
                "outputPath": output_path,
                "analysis": {
                    "fileStructure": analysis,
                    "llmAnalysis": llm_result,
                    "dataType": llm_result.get("dataType"),
                    "sql": sql
                },
                "rowCount": len(data),
                "message": f"Da fill {len(data)} dong du lieu"
            }
            
        except Exception as e:
            logger.error(f"❌ FileDataFiller error: {e}")
            return {
                "success": False,
                "error": str(e),
                "outputPath": None,
                "analysis": None,
                "rowCount": 0
            }

    async def _analyze_with_llm(self, file_description: str) -> dict[str, Any]:
        """Su dung LLM de phan tich file va sinh SQL."""
        llm = get_llm_service()
        schema = self.sql_service._build_schema_for_prompt()
        
        prompt = FILE_ANALYSIS_PROMPT.format(
            file_structure=file_description,
            schema=schema
        )
        
        response = await llm.chat_completion(
            messages=[
                {"role": "system", "content": "You are a data analyst. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        # Parse JSON response
        response_clean = response.strip()
        try:
            result = json.loads(response_clean)
        except json.JSONDecodeError:
            logger.error(f"LLM returned invalid JSON: {response_clean[:200]}")
            result = {
                "analysis": "Khong the phan tich file",
                "dataType": "UNKNOWN",
                "sql": "",
                "columnMappings": {},
                "filters": []
            }
        
        return result

    async def _execute_query(self, sql: str) -> list[dict[str, Any]]:
        """Execute SQL query and return results."""
        if not sql:
            return []
        
        try:
            await db.connect()
            rows = await db.fetch_all(sql)
            return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"❌ SQL execution error: {e}")
            return []

    def _fill_excel(
        self, 
        template_path: str, 
        data: list[dict[str, Any]], 
        llm_result: dict[str, Any],
        output_dir: str = None
    ) -> str:
        """Fill data vao Excel file."""
        try:
            from openpyxl import load_workbook
            from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
        except ImportError:
            logger.warning("openpyxl not available, saving as JSON")
            return self._save_as_json(template_path, data, output_dir)
        
        wb = load_workbook(template_path)
        ws = wb.active
        
        column_mappings = llm_result.get("columnMappings", {})
        
        # Find last row with data
        start_row = 2  # Assuming headers are in row 1
        
        # Try to find where data ends (look for first empty row in column A)
        data_row = start_row
        for row in range(start_row, ws.max_row + 100):
            if ws.cell(row=row, column=1).value is None:
                data_row = row
                break
            data_row = row + 1
        
        # Fill data
        for idx, row_data in enumerate(data):
            row_num = data_row + idx
            
            # Map column mappings
            for col_idx, db_col in column_mappings.items():
                if db_col in row_data:
                    ws.cell(row=row_num, column=col_idx, value=row_data[db_col])
            
            # Also try to auto-map based on header names
            headers = [ws.cell(row=1, column=c).value for c in range(1, ws.max_column + 1)]
            for col_idx, header in enumerate(headers, 1):
                if header and header in row_data:
                    ws.cell(row=row_num, column=col_idx, value=row_data[header])
        
        # Save output
        if output_dir is None:
            output_dir = "/tmp"
        
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"filled_{timestamp}.xlsx"
        output_path = os.path.join(output_dir, filename)
        
        wb.save(output_path)
        wb.close()
        
        logger.info(f"✅ Saved filled file: {output_path}")
        return output_path

    def _save_as_json(self, template_path: str, data: list[dict], output_dir: str = None) -> str:
        """Fallback: Save as JSON if openpyxl not available."""
        if output_dir is None:
            output_dir = "/tmp"
        
        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"data_{timestamp}.json"
        output_path = os.path.join(output_dir, filename)
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return output_path


# Singleton
_file_data_filler: FileDataFillerService | None = None


def get_file_data_filler() -> FileDataFillerService:
    global _file_data_filler
    if _file_data_filler is None:
        _file_data_filler = FileDataFillerService()
    return _file_data_filler