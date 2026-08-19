"use client";

import { useActionState, useState, useTransition } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { toggleReviewLike, addReviewComment, type CommentFormState } from "@/lib/actions/review-social";
import { SpoilerReview } from "@/components/spoiler-review";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ReviewUser = { name: string | null; username: string | null; image: string | null };

export function ReviewCard({
  review,
  revalidatePathTarget,
}: {
  review: {
    id: string;
    body: string;
    containsSpoilers: boolean;
    user: ReviewUser;
    likeCount: number;
    likedByMe: boolean;
    comments: { id: string; body: string; user: ReviewUser }[];
  };
  revalidatePathTarget: string;
}) {
  const [likePending, startLikeTransition] = useTransition();
  const [showComments, setShowComments] = useState(false);
  const boundAddComment = addReviewComment.bind(null, review.id, revalidatePathTarget);
  const [state, formAction, commentPending] = useActionState<CommentFormState, FormData>(
    boundAddComment,
    undefined,
  );

  return (
    <div className="space-y-2 border-b pb-4 last:border-0">
      <div className="flex gap-3">
        <Avatar className="size-8">
          <AvatarImage src={review.user.image ?? undefined} alt={review.user.name ?? ""} />
          <AvatarFallback>{(review.user.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1.5">
          <p className="text-sm font-medium">{review.user.name}</p>
          <SpoilerReview body={review.body} containsSpoilers={review.containsSpoilers} />

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              disabled={likePending}
              onClick={() =>
                startLikeTransition(async () => {
                  await toggleReviewLike(review.id, revalidatePathTarget);
                })
              }
              className={cn(
                "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground",
                review.likedByMe && "text-red-500 hover:text-red-500",
              )}
            >
              <Heart className={cn("size-3.5", review.likedByMe && "fill-current")} />
              {review.likeCount > 0 ? review.likeCount : "Like"}
            </button>
            <button
              type="button"
              onClick={() => setShowComments((s) => !s)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="size-3.5" />
              {review.comments.length > 0 ? review.comments.length : "Comment"}
            </button>
          </div>

          {showComments && (
            <div className="space-y-2 pt-1">
              {review.comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="size-6">
                    <AvatarImage src={c.user.image ?? undefined} alt={c.user.name ?? ""} />
                    <AvatarFallback className="text-[9px]">
                      {(c.user.name ?? "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs">
                    <span className="font-medium">{c.user.name}</span>{" "}
                    <span className="text-muted-foreground">{c.body}</span>
                  </p>
                </div>
              ))}
              <form action={formAction} className="flex gap-2">
                <Input name="body" placeholder="Add a comment…" className="h-8 text-xs" />
                <Button type="submit" size="sm" variant="outline" disabled={commentPending}>
                  Post
                </Button>
              </form>
              {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
