"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/shared/logout-button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/estimate", label: "New Estimate", exact: false },
  { href: "/estimations", label: "Estimations", exact: false },
];

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/10 bg-white/5 backdrop-blur supports-[backdrop-filter]:bg-white/10">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Jitwise
          </span>
          <span className="text-sm font-semibold text-foreground">
            Estimation Workspace
            <span className="ml-2 inline-flex h-1.5 w-6 rounded-full bg-jityellow" />
          </span>
        </div>
        <nav className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 transition-colors ${
                  active
                    ? "bg-foreground/10 text-foreground"
                    : "hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <span className="mx-1 h-4 w-px bg-white/10" />
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
