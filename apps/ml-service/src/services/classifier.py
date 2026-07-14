import os
import re
import csv
import json
import pickle
import logging
from pathlib import Path

import torch
import numpy as np
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
)

logger = logging.getLogger(__name__)

_default_data = "/app/data" if Path("/app/data").exists() else str(Path(__file__).resolve().parent.parent.parent / "data")
DATA_DIR = Path(os.environ.get("ML_DATA_DIR", _default_data))
MODEL_PATH = DATA_DIR / "xlmr_model"
AUGMENTED_PATH = DATA_DIR / "augmented_samples.csv"
BOOTSTRAP_PATH = DATA_DIR / "bootstrap_merchants.json"
SAMPLES_PATH = DATA_DIR / "user_samples.csv"

CATEGORIES = [
    "Food & Drink", "Shopping", "Transport", "Bills & Utilities",
    "Entertainment", "Healthcare", "Education", "Housing", "Income", "Other",
]

CATEGORY_MAP = {c: i for i, c in enumerate(CATEGORIES)}
ID2LABEL = {i: c for i, c in enumerate(CATEGORIES)}

DEFAULT_MODEL = "xlm-roberta-base"


def _preprocess_text(text: str) -> str:
    """Clean and normalize transaction text for the model."""
    text = text.strip()
    # Normalize currency amounts: $12.50 -> AMT, €1.234,56 -> AMT
    text = re.sub(r'[$€£¥₹]\s*[\d.,]+', 'MONEY', text)
    text = re.sub(r'[\d.,]+\s*[$€£¥₹]', 'MONEY', text)
    # Normalize card numbers: ****1234 -> CARD
    text = re.sub(r'\*{4}\d{4}', 'CARD', text)
    # Normalize store/reference numbers: #1234, STORE #1234
    text = re.sub(r'#\d{3,}', 'STORE', text)
    # Normalize dates that appear in receipts
    text = re.sub(r'\d{2}[/-]\d{2}[/-]\d{2,4}', 'DATE', text)
    # Collapse whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text


class TransactionClassifier:
    def __init__(self, model_name: str = DEFAULT_MODEL):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.classifier = None
        self._loaded = False
        self._device = "cuda" if torch.cuda.is_available() else "cpu"

    def load(self):
        if self._loaded:
            return

        if MODEL_PATH.exists() and any(MODEL_PATH.iterdir()):
            try:
                logger.info(f"Loading fine-tuned model from {MODEL_PATH}")
                self.model = AutoModelForSequenceClassification.from_pretrained(
                    str(MODEL_PATH)
                )
                self.tokenizer = AutoTokenizer.from_pretrained(str(MODEL_PATH))
                self.model.to(self._device)
                self.model.eval()
                self._loaded = True
                logger.info(f"Model loaded on {self._device}")
                return
            except Exception as e:
                logger.warning(f"Failed to load fine-tuned model: {e}")

        logger.warning("No fine-tuned model available. Predictions will return null.")
        self._loaded = True

    def predict(self, merchant: str, description: str) -> dict:
        self.load()
        raw_text = self._build_text(merchant, description)
        text = _preprocess_text(raw_text)

        if not text:
            return {"categoryName": None, "confidence": 0.0, "alternatives": []}

        if self.model is not None and self.tokenizer is not None:
            inputs = self.tokenizer(
                text,
                truncation=True,
                padding=True,
                max_length=64,
                return_tensors="pt",
            )
            inputs = {k: v.to(self._device) for k, v in inputs.items() if k != "token_type_ids"}
            with torch.no_grad():
                outputs = self.model(**inputs)
            probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
            scores = probs[0].cpu().numpy()
            sorted_indices = np.argsort(scores)[::-1]
            alternatives = [
                {"categoryName": ID2LABEL[int(i)], "confidence": round(float(scores[i]), 4)}
                for i in sorted_indices[:5]
                if scores[i] > 0.01
            ]
            top_idx = int(sorted_indices[0])
            return {
                "categoryName": ID2LABEL[top_idx],
                "confidence": round(float(scores[top_idx]), 4),
                "alternatives": alternatives,
            }

        return {"categoryName": None, "confidence": 0.0, "alternatives": []}

    def predict_batch(self, items: list[dict]) -> list[dict]:
        """Predict categories for a batch of transactions."""
        self.load()
        results = []
        for item in items:
            merchant = item.get("merchant", "")
            description = item.get("description", "")
            pred = self.predict(merchant, description)
            results.append({
                "merchant": merchant,
                "description": description,
                "categoryName": pred["categoryName"],
                "confidence": pred["confidence"],
                "alternatives": pred["alternatives"],
            })
        return results

    def _build_text(self, merchant: str, description: str) -> str:
        parts = [p for p in [merchant, description] if p and p.strip()]
        return " ".join(parts).strip() if parts else ""

    @property
    def is_loaded(self) -> bool:
        return self._loaded and self.model is not None


classifier = TransactionClassifier()
