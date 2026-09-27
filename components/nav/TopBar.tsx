import Link from "next/link";
import { AccountMenu } from "./AccountMenu";
import { Wordmark } from "./Wordmark";

/** Slim bar above tab screens on phones: logo and account. Desktop has both in the sidebar. */
export function TopBar() {
  return (
    <header className="flex h-14 items-center justify-between px-4 md:hidden">
      <Link href="/" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Nudge home">
        <Wordmark />
      </Link>
      <AccountMenu />
    </header>
  );
}
