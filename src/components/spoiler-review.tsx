"use client";

import { useState } from "react";
import { EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SpoilerReview({
  body,
  containsSpoilers,
}: {
  body: string;
  containsSpoilers: boolean;
}) {
  const [revealed, setRevealed] = useState(!containsSpoilers);

  if (revealed) {
    return <p className="whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setRevealed(true)}
      className="gap-1.5"
    >
      <EyeOff className="size-3.5" />
      Contains spoilers — click to reveal
    </Button>
  );
}
