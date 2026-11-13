

import re

from datetime import datetime, timezone





def analyze_prices(

    content,

    approved_price,

    currency="INR",

    evidence_reference=None,

    approved_promotions=None

):

    issues = []



    if currency != "INR" or approved_price is None:

        return issues



    try:

        approved_price = float(approved_price)



        if not (approved_price >= 0 and approved_price < float("inf")):

            raise ValueError



    except (ValueError, TypeError, OverflowError):

        issues.append({

            "type": "invalid_approved_price",

            "severity": "high",

            "status": "needs_human_review",

            "message": "The approved brand price is invalid.",

            "evidence": str(approved_price),

            "suggestion": "Correct the approved price in the brand database.",

            "evidence_reference": evidence_reference or {}

        })

        return issues



    evidence_reference = evidence_reference or {}

    approved_promotions = approved_promotions or []

    current_time = datetime.now(timezone.utc)







    def get_promotion_price(promotion):

        try:

            if promotion.get("currency", "INR") != "INR":

                return None



            price = promotion.get("approved_price")



            if price is None:

                return None



            price = float(price)



            if not (price >= 0 and price < float("inf")):

                return None



            return price



        except (ValueError, TypeError, OverflowError):

            return None





    def get_promotion_status(promotion):

        try:

            active = promotion.get("active")



            if not isinstance(active, bool):

                return "invalid"



            if not active:

                return "inactive"



            valid_from = datetime.fromisoformat(

                promotion["valid_from"].replace("Z", "+00:00")

            )



            valid_until = datetime.fromisoformat(

                promotion["valid_until"].replace("Z", "+00:00")

            )



            # Both dates must contain timezone information.

            if valid_from.tzinfo is None or valid_until.tzinfo is None:

                return "invalid"



            if valid_until <= valid_from:

                return "invalid"



            if current_time < valid_from:

                return "not_yet_valid"



            if current_time >= valid_until:

                return "expired"



            return "valid"



        except (KeyError, TypeError, ValueError, AttributeError):

            return "invalid"





    valid_promotions = [

        promotion

        for promotion in approved_promotions

        if get_promotion_status(promotion) == "valid"

    ]



    def find_promotion_by_price(price, promotions):

        for promotion in promotions:

            promotion_price = get_promotion_price(promotion)



            if (

                promotion_price is not None

                and abs(float(price) - float(promotion_price)) < 0.01

            ):

                return promotion



        return None





    def find_promotions_by_price(price, promotions):

        matching_promotions = []



        for promotion in promotions:

            promotion_price = get_promotion_price(promotion)



            if (

                promotion_price is not None

                and abs(float(price) - float(promotion_price)) < 0.01

            ):

                matching_promotions.append(promotion)



        return matching_promotions





    def find_expired_promotion(price):

        for promotion in approved_promotions:

            if get_promotion_status(promotion) != "expired":

                continue



            promotion_price = get_promotion_price(promotion)



            if (

                promotion_price is not None

                and abs(float(price) - float(promotion_price)) < 0.01

            ):

                return promotion



        return None



    def find_future_promotion(price):

        for promotion in approved_promotions:

            if get_promotion_status(promotion) != "not_yet_valid":

                continue



            promotion_price = get_promotion_price(promotion)



            if (

                promotion_price is not None

                and abs(float(price) - float(promotion_price)) < 0.01

            ):

                return promotion



        return None



    def find_inactive_promotion(price):

        for promotion in approved_promotions:

            if get_promotion_status(promotion) != "inactive":

                continue



            promotion_price = get_promotion_price(promotion)



            if (

                promotion_price is not None

                and abs(float(price) - float(promotion_price)) < 0.01

            ):

                return promotion



        return None



    price_pattern = r"(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)"



    matches = list(

        re.finditer(price_pattern, content, re.IGNORECASE)

    )



    prices = [

        {

            "value": float(match.group(1).replace(",", "")),

            "text": match.group(0)

        }

        for match in matches

    ]



    discount_pattern = r"(\d+(?:\.\d+)?)\s*%\s*(?:off|discount)"



    discount_matches = re.findall(

        discount_pattern,

        content,

        re.IGNORECASE

    )



    def add_issue(issue_type, severity, message, evidence, suggestion):

        issues.append({

            "type": issue_type,

            "severity": severity,

            "status": "needs_human_review",

            "message": message,

            "evidence": evidence,

            "suggestion": suggestion,

            "evidence_reference": evidence_reference

        })



    # 1. Verify advertised discount mathematically.

    original_price = None
    selling_price = None

    if discount_matches and len(prices) == 2:
        first_price = prices[0]["value"]
        second_price = prices[1]["value"]

        first_prefix = content[
            max(0, matches[0].start() - 60):matches[0].start()
        ].lower()

        second_prefix = content[
            max(0, matches[1].start() - 60):matches[1].start()
        ].lower()

        original_markers = (
            r"\b(?:original|regular|mrp|was|before|list)\b"
            r"|\boff\s+from\s*$"
            r"|\binstead\s+of\s*$"
        )

        selling_markers = (
            r"\b(?:costs?|now|today|sale price|selling price|discounted price|available\s+for)\b"
        )

        # Explicit "instead of" wording identifies selling then original price.
        if re.search(r"\binstead\s+of\b", content, re.IGNORECASE):
            selling_price = first_price
            original_price = second_price

        # Original-price marker takes priority.
        elif re.search(original_markers, first_prefix):
            original_price = first_price
            selling_price = second_price

        elif re.search(original_markers, second_prefix):
            original_price = second_price
            selling_price = first_price

        elif (
            re.search(selling_markers, first_prefix)
            and re.search(selling_markers, second_prefix)
        ):
            # Both prices have selling markers. Use the higher amount as
            # the original price and the lower amount as the selling price.
            if first_price > second_price:
                original_price = first_price
                selling_price = second_price
            else:
                original_price = second_price
                selling_price = first_price

        elif re.search(selling_markers, first_prefix):
            selling_price = first_price
            original_price = second_price

        elif re.search(selling_markers, second_prefix):
            selling_price = second_price
            original_price = first_price

        if original_price is not None and selling_price is not None:
            if original_price > selling_price > 0:
                actual_discount = (
                    (original_price - selling_price) / original_price
                ) * 100

                for claimed_discount in discount_matches:
                    claimed_discount = float(claimed_discount)

                    matched_promotion = find_promotion_by_price(
                        selling_price,
                        valid_promotions
                    )

                    promotion_mismatch_found = False

                    if matched_promotion:
                        approved_discount = matched_promotion[
                            "approved_discount_percentage"
                        ]

                        if (
                            approved_discount is not None
                            and abs(claimed_discount - approved_discount) > 0.5
                        ):
                            add_issue(
                                "promotion_discount_mismatch",
                                "high",
                                (
                                    f"The advertisement claims {claimed_discount:g}% OFF, "
                                    f"but the approved promotion allows "
                                    f"{approved_discount:g}% OFF."
                                ),
                                (
                                    f"Promotion: {matched_promotion.get('promotion_name', 'Unnamed promotion')}; "
                                    f"Advertised discount: {claimed_discount:g}%; "
                                    f"Approved discount: {approved_discount:g}%."
                                ),
                                "Use the approved promotional discount percentage."
                            )
                            promotion_mismatch_found = True

                    if (
                        not promotion_mismatch_found
                        and abs(actual_discount - claimed_discount) > 0.5
                    ):
                        add_issue(
                            "discount_mismatch",
                            "high",
                            (
                                f"The advertisement claims "
                                f"{claimed_discount:g}% OFF, but the "
                                f"calculated discount is approximately "
                                f"{actual_discount:.2f}%."
                            ),
                            (
                                f"Original price: ₹{original_price:,.2f}; "
                                f"Selling price: ₹{selling_price:,.2f}; "
                                f"Claimed discount: {claimed_discount:g}%."
                            ),
                            "Correct the advertised discount or verify the prices."
                        )
            else:
                add_issue(
                    "discount_needs_verification",
                    "medium",
                    "The detected prices do not establish a valid discount.",
                    content[:200],
                    "Verify the original and selling prices."
                )
        else:
            add_issue(
                "discount_needs_verification",
                "medium",
                "The original and selling prices could not be identified confidently.",
                content[:200],
                "Clearly label the original price and discounted selling price."
            )

    elif discount_matches and len(prices) > 2:
        add_issue(
            "discount_needs_verification",
            "medium",
            "The advertisement contains more than two prices, so the original and selling prices cannot be identified confidently.",
            content[:200],
            "Clearly identify the original price and the final discounted selling price."
        )

    # 2. Compare advertised price with approved regular and promotional prices.



    price_to_check = None



    if len(prices) == 1:

        price_to_check = prices[0]["value"]



    elif (

        len(prices) == 2

        and discount_matches

        and selling_price is not None

    ):

        price_to_check = selling_price



    if price_to_check is not None and price_to_check != approved_price:



        matching_promotions = find_promotions_by_price(

            price_to_check, valid_promotions

        )



        matched_promotion = (

        matching_promotions[0]

        if matching_promotions

        else None

        )



        expired_promotion = find_expired_promotion(price_to_check)

        future_promotion = find_future_promotion(price_to_check)

        inactive_promotion = find_inactive_promotion(price_to_check)



        if len(matching_promotions) > 1:

            approved_discounts = {

                promotion["approved_discount_percentage"]

                for promotion in matching_promotions

            }



            if len(approved_discounts) > 1:

                add_issue(

                    "ambiguous_promotion",

                    "high",

                    "Multiple valid promotions approve the same price with conflicting discount percentages.",

                    (

                        f"Matching promotions: "

                        f"{', '.join(promotion.get('promotion_name', 'Unnamed promotion') for promotion in matching_promotions)}."                    ),

                    "Resolve the conflicting promotional approvals before accepting this advertised price."

                )



        if matched_promotion:

            pass



        elif expired_promotion:

            add_issue(

                "expired_promotion",

                "high",

                (

                    f"The advertised price ₹{price_to_check:,.2f} "

                    f"matches the expired promotion "

                    f"'{expired_promotion.get('promotion_name', 'Unnamed promotion')}'."

                ),

                (

                    f"Promotion expired on "

                    f"{expired_promotion['valid_until']}."

                ),

                "Verify and obtain approval for a new promotional offer."

            )



        elif future_promotion:

            add_issue(

                "future_promotion",

                "medium",

                (

                    f"The advertised price ₹{price_to_check:,.2f} "

                    f"matches the future promotion "

                    f"'{future_promotion.get('promotion_name', 'Unnamed promotion')}', "

                    "which is not valid yet."

                ),

                (

                    f"Promotion starts on "

                    f"{future_promotion['valid_from']}."

                ),

                "Do not advertise this promotional price before its start date."

            )



        elif inactive_promotion:

            add_issue(

                "inactive_promotion",

                "medium",

                (

                    f"The advertised price ₹{price_to_check:,.2f} "

                    f"matches the inactive promotion "

                    f"'{inactive_promotion.get('promotion_name', 'Unnamed promotion')}'."

                ),

                "The matching promotional offer is currently inactive.",

                "Reactivate and verify the promotion before advertising this price."

            )



        else:

            add_issue(

                "price_mismatch",

                "medium",

                (

                    f"The advertisement mentions ₹{price_to_check:,.2f}, "

                    f"while the approved brand price is "

                    f"₹{approved_price:,.2f}. "

                    "The advertised price may need authorization."

                ),

                (

                    f"Advertised price: ₹{price_to_check:,.2f}; "

                    f"Approved price: ₹{approved_price:,.2f}."

                ),

                "Verify the advertised price against approved brand pricing or promotional offers."

            )



    # 3. A discount without two prices cannot be mathematically verified.



    if discount_matches and len(prices) < 2:

        add_issue(

            "incomplete_discount_information",

            "medium",

            "A discount is advertised without two prices to verify the calculation.",

            content[:200],

            "Provide the original price and discounted price, or supporting offer details."

        )



    return issues
