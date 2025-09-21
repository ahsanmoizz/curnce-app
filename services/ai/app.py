import os
import tempfile
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional

from classifier import ClassifierService
from contracts import extract_pdf_text, analyze_contract_text

app = FastAPI(title="UFA AI Service", version="1.0")

clf = ClassifierService()


class TxPayload(BaseModel):
    description: str
    amount: float
    counterparty: Optional[str] = None
    branch: Optional[str] = None
    currency: Optional[str] = None
    country: Optional[str] = None


class BatchPayload(BaseModel):
    items: List[TxPayload]


@app.post("/v1/classify/transaction")
def classify_tx(p: TxPayload):
    return clf.classify_tx(p.dict())


@app.post("/v1/classify/batch")
def classify_batch(p: BatchPayload):
    return clf.classify_batch([it.dict() for it in p.items])


@app.post("/v1/contracts/extract")
async def contracts_extract(file: UploadFile = File(...)):
    suffix = ".pdf"
    with tempfile.NamedTemporaryFile(delete=True, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp.flush()
        text = extract_pdf_text(tmp.name)
    return {"text": text[:10000]}  # cap response size


class AnalyzeBody(BaseModel):
    text: str


@app.post("/v1/contracts/analyze")
def contracts_analyze(p: AnalyzeBody):
    return analyze_contract_text(p.text)


@app.get("/healthz")
def health():
    return {"ok": True}
