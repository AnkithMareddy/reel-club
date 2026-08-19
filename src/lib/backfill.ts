import { parseCsvToRecords } from "@/lib/csv";

export type BackfillCsvRow = {
  title: string;
  year: number | null;
  watchedAt: string; // yyyy-mm-dd
  username: string;
  ratingStars: number; // 0.5–5.0
};

export type BackfillGroup = {
  key: string;
  title: string;
  year: number | null;
  watchedAt: string;
  ratings: { username: string; ratingStars: number }[];
};

/**
 * Parses the admin historical-backfill CSV: one row per (movie, member)
 * rating. Columns: MovieTitle, Year, WatchedDate, MemberUsername, Rating.
 */
export function parseBackfillCsv(text: string): BackfillCsvRow[] {
  const records = parseCsvToRecords(text);
  const rows: BackfillCsvRow[] = [];

  for (const r of records) {
    const title = r["MovieTitle"]?.trim();
    const username = r["MemberUsername"]?.trim();
    const dateStr = r["WatchedDate"]?.trim();
    const ratingStars = Number(r["Rating"]);
    if (!title || !username || !dateStr) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;
    if (!Number.isFinite(ratingStars)) continue;

    const yearNum = r["Year"] ? Number(r["Year"]) : NaN;
    rows.push({
      title,
      year: Number.isFinite(yearNum) ? yearNum : null,
      watchedAt: dateStr,
      username,
      ratingStars,
    });
  }
  return rows;
}

/** Groups long-format rows into one entry per (movie, watch date), each with its member ratings. */
export function groupBackfillRows(rows: BackfillCsvRow[]): BackfillGroup[] {
  const byKey = new Map<string, BackfillGroup>();
  for (const r of rows) {
    const key = `${r.title.toLowerCase()}|${r.year ?? ""}|${r.watchedAt}`;
    const existing = byKey.get(key) ?? {
      key,
      title: r.title,
      year: r.year,
      watchedAt: r.watchedAt,
      ratings: [],
    };
    existing.ratings.push({ username: r.username, ratingStars: r.ratingStars });
    byKey.set(key, existing);
  }
  return [...byKey.values()];
}

export const BACKFILL_CSV_TEMPLATE =
  "MovieTitle,Year,WatchedDate,MemberUsername,Rating\n" +
  "The Matrix,1999,2024-03-15,alice,4.5\n" +
  "The Matrix,1999,2024-03-15,bob,4\n";
