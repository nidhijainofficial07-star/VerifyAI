
import re
from database import get_connection


def get_brand_profile():

    with get_connection() as connection:
        with connection.cursor() as cursor:

            # Fetch brand
            cursor.execute("""
                SELECT brand_id, brand_name
                FROM brands
                WHERE brand_id = %s
            """, ("smartdesk_demo",))

            brand = cursor.fetchone()

            if not brand:
                raise RuntimeError("SmartDesk brand not found in database.")

            # Fetch active approved product
            cursor.execute("""
                SELECT *
                FROM brand_products
                WHERE brand_id = %s
                  AND active = TRUE
                ORDER BY version DESC
                LIMIT 1
            """, (brand["brand_id"],))

            product = cursor.fetchone()

            if not product:
                raise RuntimeError("No active approved product found.")

            # Fetch active guidelines
            cursor.execute("""
                SELECT *
                FROM brand_guidelines
                WHERE brand_id = %s
                  AND active = TRUE
                ORDER BY id
            """, (brand["brand_id"],))

            guidelines = cursor.fetchall()

            # Fetch active terminology
            cursor.execute("""
                SELECT preferred
                FROM brand_terminology
                WHERE brand_id = %s
                  AND active = TRUE
            """, (brand["brand_id"],))

            terminology_rows = cursor.fetchall()

    product_name = product["product_name"]
    approved_price = float(product["approved_price"])

    if approved_price.is_integer():
        approved_price = int(approved_price)

    currency = product["currency"]

    currency_symbol = "₹" if currency == "INR" else currency

    # Product evidence reference
    product_reference = {
        "evidence_id": f"brand_products:{product['id']}",
        "product_id": product["id"],
        "source_type": "approved_product_fact",
        "source_title": product["source_title"],
        "version": product["version"],
        "approved_value": f"{currency_symbol}{approved_price:,}"
    }

    # Extract restricted claims and their database references
    restricted_claims = []
    claim_references = {}

    for guideline in guidelines:

        match = re.search(r"'([^']+)'", guideline["rule"])

        if match:
            claim = match.group(1)
            restricted_claims.append(claim)

            claim_references[claim] = {
                "evidence_id": f"brand_guidelines:{guideline['id']}",
                "guideline_id": guideline["id"],
                "source_type": "brand_guideline",
                "source_title": guideline["source_title"],
                "guideline_title": guideline["title"],
                "guideline_rule": guideline["rule"],
                "severity": guideline["severity"],
                "version": guideline["version"],
                "approved_value": "Supporting evidence required before approval"
            }

    approved_terminology = list(dict.fromkeys(
        [product_name]
        + list(product["specifications"] or [])
        + [row["preferred"] for row in terminology_rows]
    ))

    return {
        "brand_id": brand["brand_id"],
        "brand_name": brand["brand_name"],

        "approved_facts": {
            "product_name": product_name,
            "price": approved_price,
            "currency": currency,
            "specifications": list(product["specifications"] or []),
            "description": product["approved_description"]
        },

        "approved_terminology": approved_terminology,

        "restricted_claims": restricted_claims,

        "evidence_references": {
            "product_name": {
                **product_reference,
                "approved_value": product_name
            },
            "price": product_reference,
            "restricted_claims": claim_references
        }
    }
