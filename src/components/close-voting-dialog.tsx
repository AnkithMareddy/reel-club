"use client";

import { useTransition } from "react";
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

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button>Close voting &amp; reveal winner{winnersPerCycle === 1 ? "" : "s"}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close voting?</AlertDialogTitle>
          <AlertDialogDescription>
            {votedCount} of {memberCount} member{memberCount === 1 ? "" : "s"} voted. Ranked
            ballots will be tallied to pick {winnersPerCycle} winner
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
                if (result?.error) toast.error(result.error);
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
