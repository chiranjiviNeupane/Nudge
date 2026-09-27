import { Dumbbell, History, House, ListChecks } from "lucide-react";

// Settings isn't a tab: it lives in the account menu (top bar on phones,
// sidebar footer on desktop).
export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: House, also: [] },
  { href: "/workouts", label: "Routines", icon: ListChecks, also: [] },
  { href: "/exercises", label: "Exercises", icon: Dumbbell, also: [] },
  // A finished workout's summary belongs to History.
  { href: "/history", label: "History", icon: History, also: ["/sessions"] },
] as const;

const under = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export function isActive(pathname: string, item: (typeof NAV_ITEMS)[number]) {
  if (item.href === "/") return pathname === "/";
  return under(pathname, item.href) || item.also.some((p: string) => under(pathname, p));
}
