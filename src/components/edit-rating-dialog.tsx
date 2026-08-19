"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { updateRatingEntry, deletePersonalWatchEntry } from "@/lib/actions/edit-rating";
import { StarRatingInput } from "@/components/star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type EditableRatingEntry = {
  ratingId: string;
  watchedMovieId: string;
  title: string;
  score: number;
  body: string;
  watchedAt: string; // yyyy-mm-dd
  isPersonal: boolean;
};

/** Edit (and, for personal diary entries, delete) one of your own ratings. */
export function EditRatingDialog({ entry }: { entry: EditableRatingEntry }) {
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(entry.score);
  const [body, setBody] = useState(entry.body);
  const [watchedAt, setWatchedAt] = useState(entry.watchedAt);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    startTransition(async () => {
      const result = await updateRatingEntry({
        ratingId: entry.ratingId,
        score,
        body,
        watchedAt: entry.isPersonal ? watchedAt : undefined,
      });
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Updated ${entry.title}`);
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
      const result = await deletePersonalWatchEntry(entry.watchedMovieId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Deleted ${entry.title} from your diary`);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setScore(entry.score);
          setBody(entry.body);
          setWatchedAt(entry.watchedAt);
        }
        setConfirmingDelete(false);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" aria-label={`Edit ${entry.title}`}>
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {entry.title}</DialogTitle>
          <DialogDescription>
            {entry.isPersonal
              ? "A personal diary entry — only you control it."
              : "Your rating for a club watch."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Your rating</Label>
            <StarRatingInput value={score} onChange={setScore} />
          </div>

          {entry.isPersonal && (
            <div className="space-y-2">
              <Label htmlFor={`edit-date-${entry.ratingId}`}>Date watched</Label>
              <Input
                id={`edit-date-${entry.ratingId}`}
                type="date"
                value={watchedAt}
                onChange={(e) => setWatchedAt(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`edit-body-${entry.ratingId}`}>Review (optional)</Label>
            <Textarea
              id={`edit-body-${entry.ratingId}`}
              rows={4}
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {entry.isPersonal ? (
            <Button
              type="button"
              variant={confirmingDelete ? "destructive" : "ghost"}
              size="sm"
              disabled={pending}
              onClick={handleDelete}
            >
              <Trash2 className="size-3.5" />
              {confirmingDelete ? "Confirm delete" : "Delete entry"}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" disabled={pending || score === 0} onClick={handleSave}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
