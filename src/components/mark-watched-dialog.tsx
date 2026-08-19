"use client";

import { useTransition } from "react";
import { markCycleWatched } from "@/lib/actions/cycles";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function MarkWatchedDialog({ clubId, cycleId }: { clubId: string; cycleId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm">Mark as watched</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark this cycle as watched?</AlertDialogTitle>
          <AlertDialogDescription>
            This closes out the cycle and immediately opens nominations for the next one.
            Members can keep rating and reviewing after this.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await markCycleWatched(clubId, cycleId);
              })
            }
          >
            Mark watched &amp; start next cycle
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
