"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { sendFriendRequest, type FriendActionState } from "@/lib/actions/friends";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddFriendForm() {
  const [state, formAction, pending] = useActionState<FriendActionState, FormData>(
    sendFriendRequest,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      formRef.current?.reset();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex gap-2">
      <Input
        name="identifier"
        placeholder="Add by username or email"
        required
        className="max-w-xs"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Add friend"}
      </Button>
    </form>
  );
}
