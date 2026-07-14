import json
import csv
import random
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
BOOTSTRAP_PATH = DATA_DIR / "bootstrap_merchants.json"
AUGMENTED_PATH = DATA_DIR / "augmented_samples.csv"

CATEGORY_CONFIG = {
    "Food & Drink": {
        "prefixes": ["The", "Mr.", "Chez", "Le", "La", "El", "Los"],
        "suffixes": ["Express", "Bistro", "Cafe", "Grill", "Kitchen", "House", "Bar", "Lounge", "Corner", "Spot", "Place", "Joint"],
        "descriptions": ["Lunch", "Dinner", "Breakfast", "Coffee", "Takeout", "Delivery", "Quick bite", "Snack", "Brunch", "Meal"],
        "translations": {
            "es": ["Comida", "Restaurante", "Café", "Almuerzo", "Cena"],
            "fr": ["Nourriture", "Restaurant", "Café", "Déjeuner", "Dîner"],
            "de": ["Essen", "Restaurant", "Mittagessen", "Abendessen"],
            "hi": ["खाना", "रेस्तरां", "कॉफी"],
            "ja": ["食事", "レストラン"],
            "zh": ["食品", "餐厅"],
        },
    },
    "Shopping": {
        "prefixes": ["The", "Mega", "Super", "Best"],
        "suffixes": ["Store", "Shop", "Outlet", "Mall", "Market", "Boutique", "Emporium"],
        "descriptions": ["Online shopping", "Clothing", "Electronics", "Home decor", "Retail", "Purchase", "Apparel", "Accessories", "Footwear", "Gadgets"],
        "merchants": ["Amazon", "Walmart", "Target", "Best Buy", "Nike", "Macy's", "eBay", "Etsy", "H&M", "Zara", "IKEA", "Home Depot", "Lowe's"],
        "translations": {
            "es": ["Compras", "Tienda", "Ropa"],
            "fr": ["Shopping", "Magasin", "Vêtements"],
            "de": ["Einkaufen", "Geschäft", "Kleidung"],
            "hi": ["खरीदारी", "दुकान"],
            "ja": ["ショッピング", "買い物"],
            "zh": ["购物", "商店"],
        },
    },
    "Transport": {
        "prefixes": ["City", "Metro", "National", "Express"],
        "suffixes": ["Lines", "Services", "Rides", "Travel", "Transit", "Cab", "Shuttle"],
        "descriptions": ["Ride share", "Gas", "Fuel", "Train ticket", "Bus fare", "Flight ticket", "Flight", "Parking fee", "Metro pass", "Cab fare", "Taxi", "Uber", "Lyft"],
        "merchants": ["Uber", "Lyft", "Shell", "Exxon", "BP", "Chevron", "Amtrak", "Greyhound", "Delta Airlines", "United Airlines", "Parking", "Gas Station", "Transit", "Taxi"],
        "translations": {
            "es": ["Transporte", "Gasolina", "Viaje"],
            "fr": ["Transport", "Essence", "Voyage"],
            "de": ["Transport", "Benzin", "Reise"],
            "hi": ["परिवहन", "ईंधन"],
            "ja": ["交通", "燃料"],
            "zh": ["交通", "燃料"],
        },
    },
    "Bills & Utilities": {
        "prefixes": ["National", "City", "State", "Metro"],
        "suffixes": ["Services", "Company", "Provider", "Network", "Corp", "Inc"],
        "descriptions": ["Phone bill", "Internet", "Electric bill", "Utility bill", "Insurance", "Water bill", "Gas bill", "Monthly fee", "Subscription"],
        "merchants": ["Verizon", "AT&T", "T-Mobile", "Comcast", "PG&E", "National Grid", "State Farm", "Allstate", "Geico", "Water Company", "Electric Company", "Internet Provider", "Insurance Co"],
        "translations": {
            "es": ["Facturas", "Servicios", "Utilidades"],
            "fr": ["Factures", "Services", "Utilitaires"],
            "de": ["Rechnungen", "Versorgung", "Nebenkosten"],
            "hi": ["बिल", "उपयोगिताएँ"],
            "ja": ["請求書", "公共料金"],
            "zh": ["账单", "公用事业"],
        },
    },
    "Entertainment": {
        "prefixes": ["The", "Mega", "Ultimate"],
        "suffixes": ["Plus", "Premium", "Unlimited", "Network", "Studios", "World"],
        "descriptions": ["Streaming subscription", "Music streaming", "Movie ticket", "Video games", "Game purchase", "Music", "Premium subscription", "Live music", "Play", "Concert"],
        "merchants": ["Netflix", "Spotify", "Disney+", "HBO Max", "Hulu", "AMC Theatres", "Regal Cinemas", "Steam", "PlayStation Store", "Xbox Store", "Apple Music", "Youtube", "Cinema", "Concert", "Theatre"],
        "translations": {
            "es": ["Entretenimiento", "Cine", "Música"],
            "fr": ["Divertissement", "Cinéma", "Musique"],
            "de": ["Unterhaltung", "Kino", "Musik"],
            "hi": ["मनोरंजन", "सिनेमा"],
            "ja": ["エンターテイメント", "映画"],
            "zh": ["娱乐", "电影"],
        },
    },
    "Healthcare": {
        "prefixes": ["City", "National", "Premier", "Advanced"],
        "suffixes": ["Clinic", "Center", "Associates", "Group", "Care", "Health", "Medical", "Pharmacy"],
        "descriptions": ["Prescription", "Doctor visit", "Medical", "Dental checkup", "Eye exam", "Medical visit", "Dental cleaning", "Medical bill", "Pharmacy"],
        "merchants": ["CVS Pharmacy", "Walgreens", "Kaiser Permanente", "Mayo Clinic", "Cleveland Clinic", "Dental Associates", "Vision Center", "Doctor", "Dentist", "Hospital", "Pharmacy", "Urgent Care"],
        "translations": {
            "es": ["Salud", "Médico", "Farmacia"],
            "fr": ["Santé", "Médical", "Pharmacie"],
            "de": ["Gesundheit", "Medizinisch", "Apotheke"],
            "hi": ["स्वास्थ्य", "चिकित्सा"],
            "ja": ["ヘルスケア", "医療"],
            "zh": ["医疗", "医药"],
        },
    },
    "Education": {
        "prefixes": ["The", "National", "Global", "Online"],
        "suffixes": ["Academy", "Institute", "School", "University", "College", "Hub", "Center", "Online"],
        "descriptions": ["Online course", "Learning", "Language learning", "Online learning", "Tuition", "Tuition payment", "Tuition fee", "Books", "Course", "Workshop", "Certification"],
        "merchants": ["Coursera", "Udemy", "Khan Academy", "Duolingo", "Skillshare", "Harvard Extension", "Community College", "University", "College", "School", "Book Store"],
        "translations": {
            "es": ["Educación", "Curso", "Escuela"],
            "fr": ["Éducation", "Cours", "École"],
            "de": ["Bildung", "Kurs", "Schule"],
            "hi": ["शिक्षा", "पाठ्यक्रम"],
            "ja": ["教育", "コース"],
            "zh": ["教育", "课程"],
        },
    },
    "Housing": {
        "prefixes": ["Premier", "Elite", "City", "National"],
        "suffixes": ["Properties", "Realty", "Management", "Homes", "Apartments", "Estates", "Housing"],
        "descriptions": ["Rent", "Monthly rent", "Repair", "Maintenance", "Repair supplies", "Monthly mortgage", "Lease payment", "Tax payment", "HOA fee", "Property tax"],
        "merchants": ["Property Management Co.", "Rent Payment", "Home Depot", "Lowe's", "Ace Hardware", "Apartment", "Mortgage", "Lease", "Property Tax"],
        "translations": {
            "es": ["Vivienda", "Alquiler", "Hipoteca"],
            "fr": ["Logement", "Loyer", "Hypothèque"],
            "de": ["Wohnung", "Miete", "Hypothek"],
            "hi": ["आवास", "किराया"],
            "ja": ["住宅", "家賃"],
            "zh": ["住房", "租金"],
        },
    },
    "Income": {
        "prefixes": ["Global", "Premier", "Elite", "Pro"],
        "suffixes": ["Inc.", "Corp", "LLC", "Group", "Partners", "Ventures", "Solutions", "Services"],
        "descriptions": ["Monthly salary", "Freelance payment", "Interest payment", "Dividend payment", "Rental income", "Online sale", "Contract work", "Gig payment", "Shop earnings", "Freelance work", "Capital gains", "Annual tax refund", "Refund", "Paycheck", "Direct deposit", "Bonus", "Commission"],
        "merchants": ["Employer Inc.", "Freelance Client", "Bank of America", "Vanguard", "Airbnb", "PayPal", "Upwork", "Fiverr", "Etsy", "Side Gig", "Investment", "Tax Return", "Refund"],
        "translations": {
            "es": ["Ingresos", "Salario", "Pago"],
            "fr": ["Revenu", "Salaire", "Paiement"],
            "de": ["Einkommen", "Gehalt", "Zahlung"],
            "hi": ["आय", "वेतन"],
            "ja": ["収入", "給与"],
            "zh": ["收入", "工资"],
        },
    },
    "Other": {
        "prefixes": ["General", "Local", "City"],
        "suffixes": ["Store", "Service", "Shop", "Outlet", "Center", "Depot"],
        "descriptions": ["Misc purchase", "Other expense", "Daily purchase", "Monthly subscription", "Miscellaneous", "General expense", "Various", "Other"],
        "merchants": ["Miscellaneous", "Various", "Retail Store", "Subscription Service"],
        "translations": {
            "es": ["Otros", "Varios", "General"],
            "fr": ["Autres", "Divers", "Général"],
            "de": ["Andere", "Sonstiges", "Allgemein"],
            "hi": ["अन्य", "विविध"],
            "ja": ["その他", "雑貨"],
            "zh": ["其他", "杂项"],
        },
    },
}

