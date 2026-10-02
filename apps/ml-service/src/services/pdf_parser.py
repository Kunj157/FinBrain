import io
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def parse_pdf(file_bytes: bytes) -> str:
    try:
        import pdfplumber
    except ImportError:
        logger.error("pdfplumber not installed")
        return ""

    text = ""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        logger.error(f"PDF parsing failed: {e}")
        return ""

    return text.strip()


def parse_transactions(text: str) -> list[dict]:
    transactions = []
    lines = text.split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            continue

        amount_match = re.search(r'[\$€£¥₹]\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', line)
        date_match = re.search(r'(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})', line)

        merchant = line
        amount = None
        date = None

        if amount_match:
            amount = float(amount_match.group(1).replace(",", ""))
            merchant = line.replace(amount_match.group(0), "").strip()
        if date_match:
            merchant = merchant.replace(date_match.group(0), "").strip()

        merchant = re.sub(r'\s+', ' ', merchant).strip()
        if merchant and len(merchant) > 2:
            transactions.append({
                "merchant": merchant,
                "amount": amount,
                "date": date,
                "raw": line,
            })

    return transactions