import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv(Path(__file__).resolve().parent / ".env")
import os
import psycopg
from psycopg.rows import dict_row


def get_connection():
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is not configured. "
            "Please set your Neon PostgreSQL connection string."
        )

    return psycopg.connect(
        database_url,
        row_factory=dict_row
    )


def create_tables():
    with get_connection() as connection:
        with connection.cursor() as cursor:

            # -------------------------------------------------
            # USERS
            # -------------------------------------------------

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id BIGSERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'creator'
                        CHECK (role IN ('creator', 'reviewer', 'admin')),
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)

            # -------------------------------------------------
            # REVIEWER REGISTRATION REQUESTS
            # -------------------------------------------------

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS reviewer_requests (
                    id BIGSERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    password_hash TEXT,
                    status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
                    reviewed_by BIGINT
                        REFERENCES users(id) ON DELETE SET NULL,
                    reviewed_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)

            # Prevent duplicate pending requests for the same email.
            cursor.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS
                idx_one_pending_reviewer_request
                ON reviewer_requests (LOWER(email))
                WHERE status = 'pending'
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS
                idx_reviewer_requests_status
                ON reviewer_requests(status, created_at DESC)
            """)


            # -------------------------------------------------
            # REPORTS
            # -------------------------------------------------

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS reports (
                    id BIGSERIAL PRIMARY KEY,
                    brand TEXT NOT NULL,
                    content TEXT NOT NULL,
                    result_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    review_status TEXT DEFAULT 'pending',
                    reviewer_comment TEXT DEFAULT ''
                )
            """)

            cursor.execute("""
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS creator_id BIGINT
                REFERENCES users(id) ON DELETE SET NULL
            """)

            cursor.execute("""
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS reviewer_id BIGINT
                REFERENCES users(id) ON DELETE SET NULL
            """)

            cursor.execute("""
                ALTER TABLE reports
                ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ
            """)

            # -------------------------------------------------
# REPORT REVIEW HISTORY
# -------------------------------------------------

            cursor.execute("""
    CREATE TABLE IF NOT EXISTS review_history (
        id BIGSERIAL PRIMARY KEY,
        report_id BIGINT NOT NULL
            REFERENCES reports(id) ON DELETE CASCADE,
        reviewer_id BIGINT
            REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL CHECK (
            action IN (
                'approved',
                'rejected',
                'request_changes',
                'reopened'
            )
        ),
        comment TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
""")

# -------------------------------------------------
# ISSUE-LEVEL REVIEW HISTORY
# -------------------------------------------------

            cursor.execute("""
    CREATE TABLE IF NOT EXISTS issue_reviews (
        id BIGSERIAL PRIMARY KEY,
        report_id BIGINT NOT NULL
            REFERENCES reports(id) ON DELETE CASCADE,
        issue_index INTEGER NOT NULL,
        reviewer_id BIGINT
            REFERENCES users(id) ON DELETE SET NULL,
        decision TEXT NOT NULL CHECK (
            decision IN (
                'accepted',
                'rejected',
                'request_changes'
            )
        ),
        comment TEXT NOT NULL DEFAULT '',
        correction TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
""")

            cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_review_history_report
    ON review_history(report_id, created_at DESC)
