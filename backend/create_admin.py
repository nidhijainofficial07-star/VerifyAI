
import getpass

from database import get_connection
from auth import hash_password


def create_admin():
    print("\n=== VerityAI Admin Setup ===\n")

    email = input("Admin email: ").strip().lower()
    name = input("Admin name: ").strip()

    if not email or not name:
        print("Name and email are required.")
        return

    password = getpass.getpass("Admin password: ")
    confirm_password = getpass.getpass("Confirm password: ")

    if len(password) < 8:
        print("Password must contain at least 8 characters.")
        return

    if password != confirm_password:
        print("Passwords do not match.")
        return

    try:
        with get_connection() as connection:
            with connection.cursor() as cursor:

                cursor.execute("""
                    SELECT id
                    FROM users
                    WHERE role = 'admin'
                    LIMIT 1
                """)

                if cursor.fetchone():
                    print("An Admin account already exists.")
                    return

                cursor.execute("""
                    INSERT INTO users (
                        name,
                        email,
                        password_hash,
                        role
                    )
                    VALUES (%s, %s, %s, 'admin')
                    RETURNING id
                """, (
                    name,
                    email,
                    hash_password(password)
                ))

                admin = cursor.fetchone()

        print("\nAdmin account created successfully!")
        print("Admin ID:", admin["id"])
        print("Email:", email)

    except Exception as error:
        print("\nCould not create Admin account:", error)


if __name__ == "__main__":
    create_admin()
