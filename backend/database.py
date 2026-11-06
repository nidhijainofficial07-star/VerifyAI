
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

    print("VerityAI PostgreSQL database and tables are ready!")


if __name__ == "__main__":
    create_tables()
