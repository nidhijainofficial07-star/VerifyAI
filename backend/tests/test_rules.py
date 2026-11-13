
import unittest
from rules import analyze_content


class TestRulesIntegration(unittest.TestCase):

    def test_analyzer_returns_required_fields(self):
        result = analyze_content(
            "SmartDesk is a productivity platform."
        )

        self.assertIn("brand", result)
        self.assertIn("total_issues", result)
        self.assertIn("issues", result)
        self.assertIn("overall_status", result)
        self.assertIn("risk_score", result)
        self.assertIn("risk_level", result)
        self.assertIn("scoring_method", result)

    def test_risk_score_is_valid(self):
        result = analyze_content(
            "SmartDesk is the No. 1 product in India."
        )

        self.assertGreaterEqual(result["risk_score"], 0)
        self.assertLessEqual(result["risk_score"], 100)

    def test_productivity_claim_detection(self):
        result = analyze_content(
            "SmartDesk improves productivity by 30 percent."
        )

        self.assertGreater(result["total_issues"], 0)

    def test_duplicate_issues_are_removed(self):
        result = analyze_content(
            "SmartDesk is the No. 1 product in India."
        )

        signatures = [
            (
                issue["type"],
                issue["evidence"]
            )
            for issue in result["issues"]
        ]

        self.assertEqual(len(signatures), len(set(signatures)))


if __name__ == "__main__":
    unittest.main()
