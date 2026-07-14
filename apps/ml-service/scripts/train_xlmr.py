#!/usr/bin/env python3
"""
Train XLM-RoBERTa for transaction categorization.
Supports GPU (FP16 + gradient checkpointing) with automatic CPU fallback.
"""

import argparse
import csv
import json
import logging
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

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

DATA_DIR = Path(os.environ.get("ML_DATA_DIR", Path(__file__).resolve().parent.parent / "data"))
MODEL_PATH = DATA_DIR / "xlmr_model"
AUGMENTED_PATH = DATA_DIR / "augmented_samples.csv"
TRAIN_4K_PATH = DATA_DIR / "train_4k.csv"
BOOTSTRAP_PATH = DATA_DIR / "bootstrap_merchants.json"
SAMPLES_PATH = DATA_DIR / "user_samples.csv"
METRICS_PATH = DATA_DIR / "training_metrics.json"

CATEGORIES = [
    "Food & Drink", "Shopping", "Transport", "Bills & Utilities",
    "Entertainment", "Healthcare", "Education", "Housing", "Income", "Other",
]
CATEGORY_MAP = {c: i for i, c in enumerate(CATEGORIES)}
ID2LABEL = {i: c for i, c in enumerate(CATEGORIES)}

DEFAULT_MODEL = "xlm-roberta-base"


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

    # Prefer the focused 4K dataset for faster training
    if TRAIN_4K_PATH.exists():
        with open(TRAIN_4K_PATH, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("merchant") and row.get("category"):
                    samples.append(row)
        logger.info(f"Loaded {len(samples)} samples from train_4k.csv")
        return samples

    # Fallback to full augmented dataset
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


def prepare_data(samples: list[dict]) -> tuple[list[str], list[int]]:
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
        if not text:
            continue
        texts.append(text)
        labels.append(CATEGORY_MAP[category])
    return texts, labels


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
    acc = accuracy_score(all_labels, all_preds)
    f1 = f1_score(all_labels, all_preds, average="weighted", zero_division=0)
    return acc, f1


def train():
    parser = argparse.ArgumentParser(description="Train XLM-RoBERTa for transaction categorization")
    parser.add_argument("--model-name", default=DEFAULT_MODEL, help="HuggingFace model name")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch-size", type=int, default=None, help="Batch size (auto-set based on device)")
    parser.add_argument("--lr", type=float, default=2e-5, help="Learning rate")
    parser.add_argument("--max-length", type=int, default=128, help="Max token length")
    parser.add_argument("--val-split", type=float, default=0.1, help="Validation split ratio")
    parser.add_argument("--test-split", type=float, default=0.1, help="Test split ratio")
    parser.add_argument("--warmup-ratio", type=float, default=0.1, help="Warmup ratio")
    parser.add_argument("--use-gpu", action="store_true", default=True, help="Try GPU training")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)

    # Device selection
    device = "cpu"
    use_fp16 = False
    if args.use_gpu and torch.cuda.is_available():
        gpu_mem = torch.cuda.get_device_properties(0).total_mem / (1024**3)
        logger.info(f"GPU available: {torch.cuda.get_device_name(0)} ({gpu_mem:.1f} GB)")
        if gpu_mem >= 1.5:
            device = "cuda"
            use_fp16 = True
            logger.info("Using GPU with FP16 mixed precision")
        else:
            logger.info(f"GPU has only {gpu_mem:.1f} GB, falling back to CPU")
    else:
        logger.info("No GPU available, using CPU")

    # Auto-set batch size
    if args.batch_size is None:
        args.batch_size = 2 if device == "cuda" else 8
        logger.info(f"Auto batch size: {args.batch_size}")

    logger.info(f"Device: {device}, FP16: {use_fp16}, Batch: {args.batch_size}, Epochs: {args.epochs}")

    # Load data
    samples = load_all_data()
    logger.info(f"Total raw samples: {len(samples)}")

    texts, labels = prepare_data(samples)
    logger.info(f"Prepared {len(texts)} texts with {len(set(labels))} classes")

    # Split: train / val / test
    train_texts, test_texts, train_labels, test_labels = train_test_split(
        texts, labels, test_size=args.test_split, random_state=args.seed, stratify=labels
    )
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        train_texts, train_labels, test_size=args.val_split, random_state=args.seed, stratify=train_labels
    )
    logger.info(f"Train: {len(train_texts)}, Val: {len(val_texts)}, Test: {len(test_texts)}")

    # Load tokenizer and model
    logger.info(f"Loading model: {args.model_name}")
    tokenizer = AutoTokenizer.from_pretrained(args.model_name)
    model = AutoModelForSequenceClassification.from_pretrained(
        args.model_name,
        num_labels=len(CATEGORIES),
        id2label=ID2LABEL,
        label2id=CATEGORY_MAP,
    )
    model.to(device)

    # Enable gradient checkpointing for GPU memory savings
    if device == "cuda":
        model.gradient_checkpointing_enable()
        logger.info("Gradient checkpointing enabled")

    # Create datasets and dataloaders
    train_dataset = TransactionDataset(train_texts, train_labels, tokenizer, args.max_length)
    val_dataset = TransactionDataset(val_texts, val_labels, tokenizer, args.max_length)
    test_dataset = TransactionDataset(test_texts, test_labels, tokenizer, args.max_length)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size)
    test_loader = DataLoader(test_dataset, batch_size=args.batch_size)

    # Optimizer and scheduler
    optimizer = AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
    total_steps = len(train_loader) * args.epochs
    warmup_steps = int(args.warmup_ratio * total_steps)
    scheduler = get_scheduler(
        "linear", optimizer=optimizer, num_warmup_steps=warmup_steps, num_training_steps=total_steps
    )

    # Training loop
    best_val_f1 = 0.0
    best_val_acc = 0.0
    training_history = []

    logger.info("Starting training...")
    for epoch in range(args.epochs):
        model.train()
        total_loss = 0
        correct = 0
        total = 0

        progress = tqdm(train_loader, desc=f"Epoch {epoch+1}/{args.epochs}")
        for batch in progress:
            batch = {k: v.to(device) for k, v in batch.items()}

            if use_fp16:
                with torch.cuda.amp.autocast():
                    outputs = model(**batch)
                    loss = outputs.loss
            else:
                outputs = model(**batch)
                loss = outputs.loss

            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            scheduler.step()
            optimizer.zero_grad()

            total_loss += loss.item()
            preds = torch.argmax(outputs.logits, dim=-1)
            correct += (preds == batch["labels"]).sum().item()
            total += batch["labels"].size(0)

            progress.set_postfix({
                "loss": f"{loss.item():.4f}",
                "acc": f"{correct/total:.4f}",
            })

        train_acc = correct / total
        avg_loss = total_loss / len(train_loader)
        val_acc, val_f1 = evaluate(model, val_loader, device)

        epoch_data = {
            "epoch": epoch + 1,
            "train_loss": round(avg_loss, 4),
            "train_acc": round(train_acc, 4),
            "val_acc": round(val_acc, 4),
            "val_f1": round(val_f1, 4),
        }
        training_history.append(epoch_data)
        logger.info(f"Epoch {epoch+1}: loss={avg_loss:.4f}, train_acc={train_acc:.4f}, val_acc={val_acc:.4f}, val_f1={val_f1:.4f}")

        # Save best model
        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_val_acc = val_acc
            MODEL_PATH.mkdir(parents=True, exist_ok=True)
            model.save_pretrained(str(MODEL_PATH))
            tokenizer.save_pretrained(str(MODEL_PATH))
            logger.info(f"Saved best model (val_acc={val_acc:.4f}, val_f1={val_f1:.4f})")

    # Final evaluation on test set
    logger.info("Evaluating on test set...")
    if MODEL_PATH.exists():
        best_model = AutoModelForSequenceClassification.from_pretrained(str(MODEL_PATH))
        best_model.to(device)
        best_model.eval()
        test_acc, test_f1 = evaluate(best_model, test_loader, device)
    else:
        test_acc, test_f1 = evaluate(model, test_loader, device)

    logger.info(f"Test accuracy: {test_acc:.4f}, Test F1: {test_f1:.4f}")

    # Generate classification report
    all_preds = []
    all_labels = []
    model.eval()
    with torch.no_grad():
        for batch in test_loader:
            batch = {k: v.to(device) for k, v in batch.items()}
            outputs = model(**batch)
            preds = torch.argmax(outputs.logits, dim=-1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(batch["labels"].cpu().numpy())

    report = classification_report(
        all_labels, all_preds,
        target_names=CATEGORIES,
        zero_division=0,
        output_dict=True,
    )

    # Save metrics
    metrics = {
        "model": args.model_name,
        "device": device,
        "fp16": use_fp16,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "learning_rate": args.lr,
        "max_length": args.max_length,
        "total_samples": len(texts),
        "train_samples": len(train_texts),
        "val_samples": len(val_texts),
        "test_samples": len(test_texts),
        "best_val_acc": round(best_val_acc, 4),
        "best_val_f1": round(best_val_f1, 4),
        "test_acc": round(test_acc, 4),
        "test_f1": round(test_f1, 4),
        "categories": CATEGORIES,
        "per_category": {
            cat: {
                "precision": round(report[cat]["precision"], 4),
                "recall": round(report[cat]["recall"], 4),
                "f1": round(report[cat]["f1-score"], 4),
                "support": int(report[cat]["support"]),
            }
            for cat in CATEGORIES if cat in report
        },
        "history": training_history,
    }

    METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)
    logger.info(f"Metrics saved to {METRICS_PATH}")

    logger.info("=" * 60)
    logger.info("Training complete!")
    logger.info(f"Best val accuracy: {best_val_acc:.4f}")
    logger.info(f"Best val F1: {best_val_f1:.4f}")
    logger.info(f"Test accuracy: {test_acc:.4f}")
    logger.info(f"Test F1: {test_f1:.4f}")
    logger.info(f"Model saved to: {MODEL_PATH}")
    logger.info("=" * 60)


if __name__ == "__main__":
    train()
