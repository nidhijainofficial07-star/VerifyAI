
import os
import sqlite3
from pathlib import Path

DATABASE_NAME = "verityai.db"

# Use Render's persistent disk path in production.
# Otherwise, keep the database inside the backend folder locally.
DATABASE_PATH = Path(
    os.getenv(
        "VERITYAI_DATABASE_PATH",
        str(Path(__file__).resolve().parent / DATABASE_NAME)
    )
)

# Ensure the database directory exists.
DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)


def get_connection():
    connection = sqlite3.connect(str(DATABASE_PATH))
    connection.row_factory = sqlite3.Row
    return connection


def create_tables():
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                brand TEXT NOT NULL,
                content TEXT NOT NULL,
                result_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                review_status TEXT DEFAULT 'pending',
                reviewer_comment TEXT DEFAULT ''
            )
        """)

        connection.commit()

    finally:
        connection.close()


if __name__ == "__main__":
    create_tables()
    print("VerityAI database and tables created successfully!")
    print(f"Database location: {DATABASE_PATH}")
