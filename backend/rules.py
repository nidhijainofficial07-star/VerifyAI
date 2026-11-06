
import re
from brand import get_brand_profile


def analyze_content(content: str):

    brand = get_brand_profile()
    facts = brand["approved_facts"]
    issues = []

    normalized_content = content.lower()

    # 1. Product name check
    product_name = facts["product_name"]

    if product_name.lower() not in normalized_content:
        issues.append({
            "type": "product_name",
            "severity": "medium",
            "status": "needs_review",
            "message": f"Approved product name {product_name} was not found.",
            "evidence": f"Approved product name: {product_name}",
            "suggestion": f"Use the approved product name {product_name}."
        })

    # 2. Price verification
    approved_price = facts["price"]

    prices = re.findall(r"₹\s*([\d,]+)", content)

    for price_text in prices:
        mentioned_price = int(price_text.replace(",", ""))

        if mentioned_price != approved_price:
            issues.append({
                "type": "price_mismatch",
                "severity": "high",
                "status": "confirmed_mismatch",
                "message": (
                    f"Content mentions ₹{mentioned_price:,}, "
                    f"but approved price is ₹{approved_price:,}."
                ),
                "evidence": f"Approved price: ₹{approved_price:,}",
                "suggestion": f"Replace with ₹{approved_price:,}."
            })

    # 3. Unsupported claim detection
    restricted_claims = brand.get("restricted_claims", [])
    # Normalize punctuation and spaces for reliable phrase matching
    clean_content = re.sub(r"[^\w]+", " ", normalized_content)
    clean_content = " ".join(clean_content.split())

    for claim in restricted_claims:

        clean_claim = re.sub(r"[^\w]+", " ", claim.lower())
        clean_claim = " ".join(clean_claim.split())

        print("Checking claim:", claim)
        print("Matched:", clean_claim in clean_content)

        if clean_claim in clean_content:
            issues.append({
                "type": "unsupported_claim",
                "severity": "medium",
                "status": "needs_human_review",
                "message": (
                    f"The claim '{claim}' needs supporting evidence "
                    "before approval."
                ),
                "evidence": (
                    "No supporting evidence is linked "
                    "to this claim in the demo brand profile."
                ),
                "suggestion": (
                    "Provide approved evidence or revise the claim."
                )
            })

    # 4. Final analysis result
    return {
        "brand": brand["brand_name"],
        "total_issues": len(issues),
        "issues": issues,
        "overall_status": (
            "review_required" if issues else "no_issues_detected"
        )
    }
