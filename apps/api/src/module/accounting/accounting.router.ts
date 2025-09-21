import { Router } from 'express';
import { AccountingService } from './accounting.service';
import { CreateAccountDto, CreateJournalEntryDto, CreateJournalEntryLineDto } from './dto/dto';

function getTenantId(req: any): string {
  return String(
    req?.user?.tenantId ??
    req.headers['x-tenant-id'] ??
    req.query?.tenantId ??
    req.body?.tenantId ??
    ''
  );
}

function isValidAccountType(t: any): t is CreateAccountDto['type'] {
  return ['asset', 'liability', 'equity', 'revenue', 'expense'].includes(t);
}

export function buildAccountingRouter(accounting: AccountingService) {
  const router = Router();

  // POST /v1/accounting/journal
  router.post('/journal', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(400).json({ error: 'tenantId missing' });

      const { date, description, lines } = req.body ?? {};
      if (!date || !description || !Array.isArray(lines) || lines.length === 0) {
        return res.status(400).json({ error: 'date, description and lines are required' });
      }

      const normLines: CreateJournalEntryLineDto[] = lines.map((l: any) => ({
        accountId: String(l.accountId),
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }));

      if (normLines.some(l => !l.accountId || Number.isNaN(l.debit) || Number.isNaN(l.credit))) {
        return res.status(400).json({ error: 'invalid lines: accountId, debit, credit required' });
      }

      const dto: CreateJournalEntryDto = {
        date: new Date(date) as any, // service will `new Date()` again; ISO is fine
        description: String(description),
        lines: normLines,
      };

      const entry = await accounting.createJournalEntry(tenantId, dto);
      res.json(entry);
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to post journal';
      if (msg.includes('Posting locked')) return res.status(409).json({ error: msg });
      if (msg.includes('Debits and Credits must balance')) return res.status(400).json({ error: msg });
      console.error('createJournalEntry error:', err);
      res.status(500).json({ error: msg });
    }
  });

// GET /v1/accounting/journal
router.get('/journal', async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: 'tenantId missing' });

    const entries = await accounting.listJournalEntries(tenantId);
    res.json(entries);
  } catch (err: any) {
    console.error('listJournalEntries error:', err);
    res.status(500).json({ error: err?.message ?? 'Failed to fetch journal entries' });
  }
});

  // GET /v1/accounting/ledger/:accountId
  router.get('/ledger/:accountId', async (req, res) => {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) return res.status(400).json({ error: 'tenantId missing' });

      const { accountId } = req.params;
      const items = await accounting.listLedger(tenantId, String(accountId));
      res.json(items);
    } catch (err: any) {
      console.error('listLedger error:', err);
      res.status(500).json({ error: err?.message ?? 'Failed to fetch ledger' });
    }
  });

  return router;
}
