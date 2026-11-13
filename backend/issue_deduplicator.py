
def deduplicate_issues(issues):
    """
    Remove exact duplicate findings while preserving
    findings from different detection categories.
    """

    unique_issues = []
    seen = set()

    for issue in issues:
        evidence = " ".join(
            issue.get("evidence", "").lower().split()
        )

        reference = issue.get("evidence_reference", {}) or {}

        signature = (
            issue.get("type", ""),
            evidence,
            str(reference.get("evidence_id", "")),
            str(reference.get("guideline_id", ""))
        )

        if signature not in seen:
            seen.add(signature)
            unique_issues.append(issue)

    return unique_issues
