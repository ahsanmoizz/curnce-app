// apps/api/src/module/payroll/payroll.router.ts
import { Router, Request, Response } from 'express';
import { PrismaService } from '../../prisma.service';
import { PayrollService } from './payroll.service';
import { CreateEmployeeDto, RunPayrollDto } from './dto/payroll.dto';
import { JwtGuard } from '../../middleware/jwt.guard';
import { AccountingService } from '../accounting/accounting.service';
import { AuditService } from '../audit/audit.service';
export const payrollRouter = Router();

// --- Initialize services ---
const prisma = new PrismaService();
const accounting = new AccountingService(prisma);
const audit = new AuditService(prisma);

const payrollService = new PayrollService(prisma, accounting, audit);

// --- Middleware ---
payrollRouter.use(JwtGuard);

// ----------------- ADD EMPLOYEE -----------------
payrollRouter.post('/employee', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId as string;
    const dto: CreateEmployeeDto = req.body;

    if (!dto || !dto.name || !dto.email || !dto.role || dto.salary == null) {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    const employee = await payrollService.createEmployee(String(tenantId), dto);
    res.json(employee);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});

// ----------------- RUN PAYROLL -----------------
payrollRouter.post('/run', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId as string;
    const dto: RunPayrollDto = req.body;

    if (!dto || !dto.period || !dto.startDate || !dto.endDate) {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    const result = await payrollService.runPayroll(String(tenantId), dto);
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});
// ----------------- LIST EMPLOYEES -----------------
payrollRouter.get('/employees', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId as string;
    const employees = await payrollService.getEmployees(String(tenantId));
    res.json(employees);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});

// ----------------- LIST PAYROLL RUNS -----------------
payrollRouter.get('/runs', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId as string;
    const runs = await payrollService.getPayrollRuns(String(tenantId));
    res.json(runs);
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
  }
});
