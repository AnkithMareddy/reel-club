"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, UserPlus, Check, Clock } from "lucide-react";
import { sendFriendRequestToUser } from "@/lib/actions/friends";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchResult = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  status: "none" | "sent" | "incoming" | "friends";
};

/** Live people search — find anyone by name or username and add them in place. */
export function FriendSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    const t = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!cancelled) setResults(data.results ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  function handleAdd(user: SearchResult) {
    startTransition(async () => {
      const result = await sendFriendRequestToUser(user.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(result?.success ?? "Request sent");
        setResults((prev) =>
          prev.map((r) =>
            r.id === user.id
              ? { ...r, status: r.status === "incoming" ? "friends" : "sent" }
              : r,
          ),
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people by name or username…"
          className="pl-8"
        />
      </div>

      {loading && <p className="text-xs text-muted-foreground">Searching…</p>}

      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-sm text-muted-foreground">No one found for “{query.trim()}”.</p>
      )}

      {results.length > 0 && (
        <div className="max-w-md space-y-1 rounded-lg border p-2">
          {results.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 rounded-md p-1.5 hover:bg-muted/50">
              <Link href={`/profile/${u.username}`} className="flex min-w-0 items-center gap-3 hover:underline">
                <Avatar className="size-8">
                  <AvatarImage src={u.image ?? undefined} alt={u.name ?? ""} />
                  <AvatarFallback>{(u.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium leading-none">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                </div>
              </Link>
              {u.status === "friends" ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="size-3.5" /> Friends
                </span>
              ) : u.status === "sent" ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5" /> Sent
                </span>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant={u.status === "incoming" ? "default" : "outline"}
                  disabled={pending}
                  onClick={() => handleAdd(u)}
                >
                  <UserPlus className="size-3.5" />
                  {u.status === "incoming" ? "Accept" : "Add"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
