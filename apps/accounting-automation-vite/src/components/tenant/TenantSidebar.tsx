import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  FileText,
  CreditCard,
  Scale,
  BrainCircuit,
  Users,
  MessageSquare,
  Settings,
  ChevronDown,
  ChevronRight,
  ClipboardListIcon,
  Globe,
 
  Gavel,
  
  Receipt,
} from "lucide-react";

// ✅ stable helpers so they aren’t recreated every render
function navLinkClass(isActive: boolean) {
  return `block px-3 py-1 rounded-md text-sm transition-colors ${
    isActive
      ? "bg-indigo-600 text-white"
      : "text-gray-400 hover:bg-gray-700 hover:text-white"
  }`;
}

function topNavLinkClass(isActive: boolean) {
  return `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
    isActive
      ? "bg-indigo-600 text-white"
      : "text-gray-300 hover:bg-gray-800 hover:text-white"
  }`;
}

type NavSection = {
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: { label: string; href: string }[];
};

const navSections: NavSection[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/tenant/dashboard",
  },
  {
    label: "Accounting",
    icon: Wallet,
    children: [
      { label: "Accounts", href: "/tenant/accounting/accounts" },
      { label: "Journal", href: "/tenant/accounting/journal" },
      { label: "Ledger", href: "/tenant/accounting/ledger" },
      { label: "Payable", href: "/tenant/accounting/payable" },
      { label: "Receivable", href: "/tenant/accounting/receivable" },
    
      { label: "Reconciliation", href: "/tenant/accounting/reconciliation" },
      { label: "Ingestion", href: "/tenant/accounting/ingestion" },
    ],
  },
 
  {
    label: "LegalAI",
    icon: Gavel,
    href: "/tenant/legalai",
  },
  {
    label: "AIaccountant",
    icon: BrainCircuit,
    href: "/tenant/aicash",
  },
  {
    label: "Payroll",
    icon: FileText,
    href: "/tenant/payroll",
  },
  {
    label: "Audit",
    icon: ClipboardListIcon,
    href: "/tenant/audit",
  },
  {
    label: "Tax",
    icon: Receipt,
    href: "/tenant/tax",
  },
  {
    label: "Rules",
    icon: Scale,
    href: "/tenant/rules",
  },
 
  {
    label: "Compliance",
    icon: Globe,
    children: [
      { label: "Config", href: "/tenant/compliance/config" },
      { label: "Reports", href: "/tenant/compliance/reports" },
      { label: "Archive", href: "/tenant/compliance/archive" },
      { label: "Classify", href: "/tenant/compliance/classify" },
      { label: "Classify-tx", href: "/tenant/compliance/classify-tx" },
      { label: "Review", href: "/tenant/compliance/review" },
      { label: "Report by ID", href: "/tenant/compliance/report-id" },
    ],
  },
  {
    label: "CryptoPayments",
    icon: CreditCard,
    href: "/tenant/cryptopayments",
  },
  {
    label: "Support",
    icon: MessageSquare,
    children: [{ label: "Tickets", href: "/tenant/support/tickets" }],
  },
  {
    label: "CRM",
    icon: Users,
    href: "/tenant/customers/1",
  },
  {
    label: "Contracts",
    icon: FileText,
    href: "/tenant/contracts/1",
  },
  {
    label: "Settings",
    icon: Settings,
    children: [
      { label: "Notifications", href: "/tenant/settings/notifications" },
      { label: "Docs", href: "/tenant/settings/docs" },
    ],
  },
  {
    label: "Billing",
    icon: CreditCard,
    href: "/tenant/billing",
  },
];

export default function TenantSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const toggleOpen = (label: string) => {
    setOpen((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside
  className={`${
    collapsed ? "w-20" : "w-64"
  } bg-gradient-to-b from-gray-900 via-gray-950 to-black text-gray-100 flex flex-col transition-all duration-300 shadow-xl border-r border-gray-800`}
>
  {/* Header */}
  <div className="flex items-center justify-between p-4 border-b border-gray-800">
  <div className="flex items-center gap-3">
    {/* ✅ Logo */}
    <img
      src="/curn_resized.png"
      alt="Curnce Logo"
      className={`transition-all duration-300 ${
        collapsed ? "w-15 h-18" : "w-20 h-25"
      }`}
    />
  
    {/* ✅ Brand Name (hide when collapsed) */}
   {!collapsed && (
  <h1
    className="text-xl font-extrabold tracking-wide gradient-text"
    style={{
      backgroundImage: "linear-gradient(90deg, #EC368D 0%, #FF8400 25%, #FFD200 50%, #007AFF 75%, #1EE6FF 100%)",
    }}
  >
    curnce
  </h1>
)}
  </div>
    <button
      onClick={() => setCollapsed(!collapsed)}
      className="text-gray-400 hover:text-indigo-400 transition"
    >
      {collapsed ? "»" : "«"}
    </button>
  </div>

  {/* Navigation */}
  <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
    {navSections.map(({ label, icon: Icon, href, children }) => (
      <div key={label}>
        {children ? (
          <>
            <button
              onClick={() => toggleOpen(label)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-gray-300 hover:bg-gray-800/60 hover:text-indigo-400 transition"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-indigo-400" />
                {!collapsed && <span className="font-medium">{label}</span>}
              </div>
              {!collapsed &&
                (open[label] ? (
                  <ChevronDown className="w-4 h-4 text-indigo-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-indigo-400" />
                ))}
            </button>
            {open[label] && !collapsed && (
              <div className="ml-8 mt-1 space-y-1">
                {children.map((child) => (
                  <NavLink
                    key={child.href}
                    to={child.href}
                    className={({ isActive }) =>
                      `block px-3 py-1.5 rounded-md text-sm transition-colors ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-md"
                          : "text-gray-400 hover:text-indigo-300 hover:bg-gray-800/50"
                      }`
                    }
                  >
                    {child.label}
                  </NavLink>
                ))}
              </div>
            )}
          </>
        ) : (
          <NavLink
            to={href || "#"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-gray-300 hover:text-indigo-300 hover:bg-gray-800/50"
              }`
            }
          >
            <Icon className="w-5 h-5 text-indigo-400" />
            {!collapsed && <span className="font-medium">{label}</span>}
          </NavLink>
        )}
      </div>
    ))}
  </nav>
</aside>
  );
}
