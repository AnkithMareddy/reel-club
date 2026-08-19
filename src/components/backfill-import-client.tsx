"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Download, CheckCircle2, CircleAlert } from "lucide-react";
import { parseBackfillCsv, groupBackfillRows, BACKFILL_CSV_TEMPLATE, type BackfillGroup } from "@/lib/backfill";
import { matchMovieTitle, mapWithConcurrency } from "@/lib/match-movie";
import { starsToScore } from "@/lib/rating-scale";
import { backfillClubWatchHistory } from "@/lib/actions/watch-import";
import { MovieMatchPicker } from "@/components/movie-match-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { tmdbPosterUrl, type TmdbSearchResult } from "@/lib/tmdb";

type MatchedGroup = BackfillGroup & {
  match: TmdbSearchResult | null;
  skip: boolean;
  fixing: boolean;
};

type Stage = "upload" | "matching" | "preview" | "importing" | "done";

function downloadTemplate() {
  const blob = new Blob([BACKFILL_CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reel-club-backfill-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function BackfillImportClient({ clubId }: { clubId: string }) {
  const [stage, setStage] = useState<Stage>("upload");
  const [groups, setGroups] = useState<MatchedGroup[]>([]);
  const [matchProgress, setMatchProgress] = useState({ done: 0, total: 0 });
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<{ imported: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    const text = await file.text();
    const rows = parseBackfillCsv(text);
    if (rows.length === 0) {
      toast.error("Couldn't find any valid rows. Check the template's column names.");
      return;
    }

    const grouped = groupBackfillRows(rows);
    setStage("matching");
    setMatchProgress({ done: 0, total: grouped.length });

    let done = 0;
    const matched = await mapWithConcurrency(grouped, 4, async (g) => {
      const match = await matchMovieTitle(g.title, g.year);
      done++;
      setMatchProgress({ done, total: grouped.length });
      return { ...g, match, skip: false, fixing: false };
    });

    setGroups(matched);
    setStage("preview");
  }

  function updateGroup(key: string, patch: Partial<MatchedGroup>) {
    setGroups((prev) => prev.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  }

  async function handleImport() {
    const toImport = groups.filter((g) => g.match && !g.skip);
    const entries = toImport.map((g) => ({
      tmdbId: g.match!.id,
      watchedAt: g.watchedAt,
      ratings: g.ratings.map((r) => ({ username: r.username, score: starsToScore(r.ratingStars) })),
    }));

    setStage("importing");
    setImportProgress({ done: 0, total: entries.length });

    let imported = 0;
    let skipped = 0;
    const BATCH = 25;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      const result = await backfillClubWatchHistory(clubId, batch);
      if (result.error) {
        toast.error(result.error);
        break;
      }
      imported += result.imported;
      skipped += result.skipped;
      setImportProgress({ done: Math.min(i + BATCH, entries.length), total: entries.length });
    }

    setSummary({ imported, skipped });
    setStage("done");
    router.refresh();
  }

  if (stage === "upload") {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-muted-foreground">
            One row per movie + member rating. Members are matched by their Reel Club username.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="size-4" />
            Download CSV template
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" />
              Choose CSV file
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stage === "matching") {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm">
            Matching movies against TMDB… {matchProgress.done}/{matchProgress.total}
          </p>
          <Progress value={(matchProgress.done / Math.max(1, matchProgress.total)) * 100} />
        </CardContent>
      </Card>
    );
  }

  if (stage === "preview") {
    const included = groups.filter((g) => g.match && !g.skip);
    const totalRatings = included.reduce((s, g) => s + g.ratings.length, 0);
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {included.length} of {groups.length} watch events matched ({totalRatings} member
          ratings). Review any that look wrong before importing.
        </p>
        <div className="space-y-2">
          {groups.map((g) => (
            <Card key={g.key} className={g.skip ? "opacity-50" : undefined}>
              <CardContent className="flex items-start gap-3 py-3">
                <div className="relative aspect-[2/3] w-10 shrink-0 overflow-hidden rounded bg-muted">
                  {g.match && tmdbPosterUrl(g.match.poster_path, "w92") ? (
                    <Image
                      src={tmdbPosterUrl(g.match.poster_path, "w92")!}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium leading-tight">
                    {g.title} <span className="text-muted-foreground">{g.year ?? ""}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Watched {g.watchedAt} · {g.ratings.map((r) => r.username).join(", ")}
                  </p>
                  {g.match ? (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-3.5 text-green-600" />
                      Matched to {g.match.title} ({g.match.release_date?.slice(0, 4) ?? "—"})
                    </p>
                  ) : (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <CircleAlert className="size-3.5" />
                      No match found — search manually or it&apos;ll be skipped
                    </p>
                  )}
                  {g.fixing && (
                    <MovieMatchPicker
                      defaultQuery={g.title}
                      onPick={(movie) => updateGroup(g.key, { match: movie, fixing: false })}
                    />
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateGroup(g.key, { fixing: !g.fixing })}
                  >
                    {g.match ? "Fix" : "Search"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateGroup(g.key, { skip: !g.skip })}
                  >
                    {g.skip ? "Include" : "Skip"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Button disabled={totalRatings === 0} onClick={handleImport}>
          Import {included.length} movie{included.length === 1 ? "" : "s"} ({totalRatings} ratings)
        </Button>
      </div>
    );
  }

  if (stage === "importing") {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          <p className="text-sm">
            Importing… {importProgress.done}/{importProgress.total}
          </p>
          <Progress value={(importProgress.done / Math.max(1, importProgress.total)) * 100} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        <p className="font-medium">Import complete</p>
        <p className="text-sm text-muted-foreground">
          Added {summary?.imported ?? 0} ratings
          {summary?.skipped ? ` (skipped ${summary.skipped} — unknown username or bad row)` : ""}.
        </p>
      </CardContent>
    </Card>
  );
}