def augment_samples(samples: list[dict], multiplier: int = 50) -> list[dict]:
    augmented = []
    for sample in samples:
        cat = sample["category"]
        if cat not in CATEGORY_CONFIG:
            augmented.append(sample)
            continue
        cfg = CATEGORY_CONFIG[cat]

        augmented.append(sample)

        for _ in range(multiplier):
            merchant = sample["merchant"]
            desc = sample.get("description", "")

            if random.random() < 0.3 and cfg["prefixes"]:
                merchant = f"{random.choice(cfg['prefixes'])} {merchant}"
            if random.random() < 0.3 and cfg["suffixes"]:
                merchant = f"{merchant} {random.choice(cfg['suffixes'])}"

            if random.random() < 0.4 and cfg["descriptions"]:
                desc = random.choice(cfg["descriptions"])

            if random.random() < 0.2:
                merchant = merchant.lower().title()
            if random.random() < 0.1:
                merchant = merchant.upper()

            augmented.append({"merchant": merchant, "description": desc, "category": cat})

    return augmented


def generate_multilingual_variants(samples: list[dict]) -> list[dict]:
    multilingual = []
    for sample in samples:
        cat = sample["category"]
        if cat not in CATEGORY_CONFIG:
            continue
        cfg = CATEGORY_CONFIG[cat]
        for lang, translations in cfg.get("translations", {}).items():
            for trans in translations:
                multilingual.append({
                    "merchant": sample["merchant"],
                    "description": f"{trans} {sample.get('description', '')}",
                    "category": cat,
                })
    return multilingual


def main():
    with open(BOOTSTRAP_PATH) as f:
        data = json.load(f)

    samples = data["samples"]
    print(f"Original samples: {len(samples)}")

    augmented = augment_samples(samples, multiplier=50)
    print(f"After augmentation: {len(augmented)}")

    multilingual = generate_multilingual_variants(samples)
    print(f"Multilingual variants: {len(multilingual)}")

    all_samples = augmented + multilingual
    random.shuffle(all_samples)

    with open(AUGMENTED_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["merchant", "description", "category"])
        writer.writeheader()
        writer.writerows(all_samples)

    print(f"Total augmented samples written: {len(all_samples)}")
    categories = set(s["category"] for s in all_samples)
    print(f"Categories: {sorted(categories)}")
    for cat in sorted(categories):
        count = sum(1 for s in all_samples if s["category"] == cat)
        print(f"  {cat}: {count}")


if __name__ == "__main__":
    main()