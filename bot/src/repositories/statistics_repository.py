from typing import Any

from src.db import db
from src.utilities import get_logger, log_async_execution

logger = get_logger(__name__)


@log_async_execution
async def get_admin_statistics_snapshot() -> dict[str, Any]:
    logger.info("Lấy snapshot thống kê hệ thống cho báo cáo AI")

    total_users = await db.fetchrow('SELECT COUNT(*)::int AS value FROM "User"')
    total_projects = await db.fetchrow('SELECT COUNT(*)::int AS value FROM "Project"')
    total_registrations = await db.fetchrow('SELECT COUNT(*)::int AS value FROM "ProjectRegistration"')
    total_call_rounds = await db.fetchrow('SELECT COUNT(*)::int AS value FROM "CallRound"')
    total_councils = await db.fetchrow('SELECT COUNT(*)::int AS value FROM "Council"')

    project_status_rows = await db.fetch(
        'SELECT status::text AS key, COUNT(*)::int AS count FROM "Project" GROUP BY status ORDER BY count DESC'
    )
    registration_status_rows = await db.fetch(
        'SELECT status::text AS key, COUNT(*)::int AS count FROM "ProjectRegistration" GROUP BY status ORDER BY count DESC'
    )
    evaluation_decision_rows = await db.fetch(
        'SELECT decision::text AS key, COUNT(*)::int AS count FROM "CouncilEvaluation" GROUP BY decision ORDER BY count DESC'
    )

    top_call_round_rows = await db.fetch(
        'SELECT c.id, c.name, COUNT(pr.id)::int AS registration_count '
        'FROM "CallRound" c '
        'LEFT JOIN "ProjectRegistration" pr ON pr."callRoundId" = c.id '
        'GROUP BY c.id, c.name '
        'ORDER BY registration_count DESC, c."createdAt" DESC '
        'LIMIT 10'
    )

    budget_row = await db.fetchrow(
        'SELECT '
        'COALESCE(SUM(p."budgetRequested"), 0)::numeric AS total_requested, '
        'COALESCE(SUM(p."budgetApproved"), 0)::numeric AS total_approved, '
        'COALESCE(AVG(p."budgetRequested"), 0)::numeric AS avg_requested, '
        'COALESCE(AVG(p."budgetApproved"), 0)::numeric AS avg_approved '
        'FROM "Project" p'
    )

    progress_row = await db.fetchrow(
        'SELECT '
        'COUNT(*)::int AS total_reports, '
        'COALESCE(AVG("mentorScore"), 0)::numeric AS avg_mentor_score '
        'FROM "ProgressReport"'
    )

    overdue_row = await db.fetchrow(
        'SELECT COALESCE(SUM("overdueReportCount"), 0)::int AS overdue_total FROM "Project"'
    )

    return {
        "overview": {
            "totalUsers": int((total_users or {}).get("value", 0)),
            "totalProjects": int((total_projects or {}).get("value", 0)),
            "totalRegistrations": int((total_registrations or {}).get("value", 0)),
            "totalCallRounds": int((total_call_rounds or {}).get("value", 0)),
            "totalCouncils": int((total_councils or {}).get("value", 0)),
        },
        "projects": {
            "byStatus": {row["key"]: row["count"] for row in project_status_rows},
            "budget": {
                "totalRequested": float((budget_row or {}).get("total_requested", 0)),
                "totalApproved": float((budget_row or {}).get("total_approved", 0)),
                "avgRequested": float((budget_row or {}).get("avg_requested", 0)),
                "avgApproved": float((budget_row or {}).get("avg_approved", 0)),
            },
        },
        "registrations": {
            "byStatus": {row["key"]: row["count"] for row in registration_status_rows},
            "topCallRounds": [dict(row) for row in top_call_round_rows],
        },
        "councils": {
            "evaluationsByDecision": {row["key"]: row["count"] for row in evaluation_decision_rows},
        },
        "progressReports": {
            "total": int((progress_row or {}).get("total_reports", 0)),
            "avgScore": float((progress_row or {}).get("avg_mentor_score", 0)),
            "overdueTotal": int((overdue_row or {}).get("overdue_total", 0)),
        },
    }
