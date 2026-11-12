
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List

from database import get_connection
from auth import get_current_user, require_roles


router = APIRouter(prefix="/brand", tags=["Brand Knowledge"])

BRAND_ID = "smartdesk_demo"


# -----------------------------
# REQUEST MODELS
# -----------------------------

class GuidelineInput(BaseModel):
    title: str = Field(min_length=1)
    description: str = ""
    category: str = "General"
    rule: str = Field(min_length=1)
    severity: str = "medium"
    active: bool = True


class GuidelineActiveInput(BaseModel):
    active: bool


class FactInput(BaseModel):
    product_name: str = Field(min_length=1)
    approved_price: float = Field(ge=0)
    currency: str = "INR"
    specification: str = ""
    approved_description: str = ""


class TerminologyInput(BaseModel):
    preferred: str = Field(min_length=1)
    restricted: str = Field(min_length=1)
    alternative: str = ""


# -----------------------------
# HELPERS
# -----------------------------

def get_next_version(cursor, table, key_column, key_value):
    # Table and column names are supplied only by our own route functions.
    cursor.execute(
        f"""
        SELECT COALESCE(MAX(version), 0) + 1 AS next_version
        FROM {table}
        WHERE brand_id = %s AND {key_column} = %s
        """,
        (BRAND_ID, key_value),
    )
    return cursor.fetchone()["next_version"]


def serialize_guideline(row):
    return {
        "id": str(row["id"]),
        "title": row["title"],
        "description": row["description"] or "",
        "category": row["category"] or "General",
        "rule": row["rule"],
        "severity": row["severity"],
        "active": row["active"],
        "created_at": row["created_at"].isoformat()
        if row["created_at"] else None,
        "version": row["version"],
    }


def serialize_fact(row):
    specifications = row["specifications"] or []

    return {
        "id": str(row["id"]),
        "product_name": row["product_name"],
        "approved_price": float(row["approved_price"]),
        "currency": row["currency"],
        "specifications": specifications,
        "approved_description": row["approved_description"] or "",
        "updated_at": row["updated_at"].isoformat()
        if row["updated_at"] else None,
        "version": row["version"],
    }


def serialize_terminology(row):
    return {
        "id": str(row["id"]),
        "preferred": row["preferred"],
        "restricted": row["restricted"],
        "alternative": row["alternative"] or "",
        "version": row["version"],
    }


def split_specification(value):
    return [
        item.strip()
        for item in value.split(";")
        if item.strip()
    ]


# -----------------------------
# READ GUIDELINES
# -----------------------------

@router.get("/guidelines")
def get_guidelines(
    current_user=Depends(get_current_user),
):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT ON (title) *
                FROM brand_guidelines
                WHERE brand_id = %s
                ORDER BY title, version DESC
                """,
                (BRAND_ID,),
            )
            rows = cursor.fetchall()

    return {
        "guidelines": [serialize_guideline(row) for row in rows]
    }


# -----------------------------
# CREATE GUIDELINE
# -----------------------------

@router.post("/guidelines")
def create_guideline(
    data: GuidelineInput,
    current_user=Depends(require_roles("admin")),
):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id FROM brand_guidelines
                WHERE brand_id = %s AND title = %s AND active = TRUE
                """,
                (BRAND_ID, data.title.strip()),
            )

            if cursor.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail="An active guideline with this title already exists. Edit the existing guideline instead.",
                )

            version = get_next_version(
                cursor, "brand_guidelines", "title", data.title.strip()
            )

            cursor.execute(
                """
                INSERT INTO brand_guidelines
                (brand_id, title, description, category, rule,
                 severity, source_title, version, active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    BRAND_ID,
                    data.title.strip(),
                    data.description,
                    data.category,
                    data.rule.strip(),
                    data.severity,
                    "Admin managed",
                    version,
                    data.active,
                ),
            )
            row = cursor.fetchone()

    return {"guideline": serialize_guideline(row)}


# -----------------------------
# EDIT GUIDELINE - NEW VERSION
# -----------------------------

@router.put("/guidelines/{guideline_id}")
def update_guideline(
    guideline_id: int,
    data: GuidelineInput,
    current_user=Depends(require_roles("admin")),
):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM brand_guidelines
                WHERE id = %s AND brand_id = %s
                """,
                (guideline_id, BRAND_ID),
            )
            old = cursor.fetchone()

            if not old:
                raise HTTPException(status_code=404, detail="Guideline not found.")

            title = data.title.strip()

            # Deactivate the previous active version of this guideline.
            cursor.execute(
                """
                UPDATE brand_guidelines
                SET active = FALSE, updated_at = NOW()
                WHERE brand_id = %s AND title = %s AND active = TRUE
                """,
                (BRAND_ID, old["title"]),
            )

            # Also prevent a title change from conflicting with another active rule.
            if title != old["title"]:
                cursor.execute(
                    """
                    SELECT id FROM brand_guidelines
                    WHERE brand_id = %s AND title = %s AND active = TRUE
                    """,
                    (BRAND_ID, title),
                )
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=409,
                        detail="Another active guideline already uses this title.",
                    )

            version = get_next_version(
                cursor, "brand_guidelines", "title", title
            )

            cursor.execute(
                """
                INSERT INTO brand_guidelines
                (brand_id, title, description, category, rule,
                 severity, source_title, version, active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    BRAND_ID,
                    title,
                    data.description,
                    data.category,
                    data.rule.strip(),
                    data.severity,
                    "Admin managed",
                    version,
                    data.active,
                ),
            )
            row = cursor.fetchone()

    return {"guideline": serialize_guideline(row)}


# -----------------------------
# ACTIVATE / DEACTIVATE GUIDELINE
# -----------------------------

@router.patch("/guidelines/{guideline_id}/active")
def set_guideline_active(
    guideline_id: int,
    data: GuidelineActiveInput,
    current_user=Depends(require_roles("admin")),
):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM brand_guidelines
                WHERE id = %s AND brand_id = %s
                """,
                (guideline_id, BRAND_ID),
            )
            row = cursor.fetchone()

            if not row:
                raise HTTPException(status_code=404, detail="Guideline not found.")

            if data.active:
                cursor.execute(
                    """
                    UPDATE brand_guidelines
                    SET active = FALSE, updated_at = NOW()
                    WHERE brand_id = %s AND title = %s AND active = TRUE
                    """,
                    (BRAND_ID, row["title"]),
                )

            cursor.execute(
                """
                UPDATE brand_guidelines
                SET active = %s, updated_at = NOW()
                WHERE id = %s AND brand_id = %s
                RETURNING *
                """,
                (data.active, guideline_id, BRAND_ID),
            )
            updated = cursor.fetchone()

    return {"guideline": serialize_guideline(updated)}



