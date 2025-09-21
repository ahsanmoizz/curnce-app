import { Logger } from '@nestjs/common';
import OpenAI from 'openai';

export class AIService {
  private readonly logger = new Logger(AIService.name);
  private client: OpenAI;
  private model: string;
  private timeoutMs: number;
  private retries: number;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('OPENAI_API_KEY not set. AIService will fail on calls.');
    }
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS || 20000);
    this.retries = Number(process.env.AI_RETRY_ATTEMPTS || 2);
  }

  private async callModel(promptMessages: { role: 'user' | 'system' | 'assistant'; content: string }[]) {
    let lastErr: any = null;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const res: any = await (this.client as any).chat.completions.create({
          model: this.model,
          messages: promptMessages,
          max_tokens: 1200,
        });
        const content = res?.choices?.[0]?.message?.content ?? res?.choices?.[0]?.text ?? null;
        if (!content) throw new Error('Empty model response');
        return content;
      } catch (err) {
        lastErr = err;
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`AI call attempt=${attempt} failed: ${errMsg}`);
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
    throw lastErr;
  }

  async classifyTransaction(description: string, amount: number, metadata: any) {
    const sys = `You are an AI accountant and compliance officer. Respond with JSON only. The JSON must contain keys: category (string), riskLevel (LOW|MEDIUM|HIGH), notes (string|array). Provide 'confidence' as a number 0-100 (estimated).`;

    const user = `Transaction description: ${description}
Amount: ${amount}
Metadata: ${JSON.stringify(metadata || {})}
Return JSON only.`;

    const raw = await this.callModel([{ role: 'system', content: sys }, { role: 'user', content: user }]);
    this.logger.debug('AI classify raw:' + String(raw).slice(0, 400));

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
    } catch (e) {
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
        } catch {}
      }
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

  async complianceCheck(documentText: string) {
    const sys = `You are an AI financial lawyer. Given a document, return JSON only with keys: risks (array of strings), complianceFlags (array of strings), recommendations (array of strings).`;
    const user = `Document:
${documentText}
Return JSON only.`;

    const raw = await this.callModel([{ role: 'system', content: sys }, { role: 'user', content: user }]);
    this.logger.debug('AI compliance raw:' + String(raw).slice(0, 400));

    try {
      const parsed = JSON.parse(raw);
      return { ...parsed, raw };
    } catch (e) {
      const m = String(raw).match(/\{[\s\S]*\}$/);
      if (m) {
        try {
          const parsed = JSON.parse(m[0]);
          return { ...parsed, raw };
        } catch {}
      }
      return { risks: [], complianceFlags: [], recommendations: [], raw };
    }
  }
}