""")

            cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_issue_reviews_report
    ON issue_reviews(report_id, issue_index, created_at DESC)
""")

            # -------------------------------------------------
            # NOTIFICATIONS
            # -------------------------------------------------

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL
                        REFERENCES users(id) ON DELETE CASCADE,
                    report_id BIGINT
                        REFERENCES reports(id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL DEFAULT '',
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_notifications_user
                ON notifications(user_id, is_read, created_at DESC)
            """)
            
            # -------------------------------------------------
            # BRANDS
            # -------------------------------------------------

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS brands (
                    brand_id TEXT PRIMARY KEY,
                    brand_name TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)

            # -------------------------------------------------
            # APPROVED PRODUCT FACTS
            # -------------------------------------------------

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS brand_products (
                    id BIGSERIAL PRIMARY KEY,
                    brand_id TEXT NOT NULL
                        REFERENCES brands(brand_id) ON DELETE CASCADE,
                    product_name TEXT NOT NULL,
                    approved_price NUMERIC(12, 2),
                    currency TEXT NOT NULL DEFAULT 'INR',
                    specifications TEXT[] NOT NULL DEFAULT '{}',
                    approved_description TEXT NOT NULL DEFAULT '',
                    source_title TEXT NOT NULL DEFAULT 'Approved Product Facts',
                    version INTEGER NOT NULL DEFAULT 1,
                    active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (brand_id, product_name, version)
                )
            """)

            # Only one active version of a product at a time.
            cursor.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS
                idx_one_active_product_version
                ON brand_products (brand_id, product_name)
                WHERE active = TRUE
            """)

            # -------------------------------------------------
            # BRAND GUIDELINES
            # -------------------------------------------------

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS brand_guidelines (
                    id BIGSERIAL PRIMARY KEY,
                    brand_id TEXT NOT NULL
                        REFERENCES brands(brand_id) ON DELETE CASCADE,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    category TEXT NOT NULL DEFAULT 'General',
                    rule TEXT NOT NULL,
                    severity TEXT NOT NULL DEFAULT 'medium'
                        CHECK (
                            severity IN ('critical', 'high', 'medium', 'low')
                        ),
                    source_title TEXT NOT NULL DEFAULT 'Brand Guidelines',
                    version INTEGER NOT NULL DEFAULT 1,
                    active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (brand_id, title, version)
                )
            """)

            cursor.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS
                idx_one_active_guideline_version
                ON brand_guidelines (brand_id, title)
                WHERE active = TRUE
            """)

            # -------------------------------------------------
            # APPROVED TERMINOLOGY
            # -------------------------------------------------

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS brand_terminology (
                    id BIGSERIAL PRIMARY KEY,
                    brand_id TEXT NOT NULL
                        REFERENCES brands(brand_id) ON DELETE CASCADE,
                    preferred TEXT NOT NULL,
                    restricted TEXT NOT NULL,
                    alternative TEXT NOT NULL,
                    source_title TEXT NOT NULL DEFAULT 'Brand Terminology',
                    version INTEGER NOT NULL DEFAULT 1,
                    active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (brand_id, restricted, version)
                )
            """)

            cursor.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS
                idx_one_active_terminology_version
                ON brand_terminology (brand_id, restricted)
                WHERE active = TRUE
            """)

            # -------------------------------------------------
            # PERFORMANCE INDEXES
            # -------------------------------------------------

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_reports_creator_id
                ON reports(creator_id)
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_reports_reviewer_id
                ON reports(reviewer_id)
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_reports_created_at
                ON reports(created_at)
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_brand_products_lookup
                ON brand_products(brand_id, active)
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_brand_guidelines_lookup
                ON brand_guidelines(brand_id, active)
            """)

            # -------------------------------------------------
            # INITIAL SMARTDESK BRAND DATA
            # -------------------------------------------------

            cursor.execute("""
                INSERT INTO brands (brand_id, brand_name)
                VALUES (%s, %s)
                ON CONFLICT (brand_id) DO NOTHING
            """, ("smartdesk_demo", "SmartDesk"))

            cursor.execute("""
                INSERT INTO brand_products (
                    brand_id,
                    product_name,
                    approved_price,
                    currency,
                    specifications,
                    approved_description,
                    source_title,
                    version
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (brand_id, product_name, version)
                DO NOTHING
            """, (
                "smartdesk_demo",
                "SmartDesk",
                5000,
                "INR",
                ["Height adjustable"],
                "Ergonomic workstation for everyday use",
                "Approved SmartDesk Product Facts",
                1
            ))

            initial_guidelines = [
                (
                    "Unsupported No. 1 Claim",
                    "Advertising Claims",
                    "The claim 'No. 1 ergonomic desk in India' requires approved supporting evidence before publication.",
                    "medium"
                ),
                (
                    "Unsupported Productivity Claim",
                    "Advertising Claims",
                    "The claim '100% productivity improvement' requires approved supporting evidence before publication.",
                    "medium"
                )
            ]

            for title, category, rule, severity in initial_guidelines:
                cursor.execute("""
                    INSERT INTO brand_guidelines (
                        brand_id,
                        title,
                        category,
                        rule,
                        severity,
                        source_title,
                        version
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (brand_id, title, version)
                    DO NOTHING
                """, (
                    "smartdesk_demo",
                    title,
                    category,
                    rule,
                    severity,
                    "Approved SmartDesk Advertising Guidelines",
                    1
                ))

    print("VerityAI database and brand knowledge tables are ready!")


if __name__ == "__main__":
    create_tables()