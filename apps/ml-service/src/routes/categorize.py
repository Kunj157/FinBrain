from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.categorizer import categorizer

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
    return {"success": True, "data": categorizer.predict(req.merchant, req.description)}


@router.post("/batch")
async def categorize_batch(req: BatchRequest):
    results = []
    for tx in req.transactions:
        pred = categorizer.predict(tx.merchant, tx.description)
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
    categorizer.add_sample(req.merchant, req.description, req.categoryName)
    return {"success": True, "totalSamples": categorizer.samples_count}


@router.post("/load-bulk")
async def load_bulk(req: BulkLoadRequest):
    if not req.samples:
        raise HTTPException(status_code=400, detail="samples array required")
    result = categorizer.load_bulk(
        [s.model_dump() for s in req.samples],
        keep_existing=req.keep_existing,
    )
    return {"success": True, "data": result}


@router.post("/retrain")
async def retrain():
    result = categorizer.retrain()
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Retrain failed"))
    return {"success": True, "data": result}


@router.get("/status")
async def status():
    categorizer.load()
    return {
        "success": True,
        "data": {
            "modelLoaded": categorizer.pipeline is not None,
            "totalSamples": categorizer.samples_count,
            "classes": categorizer.classes_,
        },
    }
