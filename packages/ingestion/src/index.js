"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBankCsv = parseBankCsv;
const sync_1 = require("csv-parse/sync");
function parseBankCsv(csv) {
    const records = (0, sync_1.parse)(csv, { columns: true, skip_empty_lines: true, trim: true });
    return records.map((r) => ({
        date: r.date,
        description: r.description,
        amount: r.amount,
        currency: r.currency || 'INR',
        reference: r.reference || null
    }));
}
