"use client";

import { Link, useLocation } from "react-router-dom";
import { sidebarConfig } from "../sidebar.config";
import { useAuth } from "../hooks/useAuth";
import clsx from "clsx";

export default function Sidebar() {
  const { pathname } = useLocation(); // ✅ React Router way
  const { role } = useAuth();
  const menu = role ? sidebarConfig[role] : [];

  return (
    <aside className="h-screen w-72 bg-[#142433] text-white flex flex-col">
      <div className="p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#102834] flex items-center justify-center text-xl font-bold">AA</div>
        <div>
          <div className="text-sm font-bold">Accounting Automation</div>
          <div className="text-xs text-gray-300">v0.1</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        {menu.map((item) => (
          <div key={item.href} className="mb-1">
            <Link
              to={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-[#163746]",
                pathname.startsWith(item.href) && "bg-[#163746]"
              )}
            >
              {item.icon && <item.icon className="h-5 w-5 text-gray-200" />}
              <span>{item.label}</span>
            </Link>

            {item.items?.length ? (
              <div className="ml-6 mt-1 space-y-1">
                {item.items.map((sub) => (
                  <Link
                    key={sub.href}
                    to={sub.href}
                    className={clsx(
                      "block rounded-md px-3 py-1 text-sm hover:bg-[#163746]",
                      pathname.startsWith(sub.href) && "bg-[#163746]"
                    )}
                  >
                    {sub.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-[#0f2a3a]">
        <div className="text-xs text-gray-300">Help • Docs • Support</div>
      </div>
    </aside>
  );
}
