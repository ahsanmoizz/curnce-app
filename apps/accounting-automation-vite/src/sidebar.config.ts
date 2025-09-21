// sidebar.config.ts
import {
  ChartBarIcon,
  BanknotesIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  BuildingLibraryIcon,
  DocumentTextIcon,
  InboxArrowDownIcon,
} from "@heroicons/react/24/outline";

export type Role = "owner" | "tenant";

export type SidebarItem = {
  label: string;
  href: string;
  icon?: any;
  items?: SidebarItem[]; // for nested menus
};

export const sidebarConfig: Record<Role, SidebarItem[]> = {
  owner: [
    { label: "Tenants", href: "/owner/tenants", icon: UserGroupIcon },
    { label: "Rules", href: "/owner/settings/rules", icon: Cog6ToothIcon },
    { label: "Platform Analytics", href: "/owner/analytics", icon: ChartBarIcon },
    { label: "Integrations", href: "/owner/integrations", icon: BuildingLibraryIcon },
  ],
  tenant: [
    { label: "Dashboard", href: "/dashboard/overview", icon: ChartBarIcon },
    { label: "Customers", href: "/customers", icon: UserGroupIcon },
    {
      label: "Payments",
      href: "/payments",
      icon: BanknotesIcon,
      items: [
        { label: "Payments", href: "/payments", icon: BanknotesIcon },
        { label: "Refunds", href: "/payments/refunds", icon: InboxArrowDownIcon },
        { label: "Disputes", href: "/payments/disputes", icon: DocumentTextIcon },
      ],
    },
    { label: "Accounting", href: "/accounting/accounts", icon: ChartBarIcon },
    { label: "Treasury", href: "/treasury/bank-accounts", icon: BuildingLibraryIcon },
    { label: "Payroll", href: "/payroll/employees", icon: UserGroupIcon },
    { label: "Compliance", href: "/compliance/config", icon: Cog6ToothIcon },
    { label: "Support", href: "/support/tickets", icon: DocumentTextIcon },
    { label: "Settings", href: "/settings/users", icon: Cog6ToothIcon },
  ],
};
