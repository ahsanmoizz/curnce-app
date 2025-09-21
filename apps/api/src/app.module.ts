
console.log(">>> USING AppModule FROM", __filename);
import { Module } from '@nestjs/common';
import { AccountsModule } from './module/accounts/accounts.module';
import { LedgerModule } from './module/ledger/ledger.module';
import { ReportsModule } from './module/reports/reports.module';
import { IngestionModule } from './module/ingestion/ingestion.module';
import { RulesModule } from './module/rules/rules.module';
import { DocsModule } from './module/corpdocs/docs.module';
import { AlertsModule } from './module/alerts/alerts.module';
import { BlockchainModule } from './module/blockchain/blockchain.module';
import { AIModule } from './module/ai/ai.module';
import { ComplianceModule } from './module/compliance/compliance.module';
// ⬇️ Day 3 modules
import { CustomersModule } from './module/customers/customers.module';
import { RefundsModule } from './module/refunds/refunds.module';
import { DisputesModule } from './module/disputes/disputes.module';
import { ScheduleModule } from '@nestjs/schedule';
//day6
import { ReportingModule } from './module/reporting/reporting.module';
import { NotificationsModule } from './module/notifications/notifications.module';
import { DashboardModule } from './module/dashboard/dashboard.module';
import { SchedulerModule } from './module/scheduler/scheduler.module';
//day 10 onwards
import { SupportModule } from './module/support/support.module';
//blockchain
import { PaymentsModule } from './module/payments/payments.module';
//day30
import { AuditModule } from './module/audit/audit.module';

import { AiLegalModule } from './module/ai-legal/ai-legal.module';
import {AccountingModule} from './module/accounting/accounting.module';
import { AccountsPayableModule } from './module/ap/ap.module';
import { ARModule } from './module/ar/ar.module';
import {AccountingReportsModule} from './module/accounting-reports/accounting-reports.module';
import { PayrollModule } from './module/payroll/payroll.module';
import { TaxModule } from './module/tax/tax.module';
import { SystemModule } from './module/system/system.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
 
  
    AccountsModule,
    LedgerModule,
    ReportsModule,
    IngestionModule,
    RulesModule,
    DocsModule,
    AlertsModule,
    BlockchainModule,
 // ⬇️ Day 3
    CustomersModule,
    RefundsModule,
    DisputesModule,
  
    ComplianceModule,
     ReportingModule,
    NotificationsModule,
    DashboardModule,
    SchedulerModule,    
   SupportModule,
    PaymentsModule,
    AuditModule,
    AiLegalModule,
    AccountingModule,
    AccountsPayableModule,
    ARModule,
    AccountingReportsModule,
    PayrollModule,
    TaxModule,
    SystemModule,
  ]
})
export class AppModule {}
