import * as fs from "fs";
import * as path from "path";
import { XGBoostClassifier } from "./xgboost.stub";
import { ClassifierInput, ClassifierResult } from "./types";

/**
 * ClassifierService
 * -----------------
 * Runs deterministic rules first, then AI (embeddings + XGBoost stub).
 * Logs all results, versioned models from S3/local.
 */
export class ClassifierService {
  private model: XGBoostClassifier;
  private modelVersion: string;

  constructor() {
    // Load model from disk (if available, else use stub)
    const modelPath = path.resolve(__dirname, "../models/xgb_model.json");
    if (fs.existsSync(modelPath)) {
      // In a real system, load JSON → train classifier
      this.model = new XGBoostClassifier(modelPath);
      this.modelVersion = "v1";
    } else {
      console.warn("[ClassifierService] No trained model found, using stub.");
      this.model = new XGBoostClassifier("stub-model");
      this.modelVersion = "stub-v1";
    }
  }

  async classify(input: ClassifierInput): Promise<ClassifierResult> {
    // 1. Deterministic rules (simple overrides)
    if (/UBER|OLA|CAB/i.test(input.description)) {
      return {
        category: "Travel",
        taxCode: "GST_INPUT",
        confidence: 0.95,
        modelVersion: this.modelVersion,
      };
    }

    // 2. Fallback → AI stub prediction
    const features = this.prepareFeatures(input);
    const rawPrediction = await this.model.predict(features);

    // Map stub output → category/taxCode
    const category = rawPrediction === 1 ? "Income" : "Expense";
    const taxCode = category === "Income" ? "GST_OUTPUT" : "GST_INPUT";

    return {
      category,
      taxCode,
      confidence: 0.7,
      modelVersion: this.modelVersion,
    };
  }

  private prepareFeatures(input: ClassifierInput): number[] {
    // Convert raw input into numerical feature vector
    return [
      input.amount,
      input.description.length,
      input.counterparty ? input.counterparty.length : 0,
    ];
  }
}
