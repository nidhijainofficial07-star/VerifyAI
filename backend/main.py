
import os
import json
from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import get_connection, create_tables
from brand import get_brand_profile
from rules import analyze_content


app = FastAPI(
    title="VerityAI API",
    description="Evidence-Backed Explainable Brand Compliance",
    version="1.0.0"
)

create_tables()


# CORS configuration
frontend_origin = os.getenv("FRONTEND_ORIGIN")

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
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
def get_brand():
    return get_brand_profile()


@app.post("/analyze")
def analyze(request: ContentRequest):
    result = analyze_content(request.content)
    created_at = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO reports (
                    brand,
                    content,
                    result_json,
                    created_at
                )
                VALUES (%s, %s, %s, %s)
                RETURNING id
            """, (
                result["brand"],
                request.content,
                json.dumps(result),
                created_at
            ))

            report_id = cursor.fetchone()["id"]

    return {
        "report_id": report_id,
        "created_at": created_at,
        **result
    }


@app.get("/reports")
def get_reports():
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT *
                FROM reports
                ORDER BY id DESC
            """)

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
def review_report(report_id: int, request: ReviewRequest):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM reports WHERE id = %s",
                (report_id,)
            )

            report = cursor.fetchone()

            if report is None:
                raise HTTPException(
                    status_code=404,
                    detail="Report not found"
                )

            cursor.execute("""
                UPDATE reports
                SET review_status = %s,
                    reviewer_comment = %s
                WHERE id = %s
            """, (
                request.review_status,
                request.reviewer_comment,
                report_id
            ))

    return {
        "message": "Review decision saved successfully",
        "report_id": report_id,
        "review_status": request.review_status,
        "reviewer_comment": request.reviewer_comment
    }
