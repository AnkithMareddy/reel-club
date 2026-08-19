"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  addMovieToList,
  moveListItem,
  removeListItem,
  updateList,
  deleteList,
} from "@/lib/actions/lists";
import { MovieSearchGrid } from "@/components/movie-search-grid";
import { StarRatingDisplay } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { tmdbPosterUrl, type TmdbSearchResult } from "@/lib/tmdb";

export type ListItemRow = {
  id: string;
  position: number;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  year: number | null;
  myScore: number | null;
};

export function ListEditor({
  listId,
  listTitle,
  listDescription,
  isRanked,
  items,
  editable,
}: {
  listId: string;
  listTitle: string;
  listDescription: string;
  isRanked: boolean;
  items: ListItemRow[];
  editable: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleAdd(movie: TmdbSearchResult) {
    startTransition(async () => {
      const result = await addMovieToList(listId, movie.id);
      if ("error" in result) toast.error(result.error);
      else {
        toast.success(`Added ${movie.title}`);
        router.refresh();
      }
    });
  }

  function handleMove(itemId: string, direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveListItem(listId, itemId, direction);
      if ("error" in result) toast.error(result.error);
      else router.refresh();
    });
  }

  function handleRemove(itemId: string, title: string) {
    startTransition(async () => {
      const result = await removeListItem(listId, itemId);
      if ("error" in result) toast.error(result.error);
      else {
        toast.success(`Removed ${title}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {editable && (
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant={adding ? "secondary" : "default"} onClick={() => setAdding(!adding)}>
            {adding ? <X className="size-4" /> : <Plus className="size-4" />}
            {adding ? "Done adding" : "Add movies"}
          </Button>
          <EditListDialog
            listId={listId}
            defaultTitle={listTitle}
            defaultDescription={listDescription}
            defaultRanked={isRanked}
          />
        </div>
      )}

      {editable && adding && (
        <div className="rounded-lg border p-4">
          <MovieSearchGrid onSelect={handleAdd} disabledIds={new Set(items.map((i) => i.tmdbId))} />
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {editable ? "Nothing here yet — add your first movie." : "This list is empty."}
        </p>
      ) : (
        <div className={pending ? "pointer-events-none space-y-2 opacity-60" : "space-y-2"}>
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border p-2.5">
              {isRanked && (
                <span className="w-7 shrink-0 text-center text-lg font-semibold text-muted-foreground">
                  {item.position}
                </span>
              )}
              <Link href={`/movies/${item.tmdbId}`} className="shrink-0">
                <div className="relative aspect-[2/3] w-11 overflow-hidden rounded bg-muted">
                  {tmdbPosterUrl(item.posterPath, "w92") ? (
                    <Image
                      src={tmdbPosterUrl(item.posterPath, "w92")!}
                      alt={item.title}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/movies/${item.tmdbId}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {item.title}
                </Link>
                <p className="text-xs text-muted-foreground">{item.year ?? ""}</p>
              </div>
              {item.myScore != null && <StarRatingDisplay value={item.myScore} className="shrink-0" />}
              {editable && (
                <div className="flex shrink-0 items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    aria-label={`Move ${item.title} up`}
                    onClick={() => handleMove(item.id, "up")}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === items.length - 1}
                    aria-label={`Move ${item.title} down`}
                    onClick={() => handleMove(item.id, "down")}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${item.title}`}
                    onClick={() => handleRemove(item.id, item.title)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditListDialog({
  listId,
  defaultTitle,
  defaultDescription,
  defaultRanked,
}: {
  listId: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultRanked: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [isRanked, setIsRanked] = useState(defaultRanked);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    startTransition(async () => {
      const result = await updateList(listId, { title, description, isRanked });
      if ("error" in result) toast.error(result.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      await deleteList(listId);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setConfirmingDelete(false);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Pencil className="size-3.5" />
          Edit list
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit list</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`edit-title-${listId}`}>Title</Label>
            <Input
              id={`edit-title-${listId}`}
              value={title}
              maxLength={100}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-desc-${listId}`}>Description</Label>
            <Textarea
              id={`edit-desc-${listId}`}
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id={`edit-ranked-${listId}`} checked={isRanked} onCheckedChange={setIsRanked} />
            <Label htmlFor={`edit-ranked-${listId}`}>Ranked list</Label>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant={confirmingDelete ? "destructive" : "ghost"}
            size="sm"
            disabled={pending}
            onClick={handleDelete}
          >
            <Trash2 className="size-3.5" />
            {confirmingDelete ? "Confirm delete" : "Delete list"}
          </Button>
          <Button type="button" disabled={pending || !title.trim()} onClick={handleSave}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
