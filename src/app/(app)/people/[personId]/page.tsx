import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPersonDetails, tmdbPosterUrl, type TmdbPersonCredit } from "@/lib/tmdb";
import {
  PersonFilmographyClient,
  type FilmographyEntry,
} from "@/components/person-filmography-client";
import { Badge } from "@/components/ui/badge";

export default async function PersonPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const id = Number(personId);
  if (!Number.isFinite(id)) notFound();

  const session = await auth();
  let person;
  try {
    person = await getPersonDetails(id);
  } catch {
    notFound();
  }

  const toEntry = (
    c: TmdbPersonCredit,
    department: FilmographyEntry["department"],
    role: string,
  ): FilmographyEntry => ({
    tmdbId: c.id,
    title: c.title,
    posterPath: c.poster_path,
    year: c.release_date ? Number(c.release_date.slice(0, 4)) : null,
    role,
    department,
    voteAverage: c.vote_average,
    voteCount: c.vote_count,
    myScore: null,
  });

  // One card per movie. Someone who both directed and produced a film should
  // see it once with both roles, not two identical posters side by side.
  const byMovie = new Map<number, { entry: FilmographyEntry; roles: string[] }>();
  const add = (
    c: TmdbPersonCredit,
    department: FilmographyEntry["department"],
    role: string,
  ) => {
    if (!c.title) return;
    const existing = byMovie.get(c.id);
    if (!existing) {
      byMovie.set(c.id, { entry: toEntry(c, department, role), roles: [role] });
      return;
    }
    if (!existing.roles.includes(role)) existing.roles.push(role);
    // Directing outranks acting, which outranks other crew work.
    if (department === "Directing" || (department === "Acting" && existing.entry.department === "Other")) {
      existing.entry.department = department;
    }
  };

  for (const c of person.movie_credits.cast) {
    add(c, "Acting", c.character ? `as ${c.character}` : "Cast");
  }
  for (const c of person.movie_credits.crew) {
    add(c, c.job === "Director" ? "Directing" : "Other", c.job ?? "Crew");
  }

  const entries: FilmographyEntry[] = [...byMovie.values()].map(({ entry, roles }) => ({
    ...entry,
    role: roles.join(" · "),
  }));

  // Decorate with the viewer's own scores for movies they've rated.
  if (session?.user && entries.length > 0) {
    const myRatings = await prisma.rating.findMany({
      where: {
        userId: session.user.id,
        movie: { tmdbId: { in: entries.map((e) => e.tmdbId) } },
      },
      orderBy: { updatedAt: "asc" },
      select: { score: true, movie: { select: { tmdbId: true } } },
    });
    const scoreByTmdbId = new Map(myRatings.map((r) => [r.movie.tmdbId, r.score]));
    for (const e of entries) e.myScore = scoreByTmdbId.get(e.tmdbId) ?? null;
  }

  const photo = tmdbPosterUrl(person.profile_path, "w342");

  return (
    <div className="space-y-6">
      <div className="flex gap-5">
        <div className="relative aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-lg bg-muted sm:w-40">
          {photo ? (
            <Image src={photo} alt={person.name} fill sizes="160px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center p-2 text-center text-sm text-muted-foreground">
              {person.name}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{person.name}</h1>
          <div className="flex flex-wrap gap-2">
            {person.known_for_department && (
              <Badge variant="secondary">{person.known_for_department}</Badge>
            )}
            {person.birthday && <Badge variant="outline">Born {person.birthday}</Badge>}
          </div>
          {person.biography && (
            <p className="line-clamp-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {person.biography}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-medium">Filmography</h2>
        <PersonFilmographyClient entries={entries} />
      </div>
    </div>
  );
}
