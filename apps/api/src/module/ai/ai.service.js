
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AIService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = __importDefault(require("openai"));
let AIService = AIService_1 = class AIService {
    constructor() {
        this.logger = new common_1.Logger(AIService_1.name);
        if (!process.env.OPENAI_API_KEY) {
            this.logger.warn('OPENAI_API_KEY not set. AIService will fail on calls.');
        }
        this.client = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        this.timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS || 20000);
        this.retries = Number(process.env.AI_RETRY_ATTEMPTS || 2);
    }
    async callModel(promptMessages) {
        let lastErr = null;
        for (let attempt = 0; attempt <= this.retries; attempt++) {
            try {
                // cast to any to avoid strict SDK typings in this repo
                const res = await this.client.chat.completions.create({
                    model: this.model,
                    messages: promptMessages,
                    max_tokens: 1200,
                });
                const content = res?.choices?.[0]?.message?.content ?? res?.choices?.[0]?.text ?? null;
                if (!content)
                    throw new Error('Empty model response');
                return content;
            }
            catch (err) {
                lastErr = err;
                const errMsg = err instanceof Error ? err.message : String(err);
                this.logger.warn(`AI call attempt=${attempt} failed: ${errMsg}`);
                await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
            }
        }
        throw lastErr;
    }
    /**
     * Classify a transaction. Returns { category, riskLevel, notes, modelVersion, confidence, raw }
     */
    async classifyTransaction(description, amount, metadata) {
        const sys = `You are an AI accountant and compliance officer. Respond with JSON only. The JSON must contain keys: category (string), riskLevel (LOW|MEDIUM|HIGH), notes (string|array). Provide 'confidence' as a number 0-100 (estimated).`;
        const user = `Transaction description: ${description}
Amount: ${amount}
Metadata: ${JSON.stringify(metadata || {})}
Return JSON only.`;
        const raw = await this.callModel([{ role: 'system', content: sys }, { role: 'user', content: user }]);
        this.logger.debug('AI classify raw:' + String(raw).slice(0, 400));
        // Try parse robustly
        try {
            const parsed = JSON.parse(raw);
            return {
                category: String(parsed.category ?? 'Uncategorized'),
                riskLevel: String(parsed.riskLevel ?? 'LOW'),
                notes: parsed.notes ?? null,
                modelVersion: parsed.modelVersion ?? this.model,
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : Number(parsed.confidence ?? 0),
                raw,
            };
        }
        catch (e) {
            // fallback: try extract JSON object from text
            const m = String(raw).match(/\{[\s\S]*\}$/);
            if (m) {
                try {
                    const parsed = JSON.parse(m[0]);
                    return {
                        category: String(parsed.category ?? 'Uncategorized'),
                        riskLevel: String(parsed.riskLevel ?? 'LOW'),
                        notes: parsed.notes ?? null,
                        modelVersion: parsed.modelVersion ?? this.model,
                        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : Number(parsed.confidence ?? 0),
                        raw,
                    };
                }
                catch (e2) {
                    // continue to fallback
                }
            }
            // Last-resort fallback object for auditing; confidence 0, modelVersion set
            return {
                category: 'Uncategorized',
                riskLevel: 'LOW',
                notes: `parse_error: ${String(e)}`,
                modelVersion: this.model,
                confidence: 0,
                raw,
            };
        }
    }
    /**
     * Run compliance check on document text.
     * Returns { risks: [], complianceFlags: [], recommendations: [], raw }
     */
    async complianceCheck(documentText) {
        const sys = `You are an AI financial lawyer. Given a document, return JSON only with keys: risks (array of strings), complianceFlags (array of strings), recommendations (array of strings).`;
        const user = `Document:
${documentText}
Return JSON only.`;
        const raw = await this.callModel([{ role: 'system', content: sys }, { role: 'user', content: user }]);
        this.logger.debug('AI compliance raw:' + String(raw).slice(0, 400));
        try {
            const parsed = JSON.parse(raw);
            return { ...parsed, raw };
        }
        catch (e) {
            const m = String(raw).match(/\{[\s\S]*\}$/);
            if (m) {
                try {
                    const parsed = JSON.parse(m[0]);
                    return { ...parsed, raw };
                }
                catch {
                    // ignore
                }
            }
            return { risks: [], complianceFlags: [], recommendations: [], raw };
        }
    }
};
exports.AIService = AIService;
exports.AIService = AIService = AIService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AIService);
