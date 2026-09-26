"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getActiveSession, startWorkout } from "@/lib/repositories/activeSession";

/** Start a workout from a template, or resume the one already in progress. */
export function useStartWorkout() {
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);

  async function start(templateId: string | null) {
    setStarting(templateId ?? "custom");
    try {
      const active = await getActiveSession();
      if (active && active.templateId !== templateId) {
        toast.info(`Resuming “${active.name}”. Finish or discard it first.`);
      } else {
        await startWorkout(templateId);
      }
      router.push("/workout");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start workout");
      setStarting(null);
    }
  }

  return { start, starting };
}
