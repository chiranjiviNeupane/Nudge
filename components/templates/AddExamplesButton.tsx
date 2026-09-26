"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addExampleRoutines } from "@/lib/repositories/examples";

/** One-tap Push / Pull / Leg starter routines, shown in empty states. */
export function AddExamplesButton({ className }: { className?: string }) {
  const [adding, setAdding] = useState(false);
  return (
    <Button
      variant="secondary"
      size="cta"
      className={className}
      disabled={adding}
      onClick={async () => {
        setAdding(true);
        try {
          const n = await addExampleRoutines();
          toast.success(n > 0 ? "Added Push, Pull and Leg Day" : "Examples already added");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not add examples");
        } finally {
          setAdding(false);
        }
      }}
    >
      {adding ? "Adding…" : "Add example routines"}
    </Button>
  );
}
