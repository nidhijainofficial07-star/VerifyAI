
import re


def analyze_input_quality(content: str):
    issues = []

    text = content.strip()

    def add_quality_issue(message, evidence, suggestion):
        issues.append({
            "type": "input_quality",
            "severity": "medium",
            "status": "needs_human_review",
            "message": message,
            "evidence": evidence[:150],
            "suggestion": suggestion,
            "evidence_reference": {}
        })

    # 1. Empty or meaningless input
    if not text or not re.search(r"[a-zA-Z0-9]", text):
        add_quality_issue(
            "The submitted content does not contain meaningful text.",
            text or "Empty input",
            "Submit a readable advertisement or promotional message."
        )
        return issues

    # 2. Excessive repeated characters
    if re.search(r"(.)\1{5,}", text):
        add_quality_issue(
            "Unusual repeated characters were detected.",
            text,
            "Check the content for accidental or meaningless character repetition."
        )

    # 3. Random-looking long words
    words = re.findall(r"[a-zA-Z]+", text.lower())

    for word in words:
        if len(word) >= 12:
            vowels = sum(char in "aeiou" for char in word)
            vowel_ratio = vowels / len(word)

            if vowel_ratio < 0.10:
                add_quality_issue(
                    "A word appears to contain random or meaningless characters.",
                    word,
                    "Replace the suspicious text with a meaningful word."
                )
                break

    # 4. Excessive symbols
    if len(text) >= 12:
        meaningful_chars = sum(
            char.isalnum() or char.isspace()
            for char in text
        )

        if meaningful_chars / len(text) < 0.45:
            add_quality_issue(
                "The content contains an unusually high proportion of symbols.",
                text,
                "Use readable text instead of excessive special characters."
            )

    return issues
