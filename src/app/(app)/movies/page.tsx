import { MovieSearchGrid } from "@/components/movie-search-grid";

export default function MoviesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search movies</h1>
        <p className="text-muted-foreground">Powered by TMDB.</p>
      </div>
      <MovieSearchGrid />
    </div>
  );
}
