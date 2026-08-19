import type { TmdbSearchResult } from "@/lib/tmdb";

/** Looks up a title (+ optional year) against TMDB search and returns the best guess. */
export async function matchMovieTitle(
  title: string,
  year: number | null,
): Promise<TmdbSearchResult | null> {
  const res = await fetch(`/api/movies/search?q=${encodeURIComponent(title)}`);
  if (!res.ok) return null;
  const data = await res.json();
  const results: TmdbSearchResult[] = data.results ?? [];
  if (results.length === 0) return null;
  if (year) {
    const exact = results.find((r) => r.release_date?.slice(0, 4) === String(year));
    if (exact) return exact;
  }
  return results[0];
}

/** Runs `fn` over `items` with at most `limit` in flight at once. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
