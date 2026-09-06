"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/suppliers", label: "Suppliers" },
  { href: "/products", label: "Products" },
  { href: "/purchases", label: "Purchases" },
  { href: "/employees", label: "Employees" },
  { href: "/salaries", label: "Salaries" },
  { href: "/reports", label: "Reports" },
  // { href: "/backup", label: "Backup" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar({ shopName }: { shopName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col bg-ledger-dark text-white/90">
      <div className="px-5 py-5">
        <p className="font-serif text-lg leading-tight text-white">
          {shopName}
        </p>
        <p className="text-[11px] uppercase tracking-wide text-white/50">
          Offline
        </p>
      </div>
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded px-3 py-2 text-sm transition",
                active
                  ? "bg-ledger text-white"
                  : "text-white/75 hover:bg-ledger hover:text-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-[11px] text-white/40">
        Shop Manager v1.0
      </div>
    </aside>
  );
}
