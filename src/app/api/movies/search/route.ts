import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchMovies } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = req.nextUrl.searchParams.get("q")?.trim();
  const page = Number(req.nextUrl.searchParams.get("page") ?? "1") || 1;
  if (!query) return NextResponse.json({ page: 1, total_pages: 0, total_results: 0, results: [] });

  try {
    const data = await searchMovies(query, page);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Search failed, try again" }, { status: 502 });
  }
}
