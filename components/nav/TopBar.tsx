import Link from "next/link";
import { AccountMenu } from "./AccountMenu";
import { Wordmark } from "./Wordmark";

/** Slim bar above tab screens: logo on mobile (sidebar has it on desktop), account on the right. */
export function TopBar() {
  return (
    <header className="flex h-14 items-center justify-between px-4 md:px-8">
      <Link href="/" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary md:invisible" aria-label="Record home">
        <Wordmark />
      </Link>
      <AccountMenu />
    </header>
  );
}
