"""
Retrain the sklearn categorizer on a large realistic dataset + bootstrap data.
Runs on CPU in ~20-40 minutes.

Usage:
    python scripts/retrain_categorizer.py

Downloads the DoDataThings 68k realistic US bank transaction dataset,
maps it to our 10-category schema, merges with existing bootstrap data,
retrains the TF-IDF + LogisticRegression pipeline with confidence routing,
and saves the model.
"""

import json
import csv
import os
import pickle
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODEL_PATH = DATA_DIR / "categorizer.pkl"

CATEGORY_MAP = {
    "Restaurants": "Food & Drink",
    "Groceries": "Food & Drink",
    "Shopping": "Shopping",
    "Transportation": "Transport",
    "Utilities": "Bills & Utilities",
    "Insurance": "Bills & Utilities",
    "Entertainment": "Entertainment",
    "Healthcare": "Healthcare",
    "Education": "Education",
    "Rent": "Housing",
    "Mortgage": "Housing",
    "Income": "Income",
    "Travel": "Transport",
    "Subscription": "Entertainment",
    "Personal Care": "Other",
    "Fees": "Other",
    "Transfer": "Other",
}

OUR_CATEGORIES = [
    "Food & Drink", "Shopping", "Transport", "Bills & Utilities",
    "Entertainment", "Healthcare", "Education", "Housing", "Income", "Other",
]


def preprocess(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def load_dodatathings() -> list[dict]:
    """Load the DoDataThings 68k dataset from HF cache or download it."""
    try:
        from huggingface_hub import hf_hub_download
        path = hf_hub_download(
            repo_id="DoDataThings/us-bank-transaction-categories-v2",
            filename="transactions-synthetic.csv",
            repo_type="dataset",
        )
    except Exception as e:
        print(f"HF download failed: {e}")
        # Check if it exists in cache already
        cache_path = Path.home() / ".cache" / "huggingface" / "hub"
        csv_files = list(cache_path.rglob("transactions-synthetic.csv"))
        if csv_files:
            path = str(csv_files[0])
            print(f"Found in cache: {path}")
        else:
            print("Dataset not found in cache. Downloading via requests...")
            import requests
            url = "https://huggingface.co/datasets/DoDataThings/us-bank-transaction-categories-v2/resolve/main/transactions-synthetic.csv"
            resp = requests.get(url)
            resp.raise_for_status()
            local_path = DATA_DIR / "dodatathings.csv"
            with open(local_path, "wb") as f:
                f.write(resp.content)
            path = str(local_path)
            print(f"Downloaded to: {path}")

    df = pd.read_csv(path)
    samples = []
    mapped = 0
    skipped = 0
    for _, row in df.iterrows():
        cat = row["category"]
        desc = row["description"]
        our_cat = CATEGORY_MAP.get(cat)
        if our_cat is None:
            skipped += 1
            continue
        # Extract merchant name from description for ML training
        # e.g. "[debit] STARBUCKS 123 MAIN ST" -> merchant="STARBUCKS", description=full
        samples.append({
            "merchant": desc,
            "description": desc,
            "category": our_cat,
        })
        mapped += 1

    print(f"DoDataThings: {mapped} mapped, {skipped} skipped (unmapped categories)")
    return samples


def load_bootstrap() -> list[dict]:
    """Load existing bootstrap merchants."""
    path = DATA_DIR / "bootstrap_merchants.json"
    if not path.exists():
        print("No bootstrap data found")
        return []
    with open(path) as f:
        data = json.load(f)
    print(f"Bootstrap: {len(data['samples'])} samples")
    return data["samples"]


def load_user_samples() -> list[dict]:
    """Load user correction samples."""
    path = DATA_DIR / "user_samples.csv"
    if not path.exists():
        print("No user samples found")
        return []
    samples = []
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("merchant") and row.get("category"):
                samples.append(row)
    print(f"User samples: {len(samples)}")
    return samples


def main():
    print("=" * 60)
    print("FinBrain Categorizer Retraining")
    print("=" * 60)

    # 1. Load all data sources
    print("\n--- Loading data ---")
    dodata = load_dodatathings()
    bootstrap = load_bootstrap()
    user_samples = load_user_samples()

    all_samples = dodata + bootstrap + user_samples
    print(f"\nTotal samples: {len(all_samples)}")

    # 2. Prepare texts and labels
    texts = [preprocess(s["merchant"]) for s in all_samples]
    labels = [s["category"] for s in all_samples]

    # Verify all labels are valid
    label_set = set(labels)
    print(f"Categories used: {sorted(label_set)}")
    for cat in label_set:
        if cat not in OUR_CATEGORIES:
            print(f"  WARNING: Unknown category '{cat}'")

    # 3. Split into train/val
    X_train, X_val, y_train, y_val = train_test_split(
        texts, labels, test_size=0.1, random_state=42, stratify=labels
    )
    print(f"\nTrain: {len(X_train)}, Val: {len(X_val)}")

    # 4. Train with optimized parameters
    print("\n--- Training ---")
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 3),
            max_features=10000,
            lowercase=True,
            sublinear_tf=True,
            max_df=0.85,
            min_df=2,
        )),
        ("clf", LogisticRegression(
            C=1.0,
            max_iter=2000,
            random_state=42,
            solver="lbfgs",
            class_weight="balanced",
        )),
    ])
    pipeline.fit(X_train, y_train)

    # 5. Evaluate
    print("\n--- Evaluation ---")
    train_acc = accuracy_score(y_train, pipeline.predict(X_train))
    val_acc = accuracy_score(y_val, pipeline.predict(X_val))
    print(f"Train accuracy: {train_acc:.4f}")
    print(f"Val accuracy:   {val_acc:.4f}")

    print("\nClassification report (validation set):")
    print(classification_report(y_val, pipeline.predict(X_val), target_names=pipeline.classes_))

    # 6. Confidence analysis
    print("\n--- Confidence Analysis ---")
    val_probs = pipeline.predict_proba(X_val)
    val_preds = pipeline.predict(X_val)
    classes = pipeline.classes_.tolist()

    for threshold in [0.5, 0.6, 0.7, 0.8, 0.9, 0.95]:
        high_conf_mask = np.max(val_probs, axis=1) >= threshold
        if high_conf_mask.sum() == 0:
            continue
        acc = accuracy_score(
            np.array(y_val)[high_conf_mask],
            val_preds[high_conf_mask],
        )
        coverage = high_conf_mask.mean()
        print(f"  Threshold {threshold:.2f}: accuracy={acc:.4f}, coverage={coverage:.3f} ({high_conf_mask.sum()}/{len(val_preds)})")

    # 7. Save model
    print(f"\n--- Saving model to {MODEL_PATH} ---")
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(pipeline, f)
    print(f"Model saved ({os.path.getsize(MODEL_PATH) / 1024:.0f} KB)")

    # 8. Save merged training data for future retraining
    merged_path = DATA_DIR / "merged_training_data.csv"
    with open(merged_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["merchant", "description", "category"])
        writer.writeheader()
        writer.writerows(all_samples)
    print(f"Training data saved to {merged_path}")

    print("\nDone!")
    return pipeline


if __name__ == "__main__":
    main()
