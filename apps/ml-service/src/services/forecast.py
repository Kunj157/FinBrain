import logging
from datetime import datetime, timedelta
from typing import Optional
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def moving_average_forecast(values: list[float], periods: int = 6, window: int = 3) -> dict:
    """Simple moving average forecast."""
    if len(values) < 2:
        return {"forecast": [], "model": "moving_average", "accuracy": None}

    arr = np.array(values, dtype=float)
    forecasts = []
    for i in range(periods):
        w = min(window, len(arr))
        forecast_val = float(np.mean(arr[-w:]))
        forecasts.append(round(forecast_val, 2))
        arr = np.append(arr, forecast_val)

    mape = _compute_mape(values, forecasts[:len(values)]) if len(values) > 0 else None
    return {"forecast": forecasts, "model": "moving_average", "accuracy": mape}


def linear_regression_forecast(values: list[float], periods: int = 6) -> dict:
    """Linear regression trend forecast."""
    if len(values) < 2:
        return {"forecast": [], "model": "linear_regression", "accuracy": None}

    arr = np.array(values, dtype=float)
    x = np.arange(len(arr))
    coeffs = np.polyfit(x, arr, 1)
    poly = np.poly1d(coeffs)

    forecasts = []
    for i in range(periods):
        val = float(poly(len(arr) + i))
        forecasts.append(round(val, 2))

    mape = _compute_mape(values, [float(poly(i)) for i in range(len(values))])
    return {"forecast": forecasts, "model": "linear_regression", "accuracy": mape}


def arima_forecast(values: list[float], periods: int = 6) -> dict:
    """ARIMA forecast using statsmodels."""
    if len(values) < 6:
        return {"forecast": [], "model": "arima", "accuracy": None, "error": "Need at least 6 data points"}

    try:
        from statsmodels.tsa.arima.model import ARIMA

        arr = np.array(values, dtype=float)
        model = ARIMA(arr, order=(1, 1, 1))
        fitted = model.fit()
        pred = fitted.get_forecast(steps=periods)
        forecasts = [round(float(x), 2) for x in pred.predicted_mean]

        mape = _compute_mape(values, [round(float(x), 2) for x in fitted.fittedvalues])
        return {"forecast": forecasts, "model": "arima", "accuracy": mape}
    except Exception as e:
        logger.warning(f"ARIMA failed: {e}, falling back to linear regression")
        return linear_regression_forecast(values, periods)


def prophet_forecast(dates: list[str], values: list[float], periods: int = 6) -> dict:
    """Prophet forecast for daily/monthly data."""
    if len(values) < 10:
        return {"forecast": [], "model": "prophet", "accuracy": None, "error": "Need at least 10 data points for Prophet"}

    try:
        from prophet import Prophet

        df = pd.DataFrame({"ds": pd.to_datetime(dates), "y": values})
        df = df.sort_values("ds").drop_duplicates(subset="ds", keep="last")

        m = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
            changepoint_prior_scale=0.05,
        )
        m.fit(df)

        last_date = df["ds"].max()
        future_dates = pd.date_range(start=last_date + pd.DateOffset(months=1), periods=periods, freq="MS")
        future = pd.DataFrame({"ds": future_dates})
        pred = m.predict(future)

        forecasts = [round(float(x), 2) for x in pred["yhat"].values]

        train_pred = m.predict(df)
        mape = _compute_mape(values, [round(float(x), 2) for x in train_pred["yhat"].values])
        return {"forecast": forecasts, "model": "prophet", "accuracy": mape}
    except Exception as e:
        logger.warning(f"Prophet failed: {e}, falling back to linear regression")
        return linear_regression_forecast(values, periods)


def compute_monthly_series(transactions: list[dict]) -> dict:
    """Aggregate transactions into monthly income/expense series."""
    monthly_income: dict[str, float] = {}
    monthly_expense: dict[str, float] = {}

    for txn in transactions:
        dt = pd.to_datetime(txn["date"])
        month_key = dt.to_period("M").to_timestamp().strftime("%Y-%m-%d")
        amount = abs(float(txn["amount"]))

        if txn["type"] == "income":
            monthly_income[month_key] = monthly_income.get(month_key, 0) + amount
        else:
            monthly_expense[month_key] = monthly_expense.get(month_key, 0) + amount

    all_months = sorted(set(list(monthly_income.keys()) + list(monthly_expense.keys())))

    income_series = {"dates": all_months, "values": [round(monthly_income.get(m, 0), 2) for m in all_months]}
    expense_series = {"dates": all_months, "values": [round(monthly_expense.get(m, 0), 2) for m in all_months]}
    net_series = {
        "dates": all_months,
        "values": [round(income_series["values"][i] - expense_series["values"][i], 2) for i in range(len(all_months))],
    }

    return {
        "income": income_series,
        "expense": expense_series,
        "net": net_series,
    }


def forecast_all(transactions: list[dict], periods: int = 6) -> dict:
    """Run all forecast models on transaction data."""
    series = compute_monthly_series(transactions)

    results = {}
    for key in ["income", "expense", "net"]:
        dates = series[key]["dates"]
        values = series[key]["values"]

        results[key] = {
            "historical": {"dates": dates, "values": values},
            "models": {
                "moving_average": moving_average_forecast(values, periods),
                "linear_regression": linear_regression_forecast(values, periods),
                "arima": arima_forecast(values, periods),
            },
        }

        if len(values) >= 10:
            results[key]["models"]["prophet"] = prophet_forecast(dates, values, periods)
        else:
            results[key]["models"]["prophet"] = {
                "forecast": [],
                "model": "prophet",
                "accuracy": None,
                "error": "Need at least 10 months of data",
            }

    return {"monthly_series": series, "forecasts": results, "periods": periods}


def _compute_mape(actual: list[float], predicted: list[float]) -> Optional[float]:
    """Compute Mean Absolute Percentage Error."""
    if not actual or not predicted:
        return None
    n = min(len(actual), len(predicted))
    actual = actual[:n]
    predicted = predicted[:n]
    non_zero = [(a, p) for a, p in zip(actual, predicted) if abs(a) > 0.01]
    if not non_zero:
        return None
    errors = [abs(a - p) / abs(a) for a, p in non_zero]
    mape = float(np.mean(errors)) * 100
    return round(mape, 1)
