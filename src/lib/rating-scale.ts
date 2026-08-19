/** Converts a 0.5–5.0 star rating (Letterboxd's scale) to our 1–10 score scale. */
export function starsToScore(stars: number): number {
  return Math.max(1, Math.min(10, Math.round(stars * 2)));
}
