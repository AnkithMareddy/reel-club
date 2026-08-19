"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { nominateMovie } from "@/lib/actions/nominations";
import { MovieSearchGrid } from "@/components/movie-search-grid";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TmdbSearchResult } from "@/lib/tmdb";

export type NominatorOption = {
  userId: string;
  name: string;
  used: number;
  limit: number;
};

export function NominateMovieSearch({
  clubId,
  cycleId,
  disabledTmdbIds,
  remaining,
  isAdmin,
  members,
  currentUserId,
}: {
  clubId: string;
  cycleId: string;
  disabledTmdbIds: number[];
  remaining: number;
  isAdmin: boolean;
  members: NominatorOption[];
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [nominatorId, setNominatorId] = useState(currentUserId);
  const router = useRouter();

  const selected = members.find((m) => m.userId === nominatorId);
  const selectedRemaining = selected
    ? Math.max(0, selected.limit - selected.used)
    : remaining;
  const nominatingForSelf = nominatorId === currentUserId;

  function handleSelect(movie: TmdbSearchResult) {
    if (selectedRemaining <= 0) {
      toast.error(
        nominatingForSelf
          ? "You've used all your nominations for this cycle"
          : `${selected?.name} has no nominations left this cycle`,
      );
      return;
    }
    startTransition(async () => {
      const result = await nominateMovie(
        clubId,
        cycleId,
        movie.id,
        nominatingForSelf ? undefined : nominatorId,
      );
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(
          nominatingForSelf
            ? `Nominated ${movie.title}`
            : `Nominated ${movie.title} for ${selected?.name}`,
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {isAdmin && members.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <Label htmlFor="nominator" className="text-sm">
            Nominating as
          </Label>
          <Select value={nominatorId} onValueChange={setNominatorId}>
            <SelectTrigger id="nominator" className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => {
                const left = Math.max(0, m.limit - m.used);
                return (
                  <SelectItem key={m.userId} value={m.userId} disabled={left === 0}>
                    {m.userId === currentUserId ? `${m.name} (you)` : m.name} — {left} left
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {!nominatingForSelf && (
            <p className="text-xs text-muted-foreground">
              Counts against {selected?.name}&apos;s {selected?.limit} nomination
              {selected?.limit === 1 ? "" : "s"}.
            </p>
          )}
        </div>
      )}

      <div className={pending ? "pointer-events-none opacity-60" : undefined}>
        <MovieSearchGrid onSelect={handleSelect} disabledIds={new Set(disabledTmdbIds)} />
      </div>
    </div>
  );
}
