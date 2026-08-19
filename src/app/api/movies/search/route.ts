import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { searchMovies } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = req.nextUrl.searchParams.get("q")?.trim();
  const page = Number(req.nextUrl.searchParams.get("page") ?? "1") || 1;
  if (!query) return NextResponse.json({ page: 1, total_pages: 0, total_results: 0, results: [] });

  try {
    const data = await searchMovies(query, page);

    // Attach the viewer's own score to each result so rated movies are
    // recognizable while browsing (latest rating wins on rewatches).
    const myRatings = await prisma.rating.findMany({
      where: {
        userId: session.user.id,
        movie: { tmdbId: { in: data.results.map((r) => r.id) } },
      },
      orderBy: { updatedAt: "asc" },
      select: { score: true, movie: { select: { tmdbId: true } } },
    });
    const scoreByTmdbId = new Map(myRatings.map((r) => [r.movie.tmdbId, r.score]));

    return NextResponse.json({
      ...data,
      results: data.results.map((r) => ({ ...r, my_score: scoreByTmdbId.get(r.id) ?? null })),
    });
  } catch {
    return NextResponse.json({ error: "Search failed, try again" }, { status: 502 });
  }
}
