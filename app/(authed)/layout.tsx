import { SessionProvider } from "@/components/providers/SessionProvider";

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
