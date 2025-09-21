import os
import json
import numpy as np
from typing import Dict, Any, List
from sentence_transformers import SentenceTransformer
import xgboost as xgb
from s3_utils import download_to_bytes


class ClassifierService:
    def __init__(self):
        # Load model versions (env or default)
        self.models_bucket = os.getenv("S3_MODELS_BUCKET", "ufa-models")
        self.embed_model_name = os.getenv("EMBED_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
        self.xgb_model_key = os.getenv("XGB_MODEL_KEY", "classifier/xgb_model.json")
        self.label_map_key = os.getenv("LABEL_MAP_KEY", "classifier/labels.json")
        self.tax_map_key = os.getenv("TAX_MAP_KEY", "classifier/tax_map.json")

        # Load embeddings model
        self.embedder = SentenceTransformer(self.embed_model_name)

        # Load XGBoost model from S3
        xgb_bytes = download_to_bytes(self.models_bucket, self.xgb_model_key)
        self.xgb = xgb.XGBClassifier()
        self.xgb.load_model(bytearray(xgb_bytes))

        # Load label map + tax mapping
        self.label_map = json.loads(download_to_bytes(self.models_bucket, self.label_map_key).decode("utf-8"))
        self.tax_map = json.loads(download_to_bytes(self.models_bucket, self.tax_map_key).decode("utf-8"))

        # Version
        self.version = os.getenv("MODEL_VERSION", "v1")

    def classify_tx(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Input fields:
          description, amount, counterparty, branch, currency, country
        """
        desc = (payload.get("description") or "").strip()
        cntp = (payload.get("counterparty") or "").strip()
        branch = payload.get("branch") or ""
        amount = float(payload.get("amount") or 0)
        country = (payload.get("country") or "").upper()

        # Simple feature engineering
        text = f"{desc} | {cntp} | {branch}"
        emb = self.embedder.encode([text], normalize_embeddings=True)
        num = np.array([[amount]], dtype="float32")
        feats = np.hstack([emb, num])

        # Predict
        pred = self.xgb.predict_proba(feats)[0]
        idx = int(np.argmax(pred))
        conf = float(pred[idx] * 100.0)

        category = self.label_map[str(idx)]
        # country-aware tax code mapping by category
        tax_code = (self.tax_map.get(country, {}) or {}).get(category, None)

        return {
            "modelVersion": self.version,
            "category": category,
            "taxCode": tax_code,
            "confidence": round(conf, 2),
        }

    def classify_batch(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        for it in items:
            results.append(self.classify_tx(it))
        return results
