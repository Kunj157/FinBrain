import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.classifier import classifier as xlmr_classifier
from services.categorizer import categorizer as sklearn_categorizer
from services.classifier import DATA_DIR

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/categorize", tags=["categorize"])


class CategorizeRequest(BaseModel):
    merchant: str = ""
    description: str = ""


class TextRequest(BaseModel):
    text: str


class TrainRequest(BaseModel):
    merchant: str
    description: str = ""
    categoryName: str


class BatchRequest(BaseModel):
    transactions: list[CategorizeRequest]


class BulkSample(BaseModel):
    merchant: str = ""
    description: str = ""
    category: str


class BulkLoadRequest(BaseModel):
    samples: list[BulkSample]
    keep_existing: bool = False


def _predict(merchant: str, description: str) -> dict:
    """Unified prediction: transformer first, sklearn fallback."""
    # Try transformer model
    result = xlmr_classifier.predict(merchant, description)
    if result.get("categoryName"):
        result["source"] = "transformer"
        return result

    # Fallback to sklearn
    sklearn_result = sklearn_categorizer.predict(merchant, description)
    if sklearn_result.get("categoryName"):
        sklearn_result["source"] = "sklearn"
        return sklearn_result

    return {"categoryName": None, "confidence": 0.0, "alternatives": [], "source": "none"}


@router.post("")
async def categorize(req: CategorizeRequest):
    if not req.merchant and not req.description:
        raise HTTPException(status_code=400, detail="merchant or description required")
    result = _predict(req.merchant, req.description)
    return {"success": True, "data": result}


@router.post("/text")
async def categorize_text(req: TextRequest):
    """Categorize from raw freeform text (e.g., 'Uber ride to airport $25')."""
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="text required")

    # Try transformer directly on the full text
    result = xlmr_classifier.predict(req.text, "")
    if result.get("categoryName"):
        result["source"] = "transformer"
        return {"success": True, "data": result}

    # Fallback to sklearn
    sklearn_result = sklearn_categorizer.predict(req.text, "")
    if sklearn_result.get("categoryName"):
        sklearn_result["source"] = "sklearn"
        return {"success": True, "data": sklearn_result}

    return {"success": True, "data": {"categoryName": None, "confidence": 0.0, "alternatives": [], "source": "none"}}


@router.post("/batch")
async def categorize_batch(req: BatchRequest):
    results = []
    for tx in req.transactions:
        pred = _predict(tx.merchant, tx.description)
        results.append({
            "merchant": tx.merchant,
            "description": tx.description,
            "categoryName": pred["categoryName"],
            "confidence": pred["confidence"],
            "routing": pred.get("routing", "unknown"),
            "alternatives": pred["alternatives"],
            "source": pred.get("source", "none"),
        })
    return {"success": True, "data": results}


@router.post("/train")
async def train(req: TrainRequest):
    """Record a user correction for future retraining."""
    if not req.merchant and not req.description:
        raise HTTPException(status_code=400, detail="merchant or description required")
    if not req.categoryName:
        raise HTTPException(status_code=400, detail="categoryName required")

    # Add to sklearn for immediate effect
    sklearn_categorizer.add_sample(req.merchant, req.description, req.categoryName)

    # Also save to corrections file for transformer retraining
    import json
    from pathlib import Path
    corrections_path = Path(DATA_DIR) / "user_corrections.jsonl"
    corrections_path.parent.mkdir(parents=True, exist_ok=True)
    with open(corrections_path, "a") as f:
        f.write(json.dumps({
            "merchant": req.merchant,
            "description": req.description,
            "category": req.categoryName,
        }) + "\n")

    return {"success": True, "totalSamples": sklearn_categorizer.samples_count}


@router.post("/load-bulk")
async def load_bulk(req: BulkLoadRequest):
    if not req.samples:
        raise HTTPException(status_code=400, detail="samples array required")
    result = sklearn_categorizer.load_bulk(
        [s.model_dump() for s in req.samples],
        keep_existing=req.keep_existing,
    )
    return {"success": True, "data": result}


@router.post("/retrain")
async def retrain():
    """Retrain the sklearn model from accumulated samples."""
    result = sklearn_categorizer.retrain()
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Retrain failed"))
    return {"success": True, "data": result}


@router.get("/status")
async def status():
    xlmr_classifier.load()
    sklearn_categorizer.load()

    # Check training metrics
    from pathlib import Path
    import json
    metrics_path = Path(DATA_DIR) / "training_metrics.json"
    training_info = None
    if metrics_path.exists():
        with open(metrics_path) as f:
            training_info = json.load(f)

    auto_conf = sklearn_categorizer.AUTO_CONFIDENCE if hasattr(sklearn_categorizer, 'AUTO_CONFIDENCE') else 0.0
    suggest_conf = sklearn_categorizer.SUGGEST_CONFIDENCE if hasattr(sklearn_categorizer, 'SUGGEST_CONFIDENCE') else 0.0

    return {
        "success": True,
        "data": {
            "transformerLoaded": xlmr_classifier.is_loaded,
            "sklearnLoaded": sklearn_categorizer.pipeline is not None,
            "totalSamples": sklearn_categorizer.samples_count,
            "classes": sklearn_categorizer.classes_,
            "training": training_info,
            "confidenceRouting": {
                "autoThreshold": auto_conf,
                "suggestThreshold": suggest_conf,
            },

        },
    }
