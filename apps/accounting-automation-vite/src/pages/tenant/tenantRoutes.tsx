import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import TenantLayout from "./layout";

// --- Tenant Pages ---
import TenantDashboard from "./TenantDashboard";
import AccountsPage from "./accounting/accounts/page";
import JournalPage from "./accounting/journal/page";
import LedgerPage from "./accounting/ledger/page";
import PayablePage from "./accounting/payable/page";
import ReceivablePage from "./accounting/receivable/page";
import LedgersPage from "./accounting/reconciliation/page";
import ReportsPage from "./accounting/reports/page";
import TenantBillingPage from "./billing/page";
import PayrollPage from "./payroll/page";
import TreasuryPage from "./treasury/page";
import IngestionPage from "./accounting/ingestion/page";
import ComplianceConfigPage from "./compliance/config/page";
import ComplianceReportsPage from "./compliance/reports/page";
import ComplianceAuditsPage from "./compliance/audits/page";
import ComplianceArchivePage from "./compliance/archive/page";
import ComplianceLegalQueriesPage from "./compliance/legal-queries/page";
import ComplianceClassifyPage from "./compliance/classify/page";
import ComplianceClassifyTxPage from "./compliance/classify-tx/page";
import ComplianceReviewPage from "./compliance/review/page";
import ComplianceReportByPeriodPage from "./compliance/report-period/page";
import ComplianceReportByIdPage from "./compliance/report-id/page";
import CashManagementPage from "./aicash/page";
import AnalyticsPage from "./analytics/page";
import RulesPage from "./rules/page";
import TaxesPage from "./tax/page";
import AuditPage from "./audit/page";

import ContractPage from "./contracts/[id]/page";
import CustomerProfilePage from "./customers/[id]/page";
import FundsPage from "./funds/page";
import CryptoPayments from "./cryptopayments/page";


import SupportTicketsPage from "./support/[id]/page";
import LegalQueriesPage from "./legalAI/page";
import UsersSettingsPage from "./settings/users/page";
import NotificationsSettingsPage from "./settings/notifications/page";
import DocsSettingsPage from "./settings/docs/page";
import SendTx from "./payments/page";

export default function TenantRoutes() {
  return (
    <Routes>
      <Route element={<TenantLayout />}>
        {/* Default redirect */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* Dashboard */}
        <Route path="dashboard" element={<TenantDashboard />} />

        {/* Accounting */}
        <Route path="accounting/accounts" element={<AccountsPage />} />
        <Route path="accounting/journal" element={<JournalPage />} />
        <Route path="accounting/ledger" element={<LedgerPage />} />
        <Route path="accounting/payable" element={<PayablePage />} />
        <Route path="accounting/receivable" element={<ReceivablePage />} />
        <Route path="accounting/reconciliation" element={<LedgersPage />} />
        <Route path="accounting/ingestion" element={<IngestionPage />} />
        <Route path="accounting/reports" element={<ReportsPage />} />

        {/* Payroll */}
        <Route path="payroll" element={<PayrollPage />} />

        {/* Treasury */}
        <Route path="treasury" element={<TreasuryPage />} />

        {/* Compliance */}
        <Route path="compliance/config" element={<ComplianceConfigPage />} />
        <Route path="compliance/reports" element={<ComplianceReportsPage />} />
        <Route path="compliance/audits" element={<ComplianceAuditsPage />} />
        <Route path="compliance/archive" element={<ComplianceArchivePage />} />
        <Route path="compliance/legal-queries" element={<ComplianceLegalQueriesPage />} />
        <Route path="compliance/classify" element={<ComplianceClassifyPage />} />
        <Route path="compliance/classify-tx" element={<ComplianceClassifyTxPage />} />
        <Route path="compliance/review" element={<ComplianceReviewPage />} />
        <Route path="compliance/report-period" element={<ComplianceReportByPeriodPage />} />
        <Route path="compliance/report-id" element={<ComplianceReportByIdPage />} />

        {/* Analytics */}
        <Route path="analytics" element={<AnalyticsPage />} />

        {/* Rules */}
        <Route path="rules" element={<RulesPage />} />

        {/* Taxes */}
        <Route path="tax" element={<TaxesPage />} />

        {/* Audit */}
        <Route path="audit" element={<AuditPage />} />

        {/* Contracts */}
        <Route path="contracts/:id" element={<ContractPage />} />

        {/* Customers */}
        <Route path="customers/:id" element={<CustomerProfilePage />} />
         
           {/* AICASH */}
        <Route path="aicash" element={<CashManagementPage />} />


        {/* Payments */}
        <Route path="payments" element={<SendTx />} />

        {/* Support */}
        <Route path="support/tickets" element={<SupportTicketsPage />} />

        {/* Settings */}
        <Route path="settings/users" element={<UsersSettingsPage />} />
        <Route path="settings/notifications" element={<NotificationsSettingsPage />} />
        <Route path="settings/docs" element={<DocsSettingsPage />} />

        {/* Billing */}
        <Route path="billing" element={<TenantBillingPage />} />

        {/* Funds */}
        <Route path="funds" element={<FundsPage />} />

          <Route path="cryptopayments" element={<CryptoPayments />} />

        {/* LegalAI */}
        <Route path="legalai" element={<LegalQueriesPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>
    </Routes>
  );
}
