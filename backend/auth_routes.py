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


class ReviewerRequestDecision(BaseModel):
    decision: str = Field(pattern="^(approve|reject)$")

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


@router.post("/reviewer-request", status_code=status.HTTP_201_CREATED)
def submit_reviewer_request(request: RegisterRequest):
    name = request.name.strip()
    email = str(request.email).strip().lower()

    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")

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
                SELECT id FROM reviewer_requests
                WHERE LOWER(email) = LOWER(%s)
                  AND status = 'pending'
            """, (email,))

            if cursor.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail="A pending request already exists for this email."
                )

            cursor.execute("""
                INSERT INTO reviewer_requests (
                    name, email, password_hash
                )
                VALUES (%s, %s, %s)
                RETURNING id
            """, (
                name,
                email,
                hash_password(request.password)
            ))

            result = cursor.fetchone()

    return {
        "message": "Reviewer request submitted. Await Admin approval.",
        "request_id": result["id"],
        "status": "pending"
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
    request: RegisterRequest,
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

@admin_router.get("/reviewer-requests")
def get_reviewer_requests(
    current_user: dict = Depends(require_roles("admin"))
):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, email, status, created_at
                FROM reviewer_requests
                WHERE status = 'pending'
                ORDER BY created_at ASC
            """)

            requests = cursor.fetchall()

    return {
        "total_requests": len(requests),
        "requests": requests
    }

@admin_router.post("/reviewer-requests/{request_id}/decision")
def decide_reviewer_request(
    request_id: int,
    request: ReviewerRequestDecision,
    current_user: dict = Depends(require_roles("admin"))
):
    with get_connection() as connection:
        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT id, name, email, password_hash, status
                FROM reviewer_requests
                WHERE id = %s
                FOR UPDATE
            """, (request_id,))

            reviewer_request = cursor.fetchone()

            if reviewer_request is None:
                raise HTTPException(
                    status_code=404,
                    detail="Reviewer request not found."
                )

            if reviewer_request["status"] != "pending":
                raise HTTPException(
                    status_code=409,
                    detail="This request has already been processed."
                )

            if request.decision == "approve":

                cursor.execute("""
                    SELECT id FROM users WHERE email = %s
                """, (reviewer_request["email"],))

                existing_user = cursor.fetchone()

                if existing_user:
                    raise HTTPException(
                        status_code=409,
                        detail="An account with this email already exists."
                    )

                cursor.execute("""
                    INSERT INTO users (
                        name, email, password_hash, role, is_active
                    )
                    VALUES (%s, %s, %s, 'reviewer', TRUE)
                """, (
                    reviewer_request["name"],
                    reviewer_request["email"],
                    reviewer_request["password_hash"]
                ))

                new_status = "approved"

            else:
                new_status = "rejected"

            cursor.execute("""
                UPDATE reviewer_requests
                SET status = %s,
                    reviewed_by = %s,
                    reviewed_at = NOW(),
                    password_hash = NULL
                WHERE id = %s
            """, (
                new_status,
                current_user["id"],
                request_id
            ))

    return {
        "message": f"Reviewer request {new_status} successfully.",
        "request_id": request_id,
        "status": new_status
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