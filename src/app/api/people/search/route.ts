import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchPeople } from "@/lib/tmdb";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ results: [] });

  try {
    const results = await searchPeople(query);
    return NextResponse.json({
      results: results.slice(0, 8).map((p) => ({
        id: p.id,
        name: p.name,
        profile_path: p.profile_path,
        known_for_department: p.known_for_department,
        known_for: (p.known_for ?? [])
          .map((k) => k.title ?? k.name)
          .filter(Boolean)
          .slice(0, 2),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Search failed, try again" }, { status: 502 });
  }
}
