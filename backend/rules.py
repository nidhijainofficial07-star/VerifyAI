
import re
from brand import get_brand_profile


def normalize_claim_text(text):
    text = text.lower()

    # Normalize percentage formats
    text = re.sub(r"(\d+(?:\.\d+)?)\s*%", r"\1 percent", text)
    text = re.sub(r"\bpercent(?:age)?\b", "percent", text)

    # Normalize No. 1, No 1 and Number 1
    text = re.sub(r"\bnumber\s+1\b", "no 1", text)
    text = re.sub(r"\bno\s*\.?\s*1\b", "no 1", text)

    # Remove punctuation and extra spaces
    text = re.sub(r"[^\w]+", " ", text)

    return " ".join(text.split())


def analyze_content(content: str):

    brand = get_brand_profile()

    facts = brand["approved_facts"]
    references = brand.get("evidence_references", {})
    restricted_claims = brand.get("restricted_claims", [])
    claim_references = references.get("restricted_claims", {})
    guidelines = brand.get("guidelines", [])

    issues = []
    normalized_content = normalize_claim_text(content)

    reported_guidelines = set()

    # Helper: Add an issue
    def add_issue(
        issue_type,
        severity,
        status,
        message,
        evidence,
        suggestion,
        evidence_reference
    ):
        issues.append({
            "type": issue_type,
            "severity": severity,
            "status": status,
            "message": message,
            "evidence": evidence,
            "suggestion": suggestion,
            "evidence_reference": evidence_reference
        })

    # Find a relevant guideline
    def find_guideline(keyword):

        for guideline in guidelines:

            searchable_text = " ".join([
                guideline.get("title") or "",
                guideline.get("description") or "",
                guideline.get("category") or "",
                guideline.get("rule") or ""
            ]).lower()

            if keyword.lower() in searchable_text:
                return guideline

        return None

    # Add an issue using its actual guideline
    def add_guideline_issue(guideline):

        if not guideline:
            return

        guideline_id = guideline.get("id")

        if guideline_id in reported_guidelines:
            return

        reported_guidelines.add(guideline_id)

        title = guideline.get("title", "Brand guideline")
        rule = guideline.get("rule") or (
            "This claim requires supporting evidence before approval."
        )

        reference = {
            "evidence_id": f"brand_guidelines:{guideline_id}",
            "guideline_id": guideline_id,
            "source_type": "brand_guideline",
            "source_title": guideline.get("source_title"),
            "guideline_title": title,
            "guideline_rule": rule,
            "severity": guideline.get("severity", "medium"),
            "version": guideline.get("version")
        }

        add_issue(
            issue_type="unsupported_claim",
            severity=guideline.get("severity", "medium"),
            status="needs_human_review",
            message=f"This content requires review under '{title}'. {rule}",
            evidence=rule,
            suggestion="Provide approved supporting evidence or revise the claim.",
            evidence_reference=reference
        )

    # 1. Product name check

    product_name = facts["product_name"]

    if product_name.lower() not in content.lower():

        add_issue(
            issue_type="product_name",
            severity="medium",
            status="needs_review",
            message=f"Approved product name {product_name} was not found.",
            evidence=f"Approved product name: {product_name}",
            suggestion=f"Use the approved product name {product_name}.",
            evidence_reference=references.get("product_name", {})
        )

    # 2. Price verification

    approved_price = float(facts["price"])
    currency = facts["currency"]

    if currency == "INR":

        prices = re.findall(
            r"₹\s*([\d,]+(?:\.\d{1,2})?)",
            content
        )

        for price_text in prices:

            mentioned_price = float(
                price_text.replace(",", "")
            )

            if mentioned_price != approved_price:

                approved_display = (
                    f"{approved_price:,.2f}".rstrip("0").rstrip(".")
                )

                mentioned_display = (
                    f"{mentioned_price:,.2f}".rstrip("0").rstrip(".")
                )

                add_issue(
                    issue_type="price_mismatch",
                    severity="high",
                    status="confirmed_mismatch",
                    message=(
                        f"Content mentions ₹{mentioned_display}, "
                        f"but approved price is ₹{approved_display}."
                    ),
                    evidence=f"Approved price: ₹{approved_display}",
                    suggestion=f"Replace with ₹{approved_display}.",
                    evidence_reference=references.get("price", {})
                )

    # 3. Restricted claims and terminology

    detected_claims = set()

    for claim in restricted_claims:

        clean_claim = normalize_claim_text(claim)

        if clean_claim and clean_claim in normalized_content:
            detected_claims.add(claim)

    for claim in detected_claims:

        reference = claim_references.get(claim, {})

        # Guidelines are handled with their full guideline information
        if reference.get("guideline_id"):

            guideline = next(
                (
                    item for item in guidelines
                    if item.get("id") == reference["guideline_id"]
                ),
                None
            )

            if guideline:
                add_guideline_issue(guideline)
                continue

        # Restricted terminology
        title = reference.get(
            "guideline_title",
            "Restricted Brand Terminology"
        )

        rule = reference.get(
            "guideline_rule",
            "This restricted claim requires review before publication."
        )

        evidence_id = reference.get("evidence_id")

        if evidence_id:
            reported_guidelines.add(evidence_id)

        add_issue(
            issue_type="unsupported_claim",
            severity=reference.get("severity", "medium"),
            status="needs_human_review",
            message=f"This claim requires review under '{title}'. {rule}",
            evidence=rule,
            suggestion="Use an approved alternative or provide supporting evidence.",
            evidence_reference=reference
        )

    # 4. Numerical productivity claims

    productivity_pattern = (
        # Example: improves productivity by 30%
        r"\b(?:improv\w*|boost\w*|increas\w*|enhanc\w*|deliver\w*|"
        r"offer\w*|provide\w*)\b"
        r".{0,60}\bproductivity\b"
        r".{0,40}\b(?:by|of)\s+\d+(?:\.\d+)?\s+percent\b"

        # Example: 30% productivity improvement
        r"|\b\d+(?:\.\d+)?\s+percent\b"
        r".{0,30}\bproductivity\b"
        r".{0,30}\b(?:improv\w*|boost\w*|increas\w*|enhanc\w*)\b"

        # Example: delivers 30% productivity improvement
        r"|\b(?:deliver\w*|offer\w*|provide\w*)\b"
        r".{0,30}\b\d+(?:\.\d+)?\s+percent\b"
        r".{0,30}\bproductivity\b"
        r".{0,30}\b(?:improv\w*|boost\w*|increas\w*|enhanc\w*)\b"
    )

    if re.search(productivity_pattern, normalized_content):

        productivity_already_detected = any(
            "productivity" in claim.lower()
            for claim in detected_claims
        )

        if not productivity_already_detected:

            guideline = find_guideline("productivity")

            if guideline:
                add_guideline_issue(guideline)

            else:
                add_issue(
                    issue_type="unsupported_claim",
                    severity="medium",
                    status="needs_human_review",
                    message="A numerical productivity claim requires supporting evidence.",
                    evidence="No supporting productivity evidence is linked.",
                    suggestion="Provide approved supporting evidence or revise the claim.",
                    evidence_reference={}
                )

    # 5. Unsupported performance promises

    performance_patterns = [
        r"\bguarante\w*.{0,50}\bperformance\b",
        r"\bperformance\b.{0,50}\bguarante\w*",
        r"\b(?:exceptional|outstanding|superior|unmatched|unparalleled)"
        r"\s+performance\b"
    ]

    performance_claim_found = any(
        re.search(pattern, normalized_content)
        for pattern in performance_patterns
    )

    if performance_claim_found:

        performance_already_detected = any(
            "performance" in claim.lower()
            for claim in detected_claims
        )

        if not performance_already_detected:

            guideline = find_guideline("performance")

            if guideline:
                add_guideline_issue(guideline)

            else:
                add_issue(
                    issue_type="unsupported_claim",
                    severity="medium",
                    status="needs_human_review",
                    message="An unsupported performance promise requires review.",
                    evidence="No supporting performance evidence is linked.",
                    suggestion="Provide approved supporting evidence or revise the claim.",
                    evidence_reference={}
                )

    # 6. Final analysis result

    return {
        "brand": brand["brand_name"],
        "total_issues": len(issues),
        "issues": issues,
        "overall_status": (
            "review_required" if issues else "no_issues_detected"
        )
    }
