"use client";

import { useActionState, useState } from "react";
import { submitRatingAndReview, type RatingFormState } from "@/lib/actions/reviews";
import { StarRatingInput } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RatingReviewForm({
  clubId,
  watchedMovieId,
  defaultScore,
  defaultBody,
  defaultSpoilers,
  defaultVisibility,
}: {
  clubId: string;
  watchedMovieId: string;
  defaultScore: number;
  defaultBody: string;
  defaultSpoilers: boolean;
  defaultVisibility: "CLUB_AND_FRIENDS" | "CLUB_ONLY";
}) {
  const boundAction = submitRatingAndReview.bind(null, clubId, watchedMovieId);
  const [state, formAction, pending] = useActionState<RatingFormState, FormData>(
    boundAction,
    undefined,
  );
  const [score, setScore] = useState(defaultScore);
  const [containsSpoilers, setContainsSpoilers] = useState(defaultSpoilers);
  const [visibility, setVisibility] = useState(defaultVisibility);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label>Your rating</Label>
        <StarRatingInput name="score" value={score} onChange={setScore} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Review (optional)</Label>
        <Textarea id="body" name="body" rows={4} maxLength={2000} defaultValue={defaultBody} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="containsSpoilers"
            name="containsSpoilers"
            checked={containsSpoilers}
            onCheckedChange={setContainsSpoilers}
          />
          <Label htmlFor="containsSpoilers">Contains spoilers</Label>
        </div>

        <Select
          name="visibility"
          value={visibility}
          onValueChange={(v) => setVisibility(v as typeof visibility)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CLUB_AND_FRIENDS">Visible to club + friends</SelectItem>
            <SelectItem value="CLUB_ONLY">Visible to club only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={pending || score === 0}>
        {pending ? "Saving…" : "Save rating & review"}
      </Button>
    </form>
  );
}
