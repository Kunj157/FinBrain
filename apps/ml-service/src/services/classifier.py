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
    pipeline,
)

logger = logging.getLogger(__name__)

DATA_DIR = Path(os.environ.get("ML_DATA_DIR", "/app/data"))
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


class XLMRClassifier:
    def __init__(self, model_name: str = "distilbert-base-multilingual-cased"):
        self.model_name = model_name
        self.tokenizer = None
        self.model = None
        self.classifier = None
        self._loaded = False
        self._device = "cuda" if torch.cuda.is_available() else "cpu"

    def load(self):
        if self._loaded:
            return

        if MODEL_PATH.exists():
            logger.info(f"Loading fine-tuned model from {MODEL_PATH}")
            self.model = AutoModelForSequenceClassification.from_pretrained(
                str(MODEL_PATH)
            )
            self.tokenizer = AutoTokenizer.from_pretrained(str(MODEL_PATH))
            self.model.to(self._device)
            self.model.eval()
            self.classifier = pipeline(
                "text-classification",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if self._device == "cuda" else -1,
                top_k=None,
            )
            self._loaded = True
            logger.info(f"Model loaded on {self._device}")
            return

        logger.info("No fine-tuned model found, using zero-shot classification")
        self._loaded = True

    def predict(self, merchant: str, description: str) -> dict:
        self.load()
        text = self._build_text(merchant, description)

        if self.classifier is not None:
            results = self.classifier(text)
            scores = {r["label"]: r["score"] for r in results[0]}
            sorted_results = sorted(results[0], key=lambda x: x["score"], reverse=True)
            top = sorted_results[0]
            alternatives = [
                {"categoryName": r["label"], "confidence": round(r["score"], 4)}
                for r in sorted_results[:5]
                if r["score"] > 0.01
            ]
            return {
                "categoryName": top["label"],
                "confidence": round(top["score"], 4),
                "alternatives": alternatives,
            }

        return {"categoryName": None, "confidence": 0.0, "alternatives": []}

    def _build_text(self, merchant: str, description: str) -> str:
        parts = [p for p in [merchant, description] if p]
        return " ".join(parts).strip() if parts else ""


classifier = XLMRClassifier()