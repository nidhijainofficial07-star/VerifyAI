
import re


CLAIM_PATTERNS = [
    {
        "pattern": r"\bno\.?\s*1\b|\bnumber\s+one\b",
        "label": "Number-one or market-leading claim",
        "suggestion": "Provide reliable market research or ranking evidence."
    },
    {
        "pattern": r"\b100\s*percent\s+(?:secure|safe|reliable|effective)\b",
        "label": "Absolute security, safety, or effectiveness claim",
        "suggestion": "Provide verifiable testing or certification evidence."
    },
    {
        "pattern": r"\bclinically\s+proven\b",
        "label": "Clinical proof claim",
        "suggestion": "Provide relevant clinical study evidence."
    },
    {
        "pattern": r"\baward[\s-]winning\b",
        "label": "Award-winning claim",
        "suggestion": "Provide the award name, awarding organization, and year."
    },
    {
        "pattern": r"\b(?:fastest|safest|cheapest|best|most trusted)\b",
        "label": "Comparative or superlative claim",
        "suggestion": "Provide credible comparative evidence supporting this claim."
    }
]


NEGATION_PATTERNS = [
    r"\bnot\b",
    r"\bnever\b",
    r"\bno longer\b",
    r"\bwithout claiming\b",
    r"\bdoes not claim\b",
    r"\bdo not claim\b",
    r"\bdoesn't claim\b",
    r"\bdon't claim\b",
    r"\bnot guaranteed\b"
]


def is_negated(text, match_start):
    """
    Check whether a claim is explicitly denied
    immediately before the detected phrase.
    """

    context = text[max(0, match_start - 60):match_start].lower()

    return any(
        re.search(pattern, context)
        for pattern in NEGATION_PATTERNS
    )


def analyze_evidence_claims(content):
    issues = []
    normalized_content = content.lower()

    for item in CLAIM_PATTERNS:
        matches = re.finditer(
            item["pattern"],
            normalized_content,
            re.IGNORECASE
        )

        for match in matches:

            if is_negated(normalized_content, match.start()):
                continue

            evidence = content[
                max(0, match.start() - 50):
                min(len(content), match.end() + 50)
            ]

            issues.append({
                "type": "claim_needs_evidence",
                "severity": "medium",
                "status": "needs_human_review",
                "message": (
                    f"{item['label']} requires supporting evidence."
                ),
                "evidence": evidence,
                "suggestion": item["suggestion"],
                "evidence_reference": {}
            })

    return issues
