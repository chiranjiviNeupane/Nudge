import { BottomNav } from "@/components/nav/BottomNav";
import { SideNav } from "@/components/nav/SideNav";
import { TopBar } from "@/components/nav/TopBar";
import { Ready } from "@/components/providers/Ready";
import { StaleWorkoutPrompt } from "@/components/workout/StaleWorkoutPrompt";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <SideNav />
      <div className="min-w-0 flex-1">
        <TopBar />
        <Ready>{children}</Ready>
      </div>
      <BottomNav />
      <StaleWorkoutPrompt />
    </div>
  );
}
