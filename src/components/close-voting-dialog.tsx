"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { closeVoting } from "@/lib/actions/voting";
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

export function CloseVotingDialog({
  clubId,
  cycleId,
  votedCount,
  memberCount,
  winnersPerCycle,
}: {
  clubId: string;
  cycleId: string;
  votedCount: number;
  memberCount: number;
  winnersPerCycle: number;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>Close voting &amp; reveal winner{winnersPerCycle === 1 ? "" : "s"}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close voting?</AlertDialogTitle>
          <AlertDialogDescription>
            {votedCount} of {memberCount} member{memberCount === 1 ? "" : "s"} voted. The most-picked
            movies win — {winnersPerCycle} winner
            {winnersPerCycle === 1 ? "" : "s"}, and the cycle moves to Watching. This can&apos;t
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await closeVoting(clubId, cycleId);
                if (result?.error) {
                  toast.error(result.error);
                } else if (result?.runoff) {
                  // A tie can't be settled on votes, so tell the admin what
                  // happened rather than silently reopening the ballot.
                  const { titles, votes, remainingSeats } = result.runoff;
                  toast.warning(
                    `Tie at ${votes} vote${votes === 1 ? "" : "s"} — ${titles.join(", ")} go to another round for ${remainingSeats} spot${remainingSeats === 1 ? "" : "s"}.`,
                    { duration: 10000 },
                  );
                  router.refresh();
                }
              })
            }
          >
            Close &amp; reveal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
