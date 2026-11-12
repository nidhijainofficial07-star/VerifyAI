
import os
import json
from datetime import datetime, timezone
from typing import Literal

from brand_routes import router as brand_router
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import get_connection, create_tables
from brand import get_brand_profile
from rules import analyze_content
from auth_routes import router as auth_router, admin_router
from auth import require_roles, get_current_user

app = FastAPI(
    title="VerityAI API",
    description="Evidence-Backed Explainable Brand Compliance",
    version="1.0.0"
)

create_tables()
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(brand_router)
# CORS configuration
frontend_origin = os.getenv("FRONTEND_ORIGIN")

allowed_origins = [
    "https://frontend-roan-omega-94.vercel.app",
    "http://localhost:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if frontend_origin:
    allowed_origins.append(frontend_origin.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


class ContentRequest(BaseModel):
    content: str


class ReviewRequest(BaseModel):
    review_status: Literal["approved", "rejected", "request_changes"]
    reviewer_comment: str = ""

class IssueReviewRequest(BaseModel):
    decision: Literal["accepted", "rejected", "request_changes"]
    comment: str = ""
    correction: str = ""


class ReopenRequest(BaseModel):
    reason: str = ""

@app.get("/")
def home():
    return {
        "message": "Welcome to VerityAI API",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "VerityAI Backend"
    }


@app.get("/brand")
def get_brand(current_user=Depends(get_current_user)):
    return get_brand_profile()

@app.post("/analyze")
def analyze(
    request: ContentRequest,
    current_user: dict = Depends(require_roles("creator", "admin"))
):
    result = analyze_content(request.content)
    created_at = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO reports (
                    brand,
                    content,
                    result_json,
                    created_at,
                    creator_id
                )
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (
                result["brand"],
                request.content,
                json.dumps(result),
                created_at,
                current_user["id"]
            ))

            report_id = cursor.fetchone()["id"]

    return {
        "report_id": report_id,
        "created_at": created_at,
        **result
    }

@app.get("/reports")
def get_reports(
    current_user: dict = Depends(get_current_user)
):
    with get_connection() as connection:
        with connection.cursor() as cursor:

            if current_user["role"] in ("reviewer", "admin"):
                cursor.execute("""
                    SELECT *
                    FROM reports
                    ORDER BY id DESC
                """)
            else:
                cursor.execute("""
                    SELECT *
                    FROM reports
                    WHERE creator_id = %s
                    ORDER BY id DESC
                """, (current_user["id"],))

            rows = cursor.fetchall()

    reports = []

    for row in rows:
        reports.append({
            "report_id": row["id"],
            "brand": row["brand"],
            "content": row["content"],
            "result": json.loads(row["result_json"]),
            "created_at": row["created_at"],
            "review_status": row["review_status"],
            "reviewer_comment": row["reviewer_comment"]
        })

    return {
        "total_reports": len(reports),
        "reports": reports
    }

@app.post("/reports/{report_id}/review")
def review_report(
    report_id: int,
    request: ReviewRequest,
    current_user: dict = Depends(require_roles("reviewer", "admin"))
):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM reports WHERE id = %s",
                (report_id,)
            )

            report = cursor.fetchone()

            if (
                request.review_status in ("rejected", "request_changes")
                and not request.reviewer_comment.strip()
            ):
                raise HTTPException(
                    status_code=400,
                    detail="A comment is required for this decision."
                )

            cursor.execute("""
                UPDATE reports
                SET review_status = %s,
                    reviewer_comment = %s,
                    reviewer_id = %s,
                    reviewed_at = NOW()
                WHERE id = %s
            """, (
                request.review_status,
                request.reviewer_comment,
                current_user["id"],
                report_id
            ))

            cursor.execute("""
                INSERT INTO review_history (
                    report_id,
                    reviewer_id,
                    action,
                    comment
                )
                VALUES (%s, %s, %s, %s)
            """, (
                report_id,
                current_user["id"],
                request.review_status,
                request.reviewer_comment
            ))

    return {
        "message": "Review decision saved successfully",
        "report_id": report_id,
        "review_status": request.review_status,
        "reviewer_comment": request.reviewer_comment
    }


