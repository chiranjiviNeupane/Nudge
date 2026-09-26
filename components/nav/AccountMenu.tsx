"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useSession } from "@/components/providers/SessionProvider";
import { useActiveSession } from "@/lib/hooks/data";
import { signOut } from "@/lib/auth/auth";

/** Avatar button (top right) with the account email, Settings and Sign out. */
export function AccountMenu() {
  const router = useRouter();
  const { user } = useSession();
  const active = useActiveSession();
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const initial = (user.email[0] ?? "?").toUpperCase();

  async function doSignOut() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex size-9 items-center justify-center rounded-full bg-surface text-sm font-semibold outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-primary data-[state=open]:bg-surface-2"
          aria-label="Account"
        >
          {initial}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="truncate text-sm font-medium">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="h-10">
            <Link href="/settings">
              <Settings /> Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="h-10"
            onSelect={() => (active ? setConfirmSignOut(true) : void doSignOut())}
          >
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmSignOut}
        onOpenChange={setConfirmSignOut}
        title="Sign out?"
        description="You have a workout in progress on this device. Signing out will discard it."
        confirmLabel="Sign out"
        destructive
        onConfirm={doSignOut}
      />
    </>
  );
}
