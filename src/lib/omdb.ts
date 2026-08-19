function apiKey() {
  const key = process.env.OMDB_API_KEY;
  if (!key) throw new Error("OMDB_API_KEY is not set");
  return key;
}

export async function getImdbRating(imdbId: string): Promise<number | null> {
  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", apiKey());
  url.searchParams.set("i", imdbId);

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;

  const data = await res.json();
  if (data.Response === "False") return null;

  const rating = parseFloat(data.imdbRating);
  return Number.isFinite(rating) ? rating : null;
}
