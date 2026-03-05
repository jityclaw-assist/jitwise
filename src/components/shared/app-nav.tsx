import Link from "next/link";
import { LogoutButton } from "@/components/shared/logout-button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/estimate", label: "New Estimate" },
  { href: "/estimations", label: "Estimations" },
];

export function AppNav() {
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
        <nav className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 transition hover:bg-foreground/5 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}
