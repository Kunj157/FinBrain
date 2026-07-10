import io
import re
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, HTTPException
import pytesseract
from PIL import Image

router = APIRouter(prefix="/api/v1/receipts", tags=["receipts"])


def extract_merchant(text: str) -> str | None:
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    if not lines:
        return None

    skip_keywords = [
        "receipt", "invoice", "order", "total", "tax", "subtotal",
        "thank you", "store #", "tel:", "phone", "date", "time",
        "cashier", "terminal", "card", "visa", "mastercard", "amex",
        "change", "payment", "debit", "credit",
    ]

    for line in lines[:8]:
        lower = line.lower()
        if any(kw in lower for kw in skip_keywords):
            continue
        if re.search(r"\d+\.\d{2}", line):  # contains a price
            continue
        if len(line) > 2 and len(line) < 60:
            return line

    return lines[0] if lines else None


def extract_total(text: str) -> float | None:
    patterns = [
        r"total\s*[\$€£¥₹]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)",
        r"(?:amount|balance)\s*(?:due|paid)?\s*[\$€£¥₹]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)",
        r"[\$€£¥₹]\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s*$",
    ]
    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE | re.MULTILINE)
        if match:
            return float(match.group(1).replace(",", ""))
    return None


def extract_date(text: str) -> str | None:
    patterns = [
        r"(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})",
        r"(\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})",
        r"(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})",
        r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}",
    ]

    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            try:
                dt = datetime.strptime(match.group(1), "%m/%d/%Y")
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                try:
                    dt = datetime.strptime(match.group(1), "%m-%d-%Y")
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    try:
                        dt = datetime.strptime(match.group(1), "%Y-%m-%d")
                        return dt.strftime("%Y-%m-%d")
                    except ValueError:
                        return match.group(1)
    return None


@router.post("/ocr")
async def ocr_receipt(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        text = pytesseract.image_to_string(image)

        if not text.strip():
            return {"success": True, "data": {"text": "", "merchant": None, "amount": None, "date": None, "message": "No text could be extracted from the image"}}

        merchant = extract_merchant(text)
        amount = extract_total(text)
        date = extract_date(text)

        return {
            "success": True,
            "data": {
                "text": text.strip(),
                "merchant": merchant,
                "amount": amount,
                "date": date,
                "raw": {"merchant": merchant, "amount": amount, "date": date},
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


@router.get("/health")
async def health():
    return {"status": "ok", "service": "receipt-ocr"}