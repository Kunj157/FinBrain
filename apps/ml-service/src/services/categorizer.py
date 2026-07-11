import json
import csv
import os
import pickle
import re
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import accuracy_score

DATA_DIR = Path(os.environ.get("ML_DATA_DIR", "/app/data"))
BOOTSTRAP_PATH = DATA_DIR / "bootstrap_merchants.json"
SAMPLES_PATH = DATA_DIR / "user_samples.csv"
MODEL_PATH = DATA_DIR / "categorizer.pkl"


class Categorizer:
    def __init__(self):
        self.pipeline: Pipeline | None = None
        self.classes_: list[str] = []
        self._all_samples: list[dict] = []
        self._loaded = False

    def load(self):
        if self._loaded:
            return
        self._all_samples = []

        if BOOTSTRAP_PATH.exists():
            with open(BOOTSTRAP_PATH) as f:
                data = json.load(f)
            self._all_samples.extend(data["samples"])

        if SAMPLES_PATH.exists():
            with open(SAMPLES_PATH, newline="") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    if row.get("merchant") and row.get("category"):
                        self._all_samples.append(row)

        if MODEL_PATH.exists():
            with open(MODEL_PATH, "rb") as f:
                self.pipeline = pickle.load(f)
            self.classes_ = self.pipeline.named_steps["clf"].classes_.tolist() if hasattr(self.pipeline.named_steps["clf"], "classes_") else []
        elif self._all_samples:
            self._train()

        self._loaded = True

    def _preprocess(self, merchant: str, description: str) -> str:
        text = f"{merchant} {description}".lower().strip()
        text = re.sub(r"[^a-z0-9\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _train(self):
        if not self._all_samples:
            raise ValueError("No training data available")

        texts = [self._preprocess(s["merchant"], s.get("description", "")) for s in self._all_samples]
        labels = [s["category"] for s in self._all_samples]

        self.pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=5000, lowercase=True)),
            ("clf", LogisticRegression(C=1.0, max_iter=1000, random_state=42)),
        ])
        self.pipeline.fit(texts, labels)
        self.classes_ = self.pipeline.classes_.tolist()

        with open(MODEL_PATH, "wb") as f:
            pickle.dump(self.pipeline, f)

    def predict(self, merchant: str, description: str) -> dict:
        self.load()
        text = self._preprocess(merchant, description)

        if self.pipeline is None:
            return {"categoryName": None, "confidence": 0.0, "alternatives": []}

        probs = self.pipeline.predict_proba([text])[0]
        top_idx = np.argmax(probs)
        top_class = self.classes_[top_idx]
        top_conf = float(probs[top_idx])

        sorted_idx = np.argsort(probs)[::-1]
        alternatives = [
            {"categoryName": self.classes_[i], "confidence": float(probs[i])}
            for i in sorted_idx[:5]
            if float(probs[i]) > 0.01
        ]

        return {
            "categoryName": top_class,
            "confidence": top_conf,
            "alternatives": alternatives,
        }

    def add_sample(self, merchant: str, description: str, category: str):
        self.load()
        self._all_samples.append({"merchant": merchant, "description": description, "category": category})
        file_exists = SAMPLES_PATH.exists()
        with open(SAMPLES_PATH, "a", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["merchant", "description", "category"])
            if not file_exists:
                writer.writeheader()
            writer.writerow({"merchant": merchant, "description": description, "category": category})
        self._loaded = False

    def retrain(self) -> dict:
        self.load()
        if not self._all_samples:
            return {"success": False, "error": "No training data available", "samplesUsed": 0}

        texts = [self._preprocess(s["merchant"], s.get("description", "")) for s in self._all_samples]
        labels = [s["category"] for s in self._all_samples]
        self._train()

        preds = self.pipeline.predict(texts)
        acc = float(accuracy_score(labels, preds))

        return {"success": True, "accuracy": round(acc, 4), "samplesUsed": len(self._all_samples)}

    @property
    def samples_count(self) -> int:
        return len(self._all_samples)


categorizer = Categorizer()
