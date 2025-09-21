import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import OpenAI from "openai";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import Papa from "papaparse";
import pdf from "pdf-parse";
import { Readable } from "stream";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
type AIResponse = { answer?: string };

@Injectable()
export class AICashService {
  private readonly logger = new Logger(AICashService.name);

  constructor(private prisma: PrismaService) {}
async saveDocument(tenantId: string, file: Express.Multer.File) {
  const type = this.detectType(file.originalname);
  let metadata: any = { size: file.size };

  if (type === "sheet") {
    metadata = await this.parseSheet(file);
  } else if (file.mimetype === "application/pdf") {
    metadata = await this.parsePdf(file);
  }

  return this.prisma.financeDocument.create({
    data: {
      tenantId,
      type,
      filename: file.originalname,
      mimeType: file.mimetype,
      url: "",
      metadata,
    },
  });
}
  private detectType(filename: string): string {
    const ext = filename.toLowerCase();
    if (ext.includes("xls") || ext.includes("csv")) return "sheet";
    if (ext.includes("pdf")) return "contract";
    if (ext.includes("payroll")) return "payroll";
    if (ext.includes("balance")) return "balance_sheet";
    return "invoice";
  }
  private async parseSheet(file: Express.Multer.File) {
  if (file.originalname.endsWith(".csv")) {
    const text = file.buffer.toString("utf-8");
    const parsed = Papa.parse(text, { header: true });
    return this.extractFinancialData(parsed.data);
  } else {
    const workbook = new ExcelJS.Workbook();
   await workbook.xlsx.load(file.buffer as any); // ✅ FIX HERE
    const sheet = workbook.worksheets[0];
    const rows = sheet.getSheetValues();
    return this.extractFinancialData(rows);
  }
}
private async parsePdf(file: Express.Multer.File) {
  const data = await pdf(file.buffer);
  return this.extractFinancialData(data.text);
}

private extractFinancialData(input: any): any {
  // 🔹 This is a simple regex-based extraction. 
  // Later you can enhance with AI parsing.
  const metadata: any = {};

  const text = Array.isArray(input) ? JSON.stringify(input) : String(input);

  const amountMatch = text.match(/₹?\s?([\d,]+\.?\d*)/);
  if (amountMatch) metadata.amount = parseFloat(amountMatch[1].replace(/,/g, ""));

  const invoiceMatch = text.match(/INV[-\s]?\d+/i);
  if (invoiceMatch) metadata.invoiceNumber = invoiceMatch[0];

  const dateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  if (dateMatch) metadata.date = dateMatch[0];

  return metadata;
}
  async askAI(tenantId: string, prompt: string) {
    const docs = await this.prisma.financeDocument.findMany({
      where: { tenantId },
      orderBy: { uploadedAt: "desc" },
      take: 100,
    });

    const context = docs
  .map((d) => 
    `File: ${d.filename}, Type: ${d.type}, Metadata: ${JSON.stringify(d.metadata)}`
  )
  .join("\n");

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert Chartered Accountant AI in India. Follow RBI, Indian GAAP, and tax laws when advising.",
        },
        { role: "user", content: `Company Docs:\n${context}\n\nTask: ${prompt}` },
      ],
    });

    const answer = completion.choices[0].message?.content || "No answer";

    const task = await this.prisma.aITask.create({
      data: { tenantId, prompt, response: { answer } },
    });

    return { answer, taskId: task.id };
  }

  async generateReport(tenantId: string, format: string) {
    const tasks = await this.prisma.aITask.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    if (format === "csv") {
      const rows = tasks.map(
        (t) => `${t.prompt},"${(t.response as AIResponse)?.answer || ""}",${t.createdAt}`
      );
      const csv = ["Prompt,Response,Date", ...rows].join("\n");
      return {
        name: `ai-report-${Date.now()}.csv`,
        mime: "text/csv",
        buffer: Buffer.from(csv),
      };
    }

    if (format === "pdf") {
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {});
      doc.fontSize(16).text("AI Report", { underline: true });
      tasks.forEach((t) => {
        const resp = t.response as AIResponse;
        doc.moveDown().fontSize(12).text(`Q: ${t.prompt}`);
        doc.fontSize(11).text(`A: ${resp?.answer || ""}`);
      });
      doc.end();

      const buffer = await new Promise<Buffer>((resolve) =>
        doc.on("end", () => resolve(Buffer.concat(chunks)))
      );

      return {
        name: `ai-report-${Date.now()}.pdf`,
        mime: "application/pdf",
        buffer,
      };
    }

    // default → Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("AI Report");
    sheet.addRow(["Prompt", "Response", "Date"]);
    tasks.forEach((t) => {
      const resp = t.response as AIResponse;
      sheet.addRow([t.prompt, resp?.answer || "", t.createdAt]);
    });
    const buffer = await workbook.xlsx.writeBuffer();

    return {
      name: `ai-report-${Date.now()}.xlsx`,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    };
  }
  async generateFinancialSummary(tenantId: string) {
  const docs = await this.prisma.financeDocument.findMany({
    where: { tenantId },
  });

  let invoices = 0;
  let payroll = 0;
  let otherExpenses = 0;

  for (const d of docs) {
  const meta = d.metadata as any;
const amount = meta?.amount || 0;
    if (d.type === "invoice") invoices += amount;
    else if (d.type === "payroll") payroll += amount;
    else otherExpenses += amount;
  }

  return {
    totalInvoices: invoices,
    totalPayroll: payroll,
    otherExpenses,
    netCash: invoices - (payroll + otherExpenses),
  };
}
}
