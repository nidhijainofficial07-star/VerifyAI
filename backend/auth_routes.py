from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr, Field

from database import get_connection
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_roles
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

admin_router = APIRouter(prefix="/admin", tags=["Administration"])

class RegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class CreateReviewerRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest):
    name = request.name.strip()
    email = str(request.email).strip().lower()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name cannot be empty."
        )

    password = request.password

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM users WHERE email = %s",
                (email,)
            )

            if cursor.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail="An account with this email already exists."
                )

            cursor.execute("""
                INSERT INTO users (name, email, password_hash, role)
                VALUES (%s, %s, %s, 'creator')
                RETURNING id, name, email, role
            """, (name, email, hash_password(password)))

            user = cursor.fetchone()

    token = create_access_token(user)

    return {
        "message": "Creator account created successfully.",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }


@router.post("/login")
def login(request: LoginRequest):
    email = str(request.email).strip().lower()

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, email, password_hash, role, is_active
                FROM users
                WHERE email = %s
            """, (email,))

            user = cursor.fetchone()

    if (
        user is None
        or not user["is_active"]
        or not verify_password(request.password, user["password_hash"])
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token(user)

    return {
        "message": "Login successful.",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }
@router.get("/me")
def get_my_profile(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user["role"]
    }

@admin_router.post("/reviewers", status_code=status.HTTP_201_CREATED)
def create_reviewer(
    request: CreateReviewerRequest,
    current_user: dict = Depends(require_roles("admin"))
):
    name = request.name.strip()
    email = str(request.email).strip().lower()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Name cannot be empty."
        )

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM users WHERE email = %s",
                (email,)
            )

            if cursor.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail="An account with this email already exists."
                )

            cursor.execute("""
                INSERT INTO users (
                    name, email, password_hash, role
                )
                VALUES (%s, %s, %s, 'reviewer')
                RETURNING id, name, email, role
            """, (
                name,
                email,
                hash_password(request.password)
            ))

            reviewer = cursor.fetchone()

    return {
        "message": "Reviewer account created successfully.",
        "reviewer": {
            "id": reviewer["id"],
            "name": reviewer["name"],
            "email": reviewer["email"],
            "role": reviewer["role"]
        }
    }

@admin_router.get("/reviewers")
def get_reviewers(
    current_user: dict = Depends(require_roles("admin"))
):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, email, role
                FROM users
                WHERE role = 'reviewer'
                  AND is_active = TRUE
                ORDER BY id DESC
            """)

            reviewers = cursor.fetchall()

    return {
        "total_reviewers": len(reviewers),
        "reviewers": reviewers
    }

@admin_router.delete("/reviewers/{reviewer_id}")
def delete_reviewer(
    reviewer_id: int,
    current_user: dict = Depends(require_roles("admin"))
):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE users
                SET is_active = FALSE
                WHERE id = %s
                  AND role = 'reviewer'
                  AND is_active = TRUE
                RETURNING id
            """, (reviewer_id,))

            deleted_reviewer = cursor.fetchone()

            if deleted_reviewer is None:
                raise HTTPException(
                    status_code=404,
                    detail="Active reviewer not found."
                )

    return {
        "message": "Reviewer account deactivated successfully.",
        "reviewer_id": reviewer_id
    }