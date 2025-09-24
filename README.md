# 📊 Curnce: Next-Gen Chartered Accountant Platform

A **comprehensive blueprint & implementation** for the future of accounting automation.  
Curnce integrates **traditional accounting modules** with **AI automation** to empower Chartered Accountants (CAs) with real-time insights, compliance tools, and automated auditing.

---

## 🚀 Introduction & Vision
Curnce is an advanced accounting automation platform tailored for **Chartered Accountants** and financial professionals.  

- Eliminates repetitive tasks like payroll, compliance, and tax filing  
- Brings **real-time financial insights** through AI-driven analysis  
- Built with **scalability, security, and compliance** at its core (AWS + Cloudflare)  
- Empowers accountants to focus on **strategy, auditing, and decision-making**  

👉 **Goal:** Free accountants from manual bookkeeping & compliance headaches.

---

## 🏗️ System Architecture
- **Cloud-first:** Hosted on **AWS**, secured via **Cloudflare**  
- **Data Security:** All records & audit logs are encrypted at rest and in transit  
- **Multi-Tenant:** Supports **Tenant-level accounts** (clients, vendors, payroll, etc.)  
- **Super Admin Panel:**  
  - Configure subscription plans  
  - Monitor infrastructure health  
  - Enforce compliance rules  

---

## 📌 Core Features

| Feature      | Description                                                                 |
|--------------|-----------------------------------------------------------------------------|
| **Dashboard** | Quick navigation to ledgers, subscriptions, and reports.                   |
| **Accounts**  | Manage Payables, Receivables, Payroll, Tax, and data ingestion per tenant. |
| **Journal**   | Unified view of all journal entries linked across modules.                 |
| **Ledger**    | Account-specific ledger views with filters, search, and exports.           |
| **Payables**  | Vendor management + outgoing payments automation.                          |
| **Receivables** | Customer/vendor tracking + incoming receivables workflow.                 |
| **Payroll**   | Salary automation, compliance deductions, and reporting.                   |
| **Tax**       | Tax computation, filing, and compliance automation.                        |
| **Compliance** | Audit-ready logs, monitoring, and reporting.                              |
| **Reports**   | Trial Balance, Income Statement, Balance Sheet, and custom reports.        |

---

## ⚙️ Tech Stack
- **Frontend:** Next.js 14, TypeScript, TailwindCSS  
- **Backend:** Node.js / NestJS, REST APIs  
- **Database:** PostgreSQL (multi-tenant architecture)  
- **Auth:** JWT + RBAC (Role-Based Access Control)  
- **DevOps:** Docker, AWS (EC2, RDS, S3), Cloudflare WAF/CDN  
- **AI Modules:** Audit anomaly detection, NLP for ledger queries  

---

## 📂 Project Structure

src/
├── app/ # Client & Admin Next.js apps
│ ├── admin/ # Super Admin dashboard (subscriptions, tenants, audit)
│ ├── bills/ # Client bills module
│ ├── payroll/ # Payroll automation
│ ├── tax/ # Tax & compliance
│ ├── treasury/ # Cashflow & treasury mgmt
│ ├── reports/ # Trial Balance, IS, BS, custom reports
│ └── components/ # Shared UI components
├── lib/ # API utils, query clients
├── hooks/ # Custom React hooks
└── styles/ # TailwindCSS setup

yaml
Copy code

---

## 🛠️ Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/curnce.git
cd curnce
2. Install Dependencies
bash
Copy code
npm install
3. Configure Environment
Create a .env.local file with:

env
Copy code
NEXT_PUBLIC_API_URL=http://localhost:4000
DATABASE_URL=postgresql://user:pass@localhost:5432/curnce
JWT_SECRET=supersecretkey

# SMTP (Mailtrap for dev, PrivateEmail for prod)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=xxxx
SMTP_PASS=yyyy
4. Run Development
bash
Copy code
npm run dev
5. Build for Production
bash
Copy code
npm run build
npm run start
🔐 Security & Compliance
Role-based access for Super Admin, Tenant Owner, Users

End-to-end encryption for data & audit logs

GDPR & IFRS compliant financial data handling

📅 Roadmap
 AI-powered anomaly detection in ledgers

 Multi-language & multi-currency support

 Automated filing integrations (tax authorities)



