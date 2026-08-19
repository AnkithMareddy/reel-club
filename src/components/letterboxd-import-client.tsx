"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, CheckCircle2, CircleAlert, Trash2 } from "lucide-react";
import { parseLetterboxdCsv, type LetterboxdRow } from "@/lib/letterboxd";
import { starsToScore } from "@/lib/rating-scale";
import { matchMovieTitle, mapWithConcurrency } from "@/lib/match-movie";
import { importPersonalWatchHistory, clearLetterboxdImports } from "@/lib/actions/watch-import";
import { MovieMatchPicker } from "@/components/movie-match-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { tmdbPosterUrl, type TmdbSearchResult } from "@/lib/tmdb";

type MatchedGroup = {
  key: string;
  title: string;
  year: number | null;
  rows: LetterboxdRow[];
  match: TmdbSearchResult | null;
  skip: boolean;
  fixing: boolean;
};

type Stage = "upload" | "matching" | "preview" | "importing" | "done";

export function LetterboxdImportClient() {
  const [stage, setStage] = useState<Stage>("upload");
  const [groups, setGroups] = useState<MatchedGroup[]>([]);
  const [matchProgress, setMatchProgress] = useState({ done: 0, total: 0 });
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<{ imported: number; skipped: number } | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleClearImports() {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    setClearing(true);
    try {
      const { deleted } = await clearLetterboxdImports();
      toast.success(
        deleted === 0
          ? "No Letterboxd-imported entries to delete"
          : `Deleted ${deleted} imported entr${deleted === 1 ? "y" : "ies"} — ready for a fresh upload`,
      );
      setConfirmingClear(false);
      router.refresh();
    } finally {
      setClearing(false);
    }
  }

  async function handleFile(file: File) {
    const text = await file.text();
    const rows = parseLetterboxdCsv(text);
    if (rows.length === 0) {
      toast.error("Couldn't find any rows with a title and date in that file.");
      return;
    }

    const byKey = new Map<string, LetterboxdRow[]>();
    for (const row of rows) {
      const key = `${row.title.toLowerCase()}|${row.year ?? ""}`;
      const list = byKey.get(key) ?? [];
      list.push(row);
      byKey.set(key, list);
    }
    const uniqueGroups = [...byKey.entries()].map(([key, groupRows]) => ({
      key,
      title: groupRows[0].title,
      year: groupRows[0].year,
      rows: groupRows,
    }));

    setStage("matching");
    setMatchProgress({ done: 0, total: uniqueGroups.length });

    let done = 0;
    const matched = await mapWithConcurrency(uniqueGroups, 4, async (g) => {
      const match = await matchMovieTitle(g.title, g.year);
      done++;
      setMatchProgress({ done, total: uniqueGroups.length });
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
    const entries = toImport.flatMap((g) =>
      g.rows.map((r) => ({
        tmdbId: g.match!.id,
        watchedAt: r.watchedAt,
        score: r.ratingStars != null ? starsToScore(r.ratingStars) : null,
      })),
    );

    setStage("importing");
    setImportProgress({ done: 0, total: entries.length });

    let imported = 0;
    let skipped = 0;
    const BATCH = 25;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = entries.slice(i, i + BATCH);
      const result = await importPersonalWatchHistory(batch);
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
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-muted-foreground">
              From Letterboxd, go to Settings → Import & Export → Export Your Data, then upload{" "}
              <code className="rounded bg-muted px-1 py-0.5">diary.csv</code> or{" "}
              <code className="rounded bg-muted px-1 py-0.5">ratings.csv</code> from the zip below.
            </p>
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
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" />
              Choose CSV file
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="max-w-sm text-sm text-muted-foreground">
              Ended up with duplicates from uploading both diary.csv and ratings.csv? Wipe
              everything imported from Letterboxd and start over. Club ratings and movies you
              logged by hand aren&apos;t touched.
            </p>
            <Button
              type="button"
              variant={confirmingClear ? "destructive" : "outline"}
              size="sm"
              disabled={clearing}
              onClick={handleClearImports}
            >
              <Trash2 className="size-3.5" />
              {clearing
                ? "Deleting…"
                : confirmingClear
                  ? "Confirm — delete all imports"
                  : "Delete all Letterboxd imports"}
            </Button>
          </CardContent>
        </Card>
      </div>
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
    const matchedCount = groups.filter((g) => g.match && !g.skip).length;
    const totalRows = groups.filter((g) => g.match && !g.skip).reduce((s, g) => s + g.rows.length, 0);
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {matchedCount} of {groups.length} titles matched ({totalRows} watch entries). Review any
          that look wrong before importing.
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
                    {g.rows.length} watch{g.rows.length === 1 ? "" : "es"} logged
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
        <Button disabled={totalRows === 0} onClick={handleImport}>
          Import {totalRows} watch entr{totalRows === 1 ? "y" : "ies"}
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
          Added {summary?.imported ?? 0} watch entries
          {summary?.skipped ? ` (skipped ${summary.skipped} — already imported or no match)` : ""}.
        </p>
      </CardContent>
    </Card>
  );
}
