const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

function apiKey() {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("TMDB_API_KEY is not set");
  return key;
}

export function tmdbPosterUrl(path: string | null, size: "w92" | "w185" | "w342" | "w500" = "w342") {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export function tmdbBackdropUrl(path: string | null, size: "w780" | "w1280" = "w1280") {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

export type TmdbSearchResult = {
  id: number;
  title: string;
  release_date: string | null;
  poster_path: string | null;
  overview: string;
  vote_average: number;
  /** The signed-in user's own 1–10 score, attached by /api/movies/search. */
  my_score?: number | null;
};

export type TmdbSearchResponse = {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbSearchResult[];
};

export async function searchMovies(query: string, page = 1): Promise<TmdbSearchResponse> {
  const url = new URL(`${TMDB_BASE}/search/movie`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("include_adult", "false");

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);
  return res.json();
}

export type TmdbMovieDetails = {
  id: number;
  title: string;
  overview: string;
  release_date: string | null;
  runtime: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  imdb_id: string | null;
  genres: { id: number; name: string }[];
  credits: {
    cast: { id: number; name: string; character: string; profile_path: string | null; order: number }[];
    crew: { id: number; name: string; job: string; department: string; profile_path: string | null }[];
  };
};

export async function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
  const url = new URL(`${TMDB_BASE}/movie/${tmdbId}`);
  url.searchParams.set("api_key", apiKey());
  url.searchParams.set("append_to_response", "credits");

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`TMDB movie details failed: ${res.status}`);
  return res.json();
}

export async function getPersonProfilePath(tmdbPersonId: number): Promise<string | null> {
  const url = new URL(`${TMDB_BASE}/person/${tmdbPersonId}`);
  url.searchParams.set("api_key", apiKey());

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const data: { profile_path: string | null } = await res.json();
  return data.profile_path;
}
