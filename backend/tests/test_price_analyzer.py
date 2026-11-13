
import unittest
from datetime import datetime, timedelta, timezone

from price_analyzer import analyze_prices


class TestPriceAnalyzer(unittest.TestCase):


    def test_promotion_with_wrong_currency(self):
        promotion = {
            "promotion_name": "USD Offer",
            "approved_price": 4000,
            "approved_discount_percentage": 20,
            "currency": "USD",
            "active": True,
            "valid_from": "2026-11-01T00:00:00+05:30",
            "valid_until": "2026-12-01T00:00:00+05:30"
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertTrue(
            any(issue["type"] == "price_mismatch" for issue in issues)
        )

    def test_expired_promotion_without_name(self):
        promotion = {
            "approved_price": 4000,
            "approved_discount_percentage": 20,
            "currency": "INR",
            "active": True,
            "valid_from": "2026-11-01T00:00:00+05:30",
            "valid_until": "2026-11-12T00:00:00+05:30"
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertTrue(
            any(issue["type"] == "expired_promotion" for issue in issues)
        )



    def test_discount_without_price(self):
        issues = analyze_prices(
            content="SmartDesk offers a 20% discount.",
            approved_price=5000
        )
        self.assertTrue(
            any(issue["type"] == "incomplete_discount_information" for issue in issues)
        )

    def test_discount_with_only_one_price(self):
        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000 with 20% off.",
            approved_price=5000
        )
        self.assertTrue(
            any(issue["type"] == "incomplete_discount_information" for issue in issues)
        )


    def test_valid_promotion_without_name(self):
        from datetime import datetime, timedelta, timezone

        now = datetime.now(timezone.utc)

        promotion = {
            "approved_price": 4000,
            "approved_discount_percentage": 20,
            "currency": "INR",
            "active": True,
            "valid_from": (now - timedelta(days=1)).isoformat(),
            "valid_until": (now + timedelta(days=1)).isoformat()
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertFalse(
            any(issue["type"] == "price_mismatch" for issue in issues)
        )
    
    def test_discount_with_more_than_two_prices(self):
        issues = analyze_prices(
            content="SmartDesk was ₹6,000, now ₹4,500, instead of ₹5,500 with 20% off.",
            approved_price=5000
        )

        self.assertTrue(
            any(
                issue["type"] == "discount_needs_verification"
                for issue in issues
            )
        )


    
    def test_original_price_equal_to_selling_price(self):
        issues = analyze_prices(
            content="SmartDesk was ₹5,000, now ₹5,000 with 0% off.",
            approved_price=5000
        )
        self.assertTrue(
            any(issue["type"] == "discount_needs_verification" for issue in issues)
        )

    def test_selling_price_is_zero(self):
        issues = analyze_prices(
            content="SmartDesk was ₹5,000, now ₹0 with 100% off.",
            approved_price=5000
        )
        self.assertTrue(
            any(issue["type"] == "discount_needs_verification" for issue in issues)
        )

    
    def test_promotion_without_timezone(self):
        promotion = {
            "promotion_name": "No Timezone Offer",
            "approved_price": 4000,
            "approved_discount_percentage": 20,
            "active": True,
            "valid_from": "2026-11-01T00:00:00",
            "valid_until": "2026-12-01T00:00:00"
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertTrue(
            any(issue["type"] == "price_mismatch" for issue in issues)
        )

    def test_promotion_end_before_start(self):
        promotion = {
            "promotion_name": "Invalid Date Range",
            "approved_price": 4000,
            "approved_discount_percentage": 20,
            "active": True,
            "valid_from": "2026-12-01T00:00:00+05:30",
            "valid_until": "2026-11-01T00:00:00+05:30"
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertTrue(
            any(issue["type"] == "price_mismatch" for issue in issues)
        )

        self.assertFalse(
            any(issue["type"] == "expired_promotion" for issue in issues)
        )

    def test_promotion_end_time_is_exclusive(self):
        promotion = {
            "promotion_name": "Expired At End Time",
            "approved_price": 4000,
            "approved_discount_percentage": 20,
            "active": True,
            "valid_from": "2026-11-01T00:00:00+05:30",
            "valid_until": "2026-11-13T16:00:00+05:30"
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )


        self.assertTrue(issues)

    def test_incorrect_discount_percentage(self):
        issues = analyze_prices(
            content="SmartDesk was ₹5,000, now ₹4,000 with 50% off.",
            approved_price=4000
        )
        self.assertTrue(
            any(issue["type"] == "discount_mismatch" for issue in issues)
        )



    def test_rs_dot_price_format(self):
        issues = analyze_prices(
            content="SmartDesk is available for Rs. 5,000.",
            approved_price=5000
        )
        self.assertEqual(issues, [])

    def test_inr_price_format(self):
        issues = analyze_prices(
            content="SmartDesk is available for INR 5,000.",
            approved_price=5000
        )
        self.assertEqual(issues, [])

    def test_price_with_comma_and_decimals(self):
        issues = analyze_prices(
            content="SmartDesk is available for ₹5,000.50.",
            approved_price=5000.50
        )
        self.assertEqual(issues, [])



    def test_promotion_missing_name(self):
        promotion = {
            "approved_price": 4000,
            "approved_discount_percentage": 20,
            "active": True,
            "valid_from": "2026-11-01T00:00:00+05:30",
            "valid_until": "2026-12-01T00:00:00+05:30"
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertEqual(issues, [])

    
    def test_promotion_invalid_approved_price(self):
        promotion = {
            "promotion_name": "Invalid Price Offer",
            "approved_price": "invalid",
            "approved_discount_percentage": 20,
            "active": True,
            "valid_from": "2026-11-01T00:00:00+05:30",
            "valid_until": "2026-12-01T00:00:00+05:30"
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertTrue(
            any(issue["type"] == "price_mismatch" for issue in issues)
        )


    
    def test_promotion_missing_approved_price_key(self):
        promotion = {
            "promotion_name": "Missing Price Offer",
            "approved_discount_percentage": 20,
            "active": True,
            "valid_from": "2026-11-01T00:00:00+05:30",
            "valid_until": "2026-12-01T00:00:00+05:30"
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertTrue(
            any(issue["type"] == "price_mismatch" for issue in issues)
        )



    def test_promotion_missing_discount_percentage(self):
        promotion = {
            "active": True,
            "valid_from": "2026-11-01T00:00:00+05:30",
            "valid_until": "2026-12-01T00:00:00+05:30",
            "approved_price": 4000,
            "approved_discount_percentage": None
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertEqual(len(issues), 0)

    def test_promotion_missing_approved_price(self):
        promotion = {
            "active": True,
            "valid_from": "2026-11-01T00:00:00+05:30",
            "valid_until": "2026-12-01T00:00:00+05:30",
            "approved_price": None
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertEqual(issues[0]["type"], "price_mismatch")


    def test_promotion_active_as_string(self):
        promotion = {
            "active": "true",
            "valid_from": "2026-11-01T00:00:00+05:30",
            "valid_until": "2026-12-01T00:00:00+05:30",
            "approved_price": 4000
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertEqual(issues[0]["type"], "price_mismatch")

    def test_positive_infinite_approved_price(self):
        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=float("inf")
        )

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["type"], "invalid_approved_price")

    def test_negative_infinite_approved_price(self):
        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=float("-inf")
        )

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["type"], "invalid_approved_price")

    def test_string_approved_price(self):
        issues = analyze_prices(
            content="SmartDesk is available for ₹5,000.",
            approved_price="5000"
        )

        self.assertEqual(len(issues), 0)

    def test_invalid_string_approved_price(self):
        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price="abc"
        )

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["type"], "invalid_approved_price")

    def test_none_approved_price(self):
        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=None
        )

        self.assertEqual(len(issues), 0)
    def test_zero_approved_price(self):
        issues = analyze_prices(
            content="SmartDesk is available for ₹0.",
            approved_price=0
        )

        self.assertEqual(len(issues), 0)

    def test_missing_promotion_valid_from(self):
        promotion = {
            "active": True,
            "valid_until": "2026-12-01T00:00:00+05:30",
            "approved_price": 4000
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertEqual(issues[0]["type"], "price_mismatch")
    def test_missing_promotion_valid_until(self):
        promotion = {
            "active": True,
            "valid_from": "2026-11-01T00:00:00+05:30",
            "approved_price": 4000
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertEqual(issues[0]["type"], "price_mismatch")
    def test_invalid_promotion_date_format(self):
        promotion = {
            "active": True,
            "valid_from": "not-a-date",
            "valid_until": "2026-12-01T00:00:00+05:30",
            "approved_price": 4000
        }

        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertEqual(issues[0]["type"], "price_mismatch")


    def test_infinite_approved_price(self):
        for price in (float("inf"), float("-inf")):
            with self.subTest(price=price):
                issues = analyze_prices(
                    content="SmartDesk is available for ₹4,000.",
                    approved_price=price
                )

                self.assertEqual(len(issues), 1)
                self.assertEqual(
                    issues[0]["type"],
                    "invalid_approved_price"
                )

    def test_nan_approved_price(self):
        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=float("nan")
        )

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["type"], "invalid_approved_price")


    def test_negative_approved_price(self):
        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=-500
        )

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["type"], "invalid_approved_price")


    def test_invalid_approved_price(self):
        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price="invalid"
        )

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["type"], "invalid_approved_price")



    def test_multiple_promotions_same_price(self):
        issues = analyze_prices(
            content="SmartDesk: Original price ₹5,000, now ₹4,000, 20% off.",
            approved_price=5000,
            approved_promotions=[
                {
                    "promotion_id": 5,
                    "promotion_name": "Offer A",
                    "approved_price": 4000,
                    "approved_discount_percentage": 20,
                    "currency": "INR",
                    "valid_from": "2026-11-01T00:00:00+05:30",
                    "valid_until": "2026-12-01T00:00:00+05:30",
                    "active": True
                },
                {
                    "promotion_id": 6,
                    "promotion_name": "Offer B",
                    "approved_price": 4000,
                    "approved_discount_percentage": 15,
                    "currency": "INR",
                    "valid_from": "2026-11-01T00:00:00+05:30",
                    "valid_until": "2026-12-01T00:00:00+05:30",
                    "active": True
                }
            ]
        )

        self.assertTrue(
            any(issue["type"] == "ambiguous_promotion" for issue in issues)
        )


    def test_missing_active_status(self):
        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[
                {
                    "promotion_id": 4,
                    "promotion_name": "Missing Status Offer",
                    "approved_price": 4000,
                    "approved_discount_percentage": 20,
                    "currency": "INR",
                    "valid_from": "2026-11-01T00:00:00+05:30",
                    "valid_until": "2026-12-01T00:00:00+05:30"
                }
            ]
        )

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["type"], "price_mismatch")



    def test_invalid_promotion_dates(self):
        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[
                {
                    "promotion_id": 3,
                    "promotion_name": "Invalid Date Offer",
                    "approved_price": 4000,
                    "approved_discount_percentage": 20,
                    "currency": "INR",
                    "valid_from": "invalid-date",
                    "valid_until": "2026-12-01T00:00:00+05:30",
                    "active": True
                }
            ]
        )

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["type"], "price_mismatch")



    def test_inactive_promotion(self):
        issues = analyze_prices(
            content="SmartDesk is available for ₹4,000.",
            approved_price=5000,
            approved_promotions=[
                {
                    "promotion_id": 2,
                    "promotion_name": "Inactive November Offer",
                    "approved_price": 4000,
                    "approved_discount_percentage": 20,
                    "currency": "INR",
                    "valid_from": "2026-11-01T00:00:00+05:30",
                    "valid_until": "2026-12-01T00:00:00+05:30",
                    "active": False
                }
            ]
        )

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["type"], "inactive_promotion")


    def test_correct_discount(self):
        result = analyze_prices(
            "SmartDesk costs ₹800. Get 20% off from ₹1000.",
            approved_price=800
        )

        mismatch = [
            issue for issue in result
            if issue["type"] == "discount_mismatch"
        ]

        self.assertEqual(len(mismatch), 0)

    def test_incorrect_discount(self):
        result = analyze_prices(
            "SmartDesk costs ₹800. Get 30% off from ₹1000.",
            approved_price=800
        )

        mismatch = [
            issue for issue in result
            if issue["type"] == "discount_mismatch"
        ]

        self.assertEqual(len(mismatch), 1)

    def test_approved_price(self):
        result = analyze_prices(
            "Get SmartDesk for ₹800.",
            approved_price=800
        )

        mismatch = [
            issue for issue in result
            if issue["type"] == "price_mismatch"
        ]

        self.assertEqual(len(mismatch), 0)

    def test_unapproved_price(self):
        result = analyze_prices(
            "Get SmartDesk for ₹1200.",
            approved_price=800
        )

        mismatch = [
            issue for issue in result
            if issue["type"] == "price_mismatch"
        ]

        self.assertEqual(len(mismatch), 1)

    def test_approved_promotion(self):
        now = datetime.now(timezone.utc)

        promotion = {
            "promotion_name": "Test Offer",
            "approved_price": 4000,
            "approved_discount_percentage": 20,
            "valid_from": (now - timedelta(days=1)).isoformat(),
            "valid_until": (now + timedelta(days=7)).isoformat(),
            "active": True
        }

        result = analyze_prices(
            "SmartDesk is available for ₹4000 with 20% off from ₹5000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        self.assertEqual(len(result), 0)

    def test_promotion_discount_mismatch(self):
        now = datetime.now(timezone.utc)

        promotion = {
            "promotion_name": "Test Offer",
            "approved_price": 4000,
            "approved_discount_percentage": 20,
            "valid_from": (now - timedelta(days=1)).isoformat(),
            "valid_until": (now + timedelta(days=7)).isoformat(),
            "active": True
        }

        result = analyze_prices(
            "SmartDesk is available for ₹4000 with 30% off from ₹5000.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        mismatches = [
            issue for issue in result
            if issue["type"] == "promotion_discount_mismatch"
        ]

        duplicate_mismatches = [
            issue for issue in result
            if issue["type"] == "discount_mismatch"
        ]

        self.assertEqual(len(mismatches), 1)
        self.assertEqual(len(duplicate_mismatches), 0)

    def test_expired_promotion(self):
        now = datetime.now(timezone.utc)

        promotion = {
            "promotion_name": "Old Test Offer",
            "approved_price": 3500,
            "approved_discount_percentage": 30,
            "valid_from": (now - timedelta(days=30)).isoformat(),
            "valid_until": (now - timedelta(days=1)).isoformat(),
            "active": True
        }

        result = analyze_prices(
            "SmartDesk is available for ₹3500.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        expired = [
            issue for issue in result
            if issue["type"] == "expired_promotion"
        ]

        self.assertEqual(len(expired), 1)

    def test_costs_and_today_discount_sentence(self):
        now = datetime.now(timezone.utc)

        promotion = {
            "promotion_name": "Test Offer",
            "approved_price": 4000,
            "approved_discount_percentage": 20,
            "valid_from": (now - timedelta(days=1)).isoformat(),
            "valid_until": (now + timedelta(days=7)).isoformat(),
            "active": True
        }

        result = analyze_prices(
            "Our product costs ₹5,000, but today it is available for ₹4,000 with 20% off.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        errors = [
            issue for issue in result
            if issue["type"] in (
                "discount_needs_verification",
                "discount_mismatch",
                "promotion_discount_mismatch",
                "price_mismatch"
            )
        ]
        self.assertEqual(len(errors), 0)

    def test_future_promotion(self):
        now = datetime.now(timezone.utc)

        promotion = {
            "promotion_name": "Future Test Offer",
            "approved_price": 3500,
            "approved_discount_percentage": 30,
            "valid_from": (now + timedelta(days=7)).isoformat(),
            "valid_until": (now + timedelta(days=30)).isoformat(),
            "active": True
        }

        result = analyze_prices(
            "SmartDesk is available for ₹3500.",
            approved_price=5000,
            approved_promotions=[promotion]
        )

        future = [
            issue for issue in result
            if issue["type"] == "future_promotion"
        ]

        price_mismatches = [
            issue for issue in result
            if issue["type"] == "price_mismatch"
        ]

        self.assertEqual(len(future), 1)
        self.assertEqual(len(price_mismatches), 0)


if __name__ == "__main__":
    unittest.main()