# -----------------------------
# DELETE GUIDELINE - PERMANENT DELETE
# -----------------------------

@router.delete("/guidelines/{guideline_id}")
def delete_guideline(
    guideline_id: int,
    current_user=Depends(require_roles("admin")),
):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM brand_guidelines
                WHERE id = %s AND brand_id = %s
                RETURNING id
                """,
                (guideline_id, BRAND_ID),
            )

            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="Guideline not found."
                )

    return {"message": "Guideline deleted successfully."}

# -----------------------------
# READ PRODUCT FACTS
# -----------------------------

@router.get("/facts")
def get_facts(
    current_user=Depends(get_current_user),
):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT ON (product_name) *
                FROM brand_products
                WHERE brand_id = %s AND active = TRUE
                ORDER BY product_name, version DESC
                """,
                (BRAND_ID,),
            )
            rows = cursor.fetchall()

    return {"facts": [serialize_fact(row) for row in rows]}


# -----------------------------
# CREATE PRODUCT FACT
# -----------------------------

@router.post("/facts")
def create_fact(
    data: FactInput,
    current_user=Depends(require_roles("admin")),
):
    product_name = data.product_name.strip()

    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id FROM brand_products
                WHERE brand_id = %s AND product_name = %s AND active = TRUE
                """,
                (BRAND_ID, product_name),
            )

            if cursor.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail="An active product with this name already exists. Edit the existing product instead.",
                )

            version = get_next_version(
                cursor, "brand_products", "product_name", product_name
            )

            cursor.execute(
                """
                INSERT INTO brand_products
                (brand_id, product_name, approved_price, currency,
                 specifications, approved_description, source_title,
                 version, active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                RETURNING *
                """,
                (
                    BRAND_ID,
                    product_name,
                    data.approved_price,
                    data.currency,
                    split_specification(data.specification),
                    data.approved_description,
                    "Admin managed",
                    version,
                ),
            )
            row = cursor.fetchone()

    return {"fact": serialize_fact(row)}


# -----------------------------
# EDIT PRODUCT FACT - NEW VERSION
# -----------------------------

@router.put("/facts/{fact_id}")
def update_fact(
    fact_id: int,
    data: FactInput,
    current_user=Depends(require_roles("admin")),
):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM brand_products
                WHERE id = %s AND brand_id = %s
                """,
                (fact_id, BRAND_ID),
            )
            old = cursor.fetchone()

            if not old:
                raise HTTPException(status_code=404, detail="Product fact not found.")

            product_name = data.product_name.strip()

            cursor.execute(
                """
                UPDATE brand_products
                SET active = FALSE, updated_at = NOW()
                WHERE brand_id = %s AND product_name = %s AND active = TRUE
                """,
                (BRAND_ID, old["product_name"]),
            )

            if product_name != old["product_name"]:
                cursor.execute(
                    """
                    SELECT id FROM brand_products
                    WHERE brand_id = %s AND product_name = %s AND active = TRUE
                    """,
                    (BRAND_ID, product_name),
                )
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=409,
                        detail="Another active product already uses this name.",
                    )

            version = get_next_version(
                cursor, "brand_products", "product_name", product_name
            )

            cursor.execute(
                """
                INSERT INTO brand_products
                (brand_id, product_name, approved_price, currency,
                 specifications, approved_description, source_title,
                 version, active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                RETURNING *
                """,
                (
                    BRAND_ID,
                    product_name,
                    data.approved_price,
                    data.currency,
                    split_specification(data.specification),
                    data.approved_description,
                    "Admin managed",
                    version,
                ),
            )
            row = cursor.fetchone()

    return {"fact": serialize_fact(row)}



