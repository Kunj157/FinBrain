import argparse
import csv
import json
import logging
import math
import os
import random
from pathlib import Path

import numpy as np
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    get_scheduler,
)
from torch.optim import AdamW
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, f1_score
from tqdm import tqdm

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DATA_DIR = Path(os.environ.get("ML_DATA_DIR", Path(__file__).resolve().parent.parent / "data"))
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


class TransactionDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length=128):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = self.texts[idx]
        label = self.labels[idx]
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding="max_length",
            max_length=self.max_length,
            return_tensors="pt",
        )
        return {
            "input_ids": encoding["input_ids"].squeeze(0),
            "attention_mask": encoding["attention_mask"].squeeze(0),
            "labels": torch.tensor(label, dtype=torch.long),
        }


def load_all_data() -> list[dict]:
    samples = []

    if BOOTSTRAP_PATH.exists():
        with open(BOOTSTRAP_PATH) as f:
            data = json.load(f)
        samples.extend(data["samples"])
        logger.info(f"Loaded {len(data['samples'])} bootstrap samples")

    if AUGMENTED_PATH.exists():
        with open(AUGMENTED_PATH, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("merchant") and row.get("category"):
                    samples.append(row)
        logger.info(f"Loaded augmented samples from {AUGMENTED_PATH}")

    if SAMPLES_PATH.exists():
        with open(SAMPLES_PATH, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("merchant") and row.get("category"):
                    samples.append(row)
        logger.info(f"Loaded user samples from {SAMPLES_PATH}")

    return samples


def prepare_data(samples: list[dict]) -> tuple:
    texts = []
    labels = []
    for s in samples:
        merchant = s.get("merchant", "")
        description = s.get("description", "")
        text = f"{merchant} {description}".strip()
        category = s["category"]
        if category not in CATEGORY_MAP:
            logger.warning(f"Unknown category: {category}, skipping")
            continue
        texts.append(text)
        labels.append(CATEGORY_MAP[category])
    return texts, labels


def train():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-name", default="distilbert-base-multilingual-cased")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--max-length", type=int, default=128)
    parser.add_argument("--val-split", type=float, default=0.1)
    args = parser.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")

    samples = load_all_data()
    logger.info(f"Total samples: {len(samples)}")

    texts, labels = prepare_data(samples)
    logger.info(f"Prepared {len(texts)} texts with {len(set(labels))} classes")

    train_texts, val_texts, train_labels, val_labels = train_test_split(
        texts, labels, test_size=args.val_split, random_state=42, stratify=labels
    )
    logger.info(f"Train: {len(train_texts)}, Val: {len(val_texts)}")

    tokenizer = AutoTokenizer.from_pretrained(args.model_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.model_name,
        num_labels=len(CATEGORIES),
        id2label=ID2LABEL,
        label2id=CATEGORY_MAP,
    )
    model.to(device)

    train_dataset = TransactionDataset(train_texts, train_labels, tokenizer, args.max_length)
    val_dataset = TransactionDataset(val_texts, val_labels, tokenizer, args.max_length)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size)

    optimizer = AdamW(model.parameters(), lr=args.lr)
    total_steps = len(train_loader) * args.epochs
    scheduler = get_scheduler(
        "linear", optimizer=optimizer, num_warmup_steps=int(0.1 * total_steps), num_training_steps=total_steps
    )

    best_val_acc = 0.0
    for epoch in range(args.epochs):
        model.train()
        total_loss = 0
        progress = tqdm(train_loader, desc=f"Epoch {epoch+1}/{args.epochs}")
        for batch in progress:
            batch = {k: v.to(device) for k, v in batch.items()}
            outputs = model(**batch)
            loss = outputs.loss
            loss.backward()
            optimizer.step()
            scheduler.step()
            optimizer.zero_grad()
            total_loss += loss.item()
            progress.set_postfix({"loss": f"{loss.item():.4f}"})

        val_acc = evaluate(model, val_loader, device)
        logger.info(f"Epoch {epoch+1}: train_loss={total_loss/len(train_loader):.4f}, val_acc={val_acc:.4f}")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            model.save_pretrained(str(MODEL_PATH))
            tokenizer.save_pretrained(str(MODEL_PATH))
            logger.info(f"Saved best model with val_acc={val_acc:.4f}")

    logger.info(f"Training complete. Best val_acc: {best_val_acc:.4f}")


def evaluate(model, loader, device):
    model.eval()
    all_preds = []
    all_labels = []
    with torch.no_grad():
        for batch in loader:
            batch = {k: v.to(device) for k, v in batch.items()}
            outputs = model(**batch)
            preds = torch.argmax(outputs.logits, dim=-1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(batch["labels"].cpu().numpy())
    return accuracy_score(all_labels, all_preds)


if __name__ == "__main__":
    train()