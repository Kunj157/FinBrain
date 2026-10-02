import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.receipts import router as receipts_router
from routes.categorize import router as categorize_router
from routes.forecast import router as forecast_router
from services.classifier import classifier as xlmr_classifier, DATA_DIR

app = FastAPI(
    title="FinBrain ML Service",
    version="0.2.0",
    description="AI-powered transaction categorization and financial analysis",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(receipts_router)
app.include_router(categorize_router)
app.include_router(forecast_router)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "finbrain-ml", "timestamp": __import__("datetime").datetime.now().isoformat()}


@app.get("/api/v1/models")
async def list_models():
    import json

    metrics_path = DATA_DIR / "training_metrics.json"
    training_info = None
    if metrics_path.exists():
        with open(metrics_path) as f:
            training_info = json.load(f)

    return {
        "models": [
            {
                "id": "xlm-roberta-categorizer",
                "name": "XLM-RoBERTa Transaction Categorizer",
                "status": "ready" if xlmr_classifier.is_loaded else "not_loaded",
                "type": "transformer",
                "base_model": "xlm-roberta-base",
                "categories": [
                    "Food & Drink", "Shopping", "Transport", "Bills & Utilities",
                    "Entertainment", "Healthcare", "Education", "Housing", "Income", "Other",
                ],
                "training": training_info,
            },
            {"id": "sklearn-categorizer", "name": "sklearn TF-IDF + LogisticRegression", "status": "ready", "type": "sklearn"},
            {"id": "moving_average", "name": "Moving Average", "status": "ready"},
            {"id": "linear_regression", "name": "Linear Regression", "status": "ready"},
            {"id": "arima", "name": "ARIMA", "status": "ready"},
            {"id": "prophet", "name": "Prophet", "status": "ready"},
        ]
    }


@app.get("/api/v1/models/xlmr")
async def xlmr_model_info():
    xlmr_classifier.load()
    import json

    metrics_path = DATA_DIR / "training_metrics.json"
    training_info = None
    if metrics_path.exists():
        with open(metrics_path) as f:
            training_info = json.load(f)

    return {
        "model": "XLM-RoBERTa",
        "base_model": "xlm-roberta-base",
        "status": "ready" if xlmr_classifier.is_loaded else "not_trained",
        "device": xlmr_classifier._device,
        "categories": [
            "Food & Drink", "Shopping", "Transport", "Bills & Utilities",
            "Entertainment", "Healthcare", "Education", "Housing", "Income", "Other",
        ],
        "training": training_info,
    }
