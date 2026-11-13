
import re
from database import get_connection


def get_brand_profile():

    with get_connection() as connection:
        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT brand_id, brand_name
                FROM brands
                WHERE brand_id = %s
            """, ("smartdesk_demo",))

            brand = cursor.fetchone()

            if not brand:
                raise RuntimeError("SmartDesk brand not found in database.")

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

            cursor.execute("""
                SELECT *
                FROM brand_guidelines
                WHERE brand_id = %s
                  AND active = TRUE
                ORDER BY id
            """, (brand["brand_id"],))

            guidelines = cursor.fetchall()


            cursor.execute("""
                SELECT
                    id,
                    promotion_name,
                    approved_price,
                    approved_discount_percentage,
                    currency,
                    valid_from,
                    valid_until,
                    active
                FROM brand_promotions
                WHERE brand_id = %s
                  AND product_id = %s
                ORDER BY valid_from DESC
            """, (brand["brand_id"], product["id"]))


            promotion_rows = cursor.fetchall()

            cursor.execute("""
                SELECT preferred, restricted, alternative,
                       source_title, version, id
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
    approved_promotions = []

    for promotion in promotion_rows:
        approved_promotions.append({
            "promotion_id": promotion["id"],
            "promotion_name": promotion["promotion_name"],
            "approved_price": (
                float(promotion["approved_price"])
                if promotion["approved_price"] is not None
                else None
            ),
            "approved_discount_percentage": (
                float(promotion["approved_discount_percentage"])
                if promotion["approved_discount_percentage"] is not None
                else None
            ),
            "currency": promotion["currency"],
            "valid_from": promotion["valid_from"].isoformat(),
            "valid_until": promotion["valid_until"].isoformat(),
            "active": promotion["active"]
        })
    product_reference = {
        "evidence_id": f"brand_products:{product['id']}",
        "product_id": product["id"],
        "source_type": "approved_product_fact",
        "source_title": product["source_title"],
        "version": product["version"],
        "approved_value": f"{currency_symbol}{approved_price:,}"
    }

    restricted_claims = []
    claim_references = {}

    # Extract quoted claims from active guidelines
    for guideline in guidelines:

        matches = re.findall(
            r"""['"]([^'"]+)['"]""",
            guideline["rule"] or ""
        )

        for claim in matches:

            if claim not in restricted_claims:
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

    # Load restricted terminology as detectable claims
    restricted_terminology = []

    for row in terminology_rows:

        restricted = row["restricted"]

        if restricted:
            restricted_terminology.append(restricted)

            if restricted not in restricted_claims:
                restricted_claims.append(restricted)

            claim_references[restricted] = {
                "evidence_id": f"brand_terminology:{row['id']}",
                "terminology_id": row["id"],
                "source_type": "restricted_terminology",
                "source_title": row["source_title"],
                "guideline_title": "Restricted Brand Terminology",
                "guideline_rule": (
                    f"Restricted term '{restricted}' should not be used. "
                    f"Suggested alternative: {row['alternative'] or 'Use approved terminology.'}"
                ),
                "severity": "medium",
                "version": row["version"],
                "approved_value": row["alternative"] or ""
            }

    approved_terminology = list(dict.fromkeys(
        [product_name]
        + list(product["specifications"] or [])
        + [
            row["preferred"]
            for row in terminology_rows
            if row["preferred"]
        ]
    ))

    return {
        "brand_id": brand["brand_id"],
        "brand": brand["brand_name"],

        "approved_facts": {
            "product_name": product_name,
            "price": approved_price,
            "currency": currency,
            "specifications": list(product["specifications"] or []),
            "description": product["approved_description"]
        },
        "approved_promotions": approved_promotions,

        "approved_terminology": approved_terminology,

        "restricted_claims": restricted_claims,
        "restricted_terminology": restricted_terminology,

        "guidelines": [
            {
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "category": row["category"],
                "rule": row["rule"],
                "severity": row["severity"],
                "source_title": row["source_title"],
                "version": row["version"]
            }
            for row in guidelines
        ],

        "evidence_references": {
            "product_name": {
                **product_reference,
                "approved_value": product_name
            },
            "price": product_reference,
            "restricted_claims": claim_references
        }
    }
