"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { closeNominations } from "@/lib/actions/nominations";
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

export function CloseNominationsDialog({
  clubId,
  cycleId,
  nominationCount,
}: {
  clubId: string;
  cycleId: string;
  nominationCount: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>Close nominations &amp; start voting</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close nominations?</AlertDialogTitle>
          <AlertDialogDescription>
            {nominationCount} movie{nominationCount === 1 ? "" : "s"} nominated. Once you close
            nominations, members will move on to ranking them — no more movies can be added.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await closeNominations(clubId, cycleId);
                if (result?.error) toast.error(result.error);
              })
            }
          >
            Close &amp; start voting
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
