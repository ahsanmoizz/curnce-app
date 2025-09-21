import { Injectable } from '@nestjs/common';
import { format as formatCsv } from '@fast-csv/format';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

@Injectable()
export class ExportService {
  async generate<T = any>(rows: T[], format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<Buffer> {
    if (format === 'csv') return this.toCSV(rows);
    if (format === 'xlsx') return this.toXLSX(rows);
    if (format === 'pdf') return this.toPDF(rows);
    return this.toCSV(rows);
  }

  private async toCSV(rows: any[]): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const csvStream = formatCsv({ headers: true });
      csvStream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      csvStream.on('end', () => resolve(Buffer.concat(chunks)));
      csvStream.on('error', reject);

      for (const row of rows) csvStream.write(this.flatten(row));
      csvStream.end();
    });
  }

  private async toXLSX(rows: any[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Export');

    const flattened = rows.map((r) => this.flatten(r));
    const headers = flattened.length ? Object.keys(flattened[0]) : [];
    ws.addRow(headers);

    for (const r of flattened) {
      ws.addRow(headers.map((h) => (r as any)[h]));
    }

    return wb.xlsx.writeBuffer() as unknown as Buffer;
  }

  private async toPDF(rows: any[]): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 24 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => { /* noop */ });

    const flattened = rows.map((r) => this.flatten(r));
    const headers = flattened.length ? Object.keys(flattened[0]) : [];

    doc.fontSize(14).text('Export', { underline: true });
    doc.moveDown();

    if (!headers.length) {
      doc.fontSize(10).text('No data.');
    } else {
      doc.fontSize(10).text(headers.join(' | '));
      doc.moveDown(0.5);
      for (const r of flattened) {
        doc.text(headers.map((h) => String((r as any)[h] ?? '')).join(' | '));
      }
    }

    doc.end();
    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private flatten(obj: any, prefix = ''): Record<string, any> {
    if (obj === null || obj === undefined) return {};
    if (typeof obj !== 'object') return { [prefix || 'value']: obj };

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) {
        Object.assign(out, this.flatten(v, key));
      } else {
        out[key] = v instanceof Date ? v.toISOString() : v;
      }
    }
    return out;
    }
}