# -----------------------------
# DELETE PRODUCT FACT - PERMANENT DELETE
# -----------------------------

@router.delete("/facts/{fact_id}")
def delete_fact(
    fact_id: int,
    current_user=Depends(require_roles("admin")),
):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM brand_products
                WHERE id = %s AND brand_id = %s
                RETURNING id
                """,
                (fact_id, BRAND_ID),
            )

            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="Product fact not found."
                )

    return {"message": "Product fact deleted successfully."}

# -----------------------------
# READ TERMINOLOGY
# -----------------------------

@router.get("/terminology")
def get_terminology(
    current_user=Depends(get_current_user),
):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT ON (restricted) *
                FROM brand_terminology
                WHERE brand_id = %s AND active = TRUE
                ORDER BY restricted, version DESC
                """,
                (BRAND_ID,),
            )
            rows = cursor.fetchall()

    return {
        "terminology": [serialize_terminology(row) for row in rows]
    }


# -----------------------------
# CREATE TERMINOLOGY
# -----------------------------

@router.post("/terminology")
def create_terminology(
    data: TerminologyInput,
    current_user=Depends(require_roles("admin")),
):
    restricted = data.restricted.strip()

    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id FROM brand_terminology
                WHERE brand_id = %s AND restricted = %s AND active = TRUE
                """,
                (BRAND_ID, restricted),
            )

            if cursor.fetchone():
                raise HTTPException(
                    status_code=409,
                    detail="This restricted term already exists. Edit the existing entry instead.",
                )

            version = get_next_version(
                cursor, "brand_terminology", "restricted", restricted
            )

            cursor.execute(
                """
                INSERT INTO brand_terminology
                (brand_id, preferred, restricted, alternative,
                 source_title, version, active)
                VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                RETURNING *
                """,
                (
                    BRAND_ID,
                    data.preferred.strip(),
                    restricted,
                    data.alternative,
                    "Admin managed",
                    version,
                ),
            )
            row = cursor.fetchone()

    return {"terminology": serialize_terminology(row)}


# -----------------------------
# EDIT TERMINOLOGY - NEW VERSION
# -----------------------------

@router.put("/terminology/{term_id}")
def update_terminology(
    term_id: int,
    data: TerminologyInput,
    current_user=Depends(require_roles("admin")),
):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT * FROM brand_terminology
                WHERE id = %s AND brand_id = %s
                """,
                (term_id, BRAND_ID),
            )
            old = cursor.fetchone()

            if not old:
                raise HTTPException(status_code=404, detail="Terminology entry not found.")

            restricted = data.restricted.strip()

            cursor.execute(
                """
                UPDATE brand_terminology
                SET active = FALSE, updated_at = NOW()
                WHERE brand_id = %s AND restricted = %s AND active = TRUE
                """,
                (BRAND_ID, old["restricted"]),
            )

            if restricted != old["restricted"]:
                cursor.execute(
                    """
                    SELECT id FROM brand_terminology
                    WHERE brand_id = %s AND restricted = %s AND active = TRUE
                    """,
                    (BRAND_ID, restricted),
                )
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=409,
                        detail="Another active terminology entry already uses this restricted term.",
                    )

            version = get_next_version(
                cursor, "brand_terminology", "restricted", restricted
            )

            cursor.execute(
                """
                INSERT INTO brand_terminology
                (brand_id, preferred, restricted, alternative,
                 source_title, version, active)
                VALUES (%s, %s, %s, %s, %s, %s, TRUE)
                RETURNING *
                """,
                (
                    BRAND_ID,
                    data.preferred.strip(),
                    restricted,
                    data.alternative,
                    "Admin managed",
                    version,
                ),
            )
            row = cursor.fetchone()

    return {"terminology": serialize_terminology(row)}



# -----------------------------
# DELETE TERMINOLOGY - PERMANENT DELETE
# -----------------------------

@router.delete("/terminology/{term_id}")
def delete_terminology(
    term_id: int,
    current_user=Depends(require_roles("admin")),
):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM brand_terminology
                WHERE id = %s AND brand_id = %s
                RETURNING id
                """,
                (term_id, BRAND_ID),
            )

            if not cursor.fetchone():
                raise HTTPException(
                    status_code=404,
                    detail="Terminology entry not found."
                )

    return {"message": "Terminology entry deleted successfully."}
