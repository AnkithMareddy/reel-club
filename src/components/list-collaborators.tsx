"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus, X } from "lucide-react";
import { addListCollaborator, removeListCollaborator } from "@/lib/actions/lists";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CollaboratorUser = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
};

export function ListCollaborators({
  listId,
  collaborators,
  addableFriends,
  canManage,
  currentUserId,
}: {
  listId: string;
  collaborators: CollaboratorUser[];
  /** Accepted friends not already collaborating (owner only). */
  addableFriends: CollaboratorUser[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd() {
    if (!selected) return;
    startTransition(async () => {
      const result = await addListCollaborator(listId, selected);
      if ("error" in result) toast.error(result.error);
      else {
        toast.success("Collaborator added");
        setSelected("");
        router.refresh();
      }
    });
  }

  function handleRemove(userId: string, name: string | null) {
    startTransition(async () => {
      const result = await removeListCollaborator(listId, userId);
      if ("error" in result) toast.error(result.error);
      else {
        toast.success(
          userId === currentUserId ? "You left this list" : `Removed ${name ?? "collaborator"}`,
        );
        router.refresh();
      }
    });
  }

  const iAmCollaborator = collaborators.some((c) => c.id === currentUserId);
  if (!canManage && collaborators.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-sm font-medium">
        Collaborators {collaborators.length > 0 && `(${collaborators.length})`}
      </p>

      {collaborators.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No collaborators yet — add a friend so they can edit this list too.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {collaborators.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-2">
              <Link href={`/profile/${c.username}`} className="flex items-center gap-2 hover:underline">
                <Avatar className="size-6">
                  <AvatarImage src={c.image ?? undefined} alt={c.name ?? ""} />
                  <AvatarFallback className="text-[9px]">
                    {(c.name ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">{c.name}</span>
              </Link>
              {(canManage || c.id === currentUserId) && (
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`Remove ${c.name}`}
                  onClick={() => handleRemove(c.id, c.name)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && addableFriends.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Add a friend…" />
            </SelectTrigger>
            <SelectContent>
              {addableFriends.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name} (@{f.username})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" disabled={pending || !selected} onClick={handleAdd}>
            <UserPlus className="size-3.5" />
            Add
          </Button>
        </div>
      )}

      {canManage && addableFriends.length === 0 && collaborators.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add friends on the Friends page first — collaborators have to be friends.
        </p>
      )}

      {!canManage && iAmCollaborator && (
        <p className="text-xs text-muted-foreground">
          You can add and reorder movies here, but only the owner can rename or delete the list.
        </p>
      )}
    </div>
  );
}
