
# VerityAI - Brand Knowledge Base

BRAND_PROFILE = {
    "brand_id": "smartdesk_demo",
    "brand_name": "SmartDesk",

    "approved_facts": {
        "product_name": "SmartDesk",
        "price": 5000,
        "currency": "INR",
        "specifications": [
            "Height adjustable"
        ],
        "description": "Ergonomic workstation for everyday use"
    },

    "approved_terminology": [
        "SmartDesk",
        "Height adjustable",
        "Ergonomic workstation"
    ],

    "restricted_claims": [
        "No. 1 ergonomic desk in India",
        "100% productivity improvement"
    ]
}


def get_brand_profile():
    return BRAND_PROFILE
