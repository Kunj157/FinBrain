from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.receipts import router as receipts_router
from routes.categorize import router as categorize_router
from services.classifier import classifier as xlmr_classifier

app = FastAPI(
    title="FinBrain ML Service",
    version="0.1.0",
    description="AI-powered financial forecasting and analysis",
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


@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "service": "finbrain-ml", "timestamp": __import__("datetime").datetime.now().isoformat()}


@app.get("/api/v1/models")
async def list_models():
    return {
        "models": [
            {"id": "moving_average", "name": "Moving Average", "status": "ready"},
            {"id": "linear_regression", "name": "Linear Regression", "status": "ready"},
            {"id": "arima", "name": "ARIMA", "status": "development"},
            {"id": "prophet", "name": "Prophet", "status": "development"},
        ]
    }


@app.get("/api/v1/models/xlmr")
async def xlmr_model_info():
    xlmr_classifier.load()
    return {
        "model": "XLM-RoBERTa",
        "status": "ready" if xlmr_classifier.classifier is not None else "not_trained",
        "device": xlmr_classifier._device,
        "categories": [
            "Food & Drink", "Shopping", "Transport", "Bills & Utilities",
            "Entertainment", "Healthcare", "Education", "Housing", "Income", "Other",
        ],
    }
