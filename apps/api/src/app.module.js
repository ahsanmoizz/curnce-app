"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("./module/auth/auth.module");
const tenant_module_1 = require("./module/tenant/tenant.module");
const accounts_module_1 = require("./module/accounts/accounts.module");
const ledger_module_1 = require("./module/ledger/ledger.module");
const reports_module_1 = require("./module/reports/reports.module");
const ingestion_module_1 = require("./module/ingestion/ingestion.module");
const rules_module_1 = require("./module/rules/rules.module");
const docs_module_1 = require("./module/docs/docs.module");
const alerts_module_1 = require("./module/alerts/alerts.module");
const blockchain_module_1 = require("./module/blockchain/blockchain.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            tenant_module_1.TenantModule,
            accounts_module_1.AccountsModule,
            ledger_module_1.LedgerModule,
            reports_module_1.ReportsModule,
            ingestion_module_1.IngestionModule,
            rules_module_1.RulesModule,
            docs_module_1.DocsModule,
            alerts_module_1.AlertsModule,
            blockchain_module_1.BlockchainModule
        ]
    })
], AppModule);
