
def calculate_risk_score(issues):
    """
    Calculate a transparent rule-based content risk score.
    This is a heuristic score, not a probability of violation.
    """

    severity_weights = {
        "high": 30,
        "medium": 15,
        "low": 5
    }

    score = 0

    for issue in issues:
        severity = issue.get("severity", "low").lower()
        score += severity_weights.get(severity, 5)

    score = min(score, 100)

    if score == 0:
        risk_level = "Low"
    elif score < 25:
        risk_level = "Low"
    elif score < 50:
        risk_level = "Moderate"
    elif score < 75:
        risk_level = "High"
    else:
        risk_level = "Critical"

    return {
        "risk_score": score,
        "risk_level": risk_level,
        "scoring_method": "Rule-based severity weighting"
    }
