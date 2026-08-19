"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/lib/actions/profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function OnboardingForm({
  defaultName,
  defaultUsername,
  defaultBio,
  image,
}: {
  defaultName: string;
  defaultUsername: string;
  defaultBio: string;
  image: string | null;
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={image ?? undefined} alt={defaultName} />
          <AvatarFallback>{defaultName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <p className="text-sm text-muted-foreground">
          Your avatar is synced from your Google account.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Display name</Label>
        <Input id="name" name="name" defaultValue={defaultName} required maxLength={50} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          defaultValue={defaultUsername}
          required
          minLength={3}
          maxLength={20}
          pattern="[a-z0-9_]+"
          title="Only lowercase letters, numbers, and underscores"
        />
        <p className="text-xs text-muted-foreground">
          Friends can find you by this — used in your profile URL.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio (optional)</Label>
        <Textarea id="bio" name="bio" defaultValue={defaultBio} maxLength={280} rows={3} />
      </div>

      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
