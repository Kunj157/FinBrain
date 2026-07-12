from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from services.categorizer import categorizer as sklearn_categorizer
from services.classifier import classifier as xlmr_classifier

router = APIRouter(prefix="/api/v1/categorize", tags=["categorize"])


class CategorizeRequest(BaseModel):
    merchant: str = ""
    description: str = ""


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


@router.post("")
async def categorize(req: CategorizeRequest):
    if not req.merchant and not req.description:
        raise HTTPException(status_code=400, detail="merchant or description required")
    result = xlmr_classifier.predict(req.merchant, req.description)
    return {"success": True, "data": result}


@router.post("/batch")
async def categorize_batch(req: BatchRequest):
    results = []
    for tx in req.transactions:
        pred = xlmr_classifier.predict(tx.merchant, tx.description)
        results.append({
            "merchant": tx.merchant,
            "description": tx.description,
            "categoryName": pred["categoryName"],
            "confidence": pred["confidence"],
            "alternatives": pred["alternatives"],
        })
    return {"success": True, "data": results}


@router.post("/train")
async def train(req: TrainRequest):
    if not req.merchant and not req.description:
        raise HTTPException(status_code=400, detail="merchant or description required")
    if not req.categoryName:
        raise HTTPException(status_code=400, detail="categoryName required")
    sklearn_categorizer.add_sample(req.merchant, req.description, req.categoryName)
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
    result = sklearn_categorizer.retrain()
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Retrain failed"))
    return {"success": True, "data": result}


@router.get("/status")
async def status():
    xlmr_classifier.load()
    sklearn_categorizer.load()
    return {
        "success": True,
        "data": {
            "xlmrModelLoaded": xlmr_classifier.classifier is not None,
            "sklearnModelLoaded": sklearn_categorizer.pipeline is not None,
            "totalSamples": sklearn_categorizer.samples_count,
            "classes": sklearn_categorizer.classes_,
        },
    }