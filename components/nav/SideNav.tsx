"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./AccountMenu";
import { NAV_ITEMS, isActive } from "./navItems";
import { Wordmark } from "./Wordmark";

/** Desktop navigation — shown on md+ in place of the bottom bar, with the account at the bottom. */
export function SideNav() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar px-4 py-7 md:flex">
      <Link href="/" className="mb-8 px-3 outline-none" aria-label="Nudge home">
        <Wordmark />
      </Link>
      <nav className="flex-1">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const { href, label, icon: Icon } = item;
            const active = isActive(pathname, item);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "bg-sidebar-accent text-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <AccountMenu variant="sidebar" />
    </aside>
  );
}