@app.get("/admin/stats")
def get_admin_stats(
    current_user: dict = Depends(require_roles("admin"))
):
    with get_connection() as connection:
        with connection.cursor() as cursor:

            # Count users by role
            cursor.execute("""
                SELECT
                    COUNT(*) AS total_users,
                    COUNT(*) FILTER (WHERE role = 'creator') AS total_creators,
                    COUNT(*) FILTER (WHERE role = 'reviewer') AS total_reviewers,
                    COUNT(*) FILTER (WHERE role = 'admin') AS total_admins
                FROM users
                WHERE is_active = TRUE
            """)
            user_stats = cursor.fetchone()

            # Count reports by review status
            cursor.execute("""
                SELECT
                    COUNT(*) AS total_reports,
                    COUNT(*) FILTER (
                        WHERE review_status = 'pending'
                    ) AS pending_reviews,
                    COUNT(*) FILTER (
                        WHERE review_status IN ('approved', 'rejected', 'request_changes')
                    ) AS completed_reviews
                FROM reports
            """)
            report_stats = cursor.fetchone()

    return {
        "users": {
            "total": user_stats["total_users"],
            "creators": user_stats["total_creators"],
            "reviewers": user_stats["total_reviewers"],
            "admins": user_stats["total_admins"]
        },
        "reports": {
            "total": report_stats["total_reports"],
            "pending": report_stats["pending_reviews"],
            "completed": report_stats["completed_reviews"]
        }
    }

@app.post("/reports/{report_id}/issues/{issue_index}/review")
def review_issue(
    report_id: int,
    issue_index: int,
    request: IssueReviewRequest,
    current_user: dict = Depends(
        require_roles("reviewer", "admin")
    )
):
    if issue_index < 0:
        raise HTTPException(
            status_code=400,
            detail="Invalid issue index."
        )

    if (
        request.decision in ("rejected", "request_changes")
        and not request.comment.strip()
    ):
        raise HTTPException(
            status_code=400,
            detail="A comment is required for this decision."
        )

    with get_connection() as connection:
        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT result_json, review_status
                FROM reports
                WHERE id = %s
            """, (report_id,))

            report = cursor.fetchone()

            if report is None:
                raise HTTPException(
                    status_code=404,
                    detail="Report not found."
                )

            if report["review_status"] == "pending":
                pass
            elif report["review_status"] in (
                "approved", "rejected", "request_changes"
            ):
                raise HTTPException(
                    status_code=409,
                    detail="Reopen this report before reviewing issues."
                )

            result = json.loads(report["result_json"])
            issues = result.get("issues", [])

            if issue_index >= len(issues):
                raise HTTPException(
                    status_code=404,
                    detail="Issue not found."
                )

            cursor.execute("""
                INSERT INTO issue_reviews (
                    report_id,
                    issue_index,
                    reviewer_id,
                    decision,
                    comment,
                    correction
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, created_at
            """, (
                report_id,
                issue_index,
                current_user["id"],
                request.decision,
                request.comment,
                request.correction
            ))

            saved = cursor.fetchone()

    return {
        "message": "Issue decision saved successfully.",
        "review_id": saved["id"],
        "report_id": report_id,
        "issue_index": issue_index,
        "decision": request.decision,
        "created_at": saved["created_at"]
    }

@app.post("/reports/{report_id}/reopen")
def reopen_report(
    report_id: int,
    request: ReopenRequest,
    current_user: dict = Depends(
        require_roles("reviewer", "admin")
    )
):
    with get_connection() as connection:
        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT review_status
                FROM reports
                WHERE id = %s
            """, (report_id,))

            report = cursor.fetchone()

            if report is None:
                raise HTTPException(
                    status_code=404,
                    detail="Report not found."
                )

            if report["review_status"] not in (
                "approved", "rejected", "request_changes"
            ):
                raise HTTPException(
                    status_code=409,
                    detail="Only completed reports can be reopened."
                )

            cursor.execute("""
                UPDATE reports
                SET review_status = 'pending',
                    reviewer_comment = '',
                    reviewer_id = NULL,
                    reviewed_at = NULL
                WHERE id = %s
            """, (report_id,))

            cursor.execute("""
                INSERT INTO review_history (
                    report_id,
                    reviewer_id,
                    action,
                    comment
                )
                VALUES (%s, %s, 'reopened', %s)
            """, (
                report_id,
                current_user["id"],
                request.reason
            ))

    return {
        "message": "Report reopened successfully.",
        "report_id": report_id,
        "review_status": "pending"
    }

