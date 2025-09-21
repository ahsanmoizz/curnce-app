import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateEmployeeDto, RunPayrollDto } from './dto/payroll.dto';
import { AccountingService } from '../accounting/accounting.service'; 
import { AuditService } from '../audit/audit.service'; 
import { Payslip } from '@prisma/client';
@Injectable()
export class PayrollService {
  private readonly SYSTEM_USER_ID = 'system-user-id'; // replace with real system user if you have one

  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,   // ✅ inject
    private audit: AuditService,             // ✅ inject
  ) {}

  async createEmployee(tenantId: string, dto: CreateEmployeeDto) {
    const emp = await this.prisma.employee.create({ data: { tenantId, ...dto } });

    // Optional audit (respects your AuditLog shape)
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          userId: this.SYSTEM_USER_ID,
          action: 'employee_created',
          details: { entity: 'Employee', employeeId: emp.id, email: emp.email },
          ipAddress: null,
        },
      });
    } catch (_) {}

    return emp;
  }

async getEmployees(tenantId: string) {
  return this.prisma.employee.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

async getPayrollRuns(tenantId: string) {
  return this.prisma.payrollCycle.findMany({
    where: { tenantId },
    include: { payslips: true }, // if you want slips along with cycles
    orderBy: { startDate: 'desc' },
  });
}

  async runPayroll(tenantId: string, dto: RunPayrollDto, ipAddress?: string, userId?: string) {
  // Step 1: create payroll cycle
  const cycle = await this.prisma.payrollCycle.create({
    data: { tenantId, ...dto, status: 'processed' },
  });

  // Step 2: get employees
  const employees = await this.prisma.employee.findMany({
    where: { tenantId, status: 'active' },
  });

  const payslips = [];
  for (const emp of employees) {
    const gross = emp.salary;
    const deductions = this.calcDeductions(emp);
    const taxes = this.calcTaxes(emp, gross, deductions);
    const net = gross - deductions - taxes.total;

    const slip = await this.prisma.payslip.create({
      data: {
        tenantId,
        employeeId: emp.id,
        payrollCycleId: cycle.id,
        grossSalary: gross,
        deductions,
        netSalary: net,
        taxes: JSON.stringify(taxes) as any,   // ✅ Fix type error
      },
    });
    const payslips: Payslip[] = [];
payslips.push(slip);
    // Step 3: Journal entry via AccountingService (like AR)
    await this.accounting.createJournalEntry(tenantId, {
  date: dto.endDate,
  description: `Payroll for ${emp.name} (${dto.period})`,
  lines: [
    // ✅ Debit payroll expense
    { accountId: await this.getExpenseAccount(tenantId), debit: gross, credit: 0 },
    // ✅ Credit cash for net paid
    { accountId: await this.getCashAccount(tenantId), debit: 0, credit: net },
    // ✅ Credit liabilities (deductions + taxes withheld)
    { accountId: await this.getLiabilityAccount(tenantId), debit: 0, credit: deductions + taxes.total },
  ],
});
  }

  // Step 4: Audit log via AuditService
  await this.audit.logAction({
    tenantId,
    userId: userId ?? this.SYSTEM_USER_ID,
    action: 'payroll_run',
    details: { period: dto.period, count: payslips.length, cycleId: cycle.id },
    ip: ipAddress,
  });

  return { cycle, payslips };
}
  private calcDeductions(emp: any) {
    // Stub: 10% fixed deduction (PF/ESI)
    return emp.salary * 0.1;
  }

  private calcTaxes(emp: any, gross: number, deductions: number) {
    const taxable = gross - deductions;
    const tds = taxable * 0.05; // Stub 5%
    return { tds, total: tds };
  }

  /**
   * Robust system account lookup: supports Account or GLAccount model names.
   */
  private async getExpenseAccount(tenantId: string) {
  const acc = await this.prisma.account.findFirst({
    where: { tenantId, name: { contains: 'Payroll Expense', mode: 'insensitive' }, type: 'EXPENSE' },
  });
  if (!acc) throw new BadRequestException('Payroll Expense account not found. Please create it first.');
  return acc.id;
}

private async getCashAccount(tenantId: string) {
  const acc = await this.prisma.account.findFirst({
    where: {
      tenantId,
      OR: [
        { name: { contains: 'Cash', mode: 'insensitive' } },
        { type: 'ASSET' },
      ],
    },
  });
  if (!acc) throw new BadRequestException('Cash account not found. Please create it first.');
  return acc.id;
}

private async getLiabilityAccount(tenantId: string) {
  const acc = await this.prisma.account.findFirst({
    where: {
      tenantId,
      type: 'LIABILITY',
      name: { contains: 'payroll', mode: 'insensitive' }, // ✅ case insensitive, flexible match
    },
  });
  if (!acc) throw new BadRequestException('Payroll liability account not found. Please create one.');
  return acc.id;
}
}
