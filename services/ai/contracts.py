from typing import Dict, Any
from pdfminer.high_level import extract_text

HEURISTICS = {
    "penalty": ["penalty", "liquidated damages", "late fee"],
    "jurisdiction": ["jurisdiction", "governing law", "venue"],
    "arbitration": ["arbitration", "dispute resolution"],
    "tax": ["gst", "vat", "withholding tax", "tax"],
    "payment": ["payment terms", "net", "days", "due", "milestone"],
}


def extract_pdf_text(file_path: str) -> str:
    return extract_text(file_path)


def analyze_contract_text(text: str) -> Dict[str, Any]:
    lower = text.lower()
    findings = {}
    risk_score = 0

    for k, keywords in HEURISTICS.items():
        hits = [kw for kw in keywords if kw in lower]
        findings[k] = {"hits": hits, "present": len(hits) > 0}
        if k in ("penalty", "jurisdiction", "arbitration", "tax") and hits:
            risk_score += 1

    # Naive risk mapping
    if risk_score >= 3:
        risk = "HIGH"
    elif risk_score == 2:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    summary = f"Detected {risk_score} critical topics: " + ", ".join([k for k, v in findings.items() if v["present"]])

    return {"riskLevel": risk, "summary": summary, "findings": findings}
