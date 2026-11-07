
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

            # Users and authentication
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

            # Existing reports table (preserves existing data)
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

            # Add authentication-related columns safely
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

            # Useful indexes
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_reports_creator_id
                ON reports(creator_id)
            """)

            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_reports_reviewer_id
                ON reports(reviewer_id)
            """)

    print("VerityAI PostgreSQL database and authentication tables are ready!")


if __name__ == "__main__":
    create_tables()
