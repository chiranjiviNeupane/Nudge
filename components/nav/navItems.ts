import { Dumbbell, House, ListChecks, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: House },
  { href: "/workouts", label: "Workouts", icon: ListChecks },
  { href: "/exercises", label: "Exercises", icon: Dumbbell },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
