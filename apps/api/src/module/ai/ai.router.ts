import { Router } from 'express';
import { AIService } from './ai.service';

const router = Router();
const aiService = new AIService();

/**
 * Classify a transaction
 * Expects: { description: string, amount: number, metadata?: any }
 */
router.post('/classify', async (req, res) => {
  try {
    const { description, amount, metadata } = req.body;
    if (!description || typeof amount !== 'number') {
      return res.status(400).json({ error: 'Missing description or amount' });
    }

    const result = await aiService.classifyTransaction(description, amount, metadata || {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

/**
 * Compliance check
 * Expects: { text: string }
 */
router.post('/compliance', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text' });
    }

    const result = await aiService.complianceCheck(text);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

export const aiRouter = router;
