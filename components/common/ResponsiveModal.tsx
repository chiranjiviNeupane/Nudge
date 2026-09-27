"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsDesktop } from "@/lib/hooks/useMediaQuery";

/** Centered dialog on desktop, bottom sheet on phones. */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[80dvh] flex-col sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="display text-lg">{title}</DialogTitle>
            <DialogDescription className={description ? undefined : "sr-only"}>
              {description ?? title}
            </DialogDescription>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        // Ride above the on-screen keyboard (see KeyboardInset).
        className="flex max-h-[min(88dvh,calc(var(--vvh,100dvh)-1rem))] flex-col rounded-t-2xl pb-safe data-[side=bottom]:bottom-[var(--kb-inset,0px)]"
      >
        <SheetHeader className="pb-0">
          <SheetTitle className="display text-lg">{title}</SheetTitle>
          <SheetDescription className={description ? undefined : "sr-only"}>
            {description ?? title}
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
