import { parseCsvToRecords } from "@/lib/csv";

export type LetterboxdRow = {
  title: string;
  year: number | null;
  ratingStars: number | null; // 0.5–5.0, null if unrated
  watchedAt: string; // yyyy-mm-dd
};

/**
 * Parses a Letterboxd `diary.csv` or `ratings.csv` export. Both share a
 * `Name`/`Year`/`Rating` shape; diary.csv additionally has `Watched Date`
 * (preferred over the rating-action `Date` column when present).
 */
export function parseLetterboxdCsv(text: string): LetterboxdRow[] {
  const records = parseCsvToRecords(text);
  const rows: LetterboxdRow[] = [];

  for (const r of records) {
    const title = r["Name"]?.trim();
    if (!title) continue;

    const yearNum = r["Year"] ? Number(r["Year"]) : NaN;
    const ratingNum = r["Rating"] ? Number(r["Rating"]) : NaN;
    const dateStr = r["Watched Date"]?.trim() || r["Date"]?.trim() || "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;

    rows.push({
      title,
      year: Number.isFinite(yearNum) ? yearNum : null,
      ratingStars: Number.isFinite(ratingNum) ? ratingNum : null,
      watchedAt: dateStr,
    });
  }
  return rows;
}