@app.get("/reports/{report_id}/history")
def get_review_history(
    report_id: int,
    current_user: dict = Depends(
        require_roles("reviewer", "admin")
    )
):
    with get_connection() as connection:
        with connection.cursor() as cursor:

            cursor.execute(
                "SELECT id FROM reports WHERE id = %s",
                (report_id,)
            )

            if cursor.fetchone() is None:
                raise HTTPException(
                    status_code=404,
                    detail="Report not found."
                )

            cursor.execute("""
                SELECT
                    rh.id,
                    rh.action,
                    rh.comment,
                    rh.created_at,
                    rh.reviewer_id,
                    u.name AS reviewer_name
                FROM review_history rh
                LEFT JOIN users u ON u.id = rh.reviewer_id
                WHERE rh.report_id = %s
                ORDER BY rh.created_at DESC, rh.id DESC
            """, (report_id,))

            history = cursor.fetchall()

    return {
        "report_id": report_id,
        "total_decisions": len(history),
        "history": history
    }
@app.get("/reviewer/activity")
def get_reviewer_activity(
    current_user: dict = Depends(require_roles("reviewer"))
):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("""
                WITH months AS (
                    SELECT generate_series(
                        DATE_TRUNC('month', CURRENT_DATE)
                            - INTERVAL '5 months',
                        DATE_TRUNC('month', CURRENT_DATE),
                        INTERVAL '1 month'
                    ) AS month
                )
                SELECT
                    TO_CHAR(months.month, 'YYYY-MM') AS month,
                    COUNT(rh.id) AS total_reviews
                FROM months
                LEFT JOIN review_history rh
                    ON DATE_TRUNC('month', rh.created_at) = months.month
                    AND rh.reviewer_id = %s
                    AND rh.action IN (
                        'approved',
                        'rejected',
                        'request_changes'
                    )
                GROUP BY months.month
                ORDER BY months.month
            """, (current_user["id"],))

            activity = cursor.fetchall()

    return {
        "activity": activity
    }

@app.get("/reports/{report_id}/issues/reviews")
def get_issue_reviews(
    report_id: int,
    current_user: dict = Depends(
        require_roles("reviewer", "admin")
    )
):
    with get_connection() as connection:
        with connection.cursor() as cursor:

            cursor.execute(
                "SELECT id FROM reports WHERE id = %s",
                (report_id,)
            )

            if cursor.fetchone() is None:
                raise HTTPException(
                    status_code=404,
                    detail="Report not found."
                )

            cursor.execute("""
                SELECT
                    ir.id,
                    ir.issue_index,
                    ir.decision,
                    ir.comment,
                    ir.correction,
                    ir.created_at,
                    ir.reviewer_id,
                    u.name AS reviewer_name
                FROM issue_reviews ir
                LEFT JOIN users u ON u.id = ir.reviewer_id
                WHERE ir.report_id = %s
                ORDER BY ir.created_at DESC, ir.id DESC
            """, (report_id,))

            reviews = cursor.fetchall()

    return {
        "report_id": report_id,
        "total_reviews": len(reviews),
        "reviews": reviews
    }