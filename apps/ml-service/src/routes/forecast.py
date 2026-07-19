import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.forecast import forecast_all, compute_monthly_series

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/forecast", tags=["forecast"])


class ForecastRequest(BaseModel):
    transactions: list[dict]
    periods: int = 6


class MonthlySeriesRequest(BaseModel):
    transactions: list[dict]


@router.post("")
async def create_forecast(req: ForecastRequest):
    if not req.transactions:
        raise HTTPException(status_code=400, detail="transactions array required")
    if len(req.transactions) < 3:
        raise HTTPException(status_code=400, detail="Need at least 3 transactions for forecasting")

    result = forecast_all(req.transactions, periods=min(req.periods, 24))
    return {"success": True, "data": result}


@router.post("/monthly-series")
async def monthly_series(req: MonthlySeriesRequest):
    if not req.transactions:
        raise HTTPException(status_code=400, detail="transactions array required")

    series = compute_monthly_series(req.transactions)
    return {"success": True, "data": series}
