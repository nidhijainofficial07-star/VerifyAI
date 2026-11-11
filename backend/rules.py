
import re
from brand import get_brand_profile


def analyze_content(content: str):

    brand = get_brand_profile()
    facts = brand["approved_facts"]
    references = brand.get("evidence_references", {})

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
            "suggestion": f"Use the approved product name {product_name}.",
            "evidence_reference": references.get("product_name", {})
        })

    # 2. Price verification
    approved_price = facts["price"]
    currency = facts["currency"]

    if currency == "INR":
        prices = re.findall(r"₹\s*([\d,]+)", content)
    else:
        prices = []

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
                "suggestion": f"Replace with ₹{approved_price:,}.",
                "evidence_reference": references.get("price", {})
            })


    # 3. Unsupported claim detection
    restricted_claims = brand.get("restricted_claims", [])
    claim_references = references.get("restricted_claims", {})

    def normalize_claim_text(text):
        text = text.lower()
        text = re.sub(r"\bpercent(?:age)?\b", " percent ", text)
        text = re.sub(r"(\d+)\s*%", r"\1 percent", text)
        text = re.sub(r"\bno\s*\.?\s*(\d+)\b", r"no \1", text)
        text = re.sub(r"[^\w]+", " ", text)
        return " ".join(text.split())

    clean_content = normalize_claim_text(content)

    detected_claims = set()

    # Existing exact restricted-claim matching
    for claim in restricted_claims:
        clean_claim = normalize_claim_text(claim)

        if clean_claim in clean_content:
            detected_claims.add(claim)

    # Additional rule: measurable productivity-improvement claims
    
    productivity_pattern = (
        # Example: improves productivity by 30%
        r"\b(?:improv\w*|boost\w*|increas\w*|enhanc\w*|deliver\w*)\b"
        r".{0,60}\bproductivity\b"
        r".{0,40}\bby\s+\d+(?:\.\d+)?\s*percent\b"

        # Example: 30% productivity improvement
        r"|\b\d+(?:\.\d+)?\s*percent\b"
        r".{0,30}\bproductivity\b"
        r".{0,30}\b(?:improv\w*|boost\w*|increas\w*|enhanc\w*)\b"

        # Example: productivity improvement of 30%
        r"|\bproductivity\b"
        r".{0,30}\b(?:improv\w*|boost\w*|increas\w*|enhanc\w*)\b"
        r".{0,30}\b(?:by|of)\s+\d+(?:\.\d+)?\s*percent\b"

        # Example: delivers 30% productivity improvement
        r"|\b(?:deliver\w*|offer\w*|provide\w*)\b"
        r".{0,30}\b\d+(?:\.\d+)?\s*percent\b"
        r".{0,30}\bproductivity\b"
        r".{0,30}\b(?:improv\w*|boost\w*|increas\w*|enhanc\w*)\b"
    )


    if re.search(productivity_pattern, clean_content):
        productivity_claim = next(
            (
                claim for claim in restricted_claims
                if "productivity" in claim.lower()
            ),
            None
        )

        if productivity_claim:
            detected_claims.add(productivity_claim)

    # Create findings with their original evidence references
    for claim in detected_claims:
        guideline_reference = claim_references.get(claim, {})

        issues.append({
            "type": "unsupported_claim",
            "severity": guideline_reference.get("severity", "medium"),
            "status": "needs_human_review",
            "message": (
    "A measurable productivity-improvement claim needs "
    "supporting evidence before approval."
),
            "evidence": guideline_reference.get(
                "guideline_rule",
                "No supporting evidence is linked to this claim."
            ),
            "suggestion": (
                "Provide approved evidence or revise the claim."
            ),
            "evidence_reference": guideline_reference
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
