
import unittest

from claim_analyzer import analyze_evidence_claims


class TestClaimAnalyzer(unittest.TestCase):

    def test_positive_number_one_claim(self):
        result = analyze_evidence_claims(
            "SmartDesk is the No. 1 product in India."
        )
        self.assertEqual(len(result), 1)

    def test_negated_number_one_claim(self):
        result = analyze_evidence_claims(
            "SmartDesk is not the No. 1 product in India."
        )
        self.assertEqual(len(result), 0)

    def test_negated_fastest_claim(self):
        result = analyze_evidence_claims(
            "We never claim to be the fastest solution."
        )
        self.assertEqual(len(result), 0)

    def test_award_claim(self):
        result = analyze_evidence_claims(
            "SmartDesk is an award-winning platform."
        )
        self.assertEqual(len(result), 1)


if __name__ == "__main__":
    unittest.main()
