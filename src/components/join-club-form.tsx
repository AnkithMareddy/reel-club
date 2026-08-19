"use client";

import { useActionState } from "react";
import { joinClub, type JoinClubState } from "@/lib/actions/clubs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function JoinClubForm() {
  const [state, formAction, pending] = useActionState<JoinClubState, FormData>(
    joinClub,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        <Input name="inviteCode" placeholder="Invite code" required className="max-w-xs" />
        {state?.error ? <p className="mt-1 text-sm text-destructive">{state.error}</p> : null}
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Joining…" : "Join club"}
      </Button>
    </form>
  );
}
