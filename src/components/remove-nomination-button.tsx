"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { removeNomination } from "@/lib/actions/nominations";
import { Button } from "@/components/ui/button";

export function RemoveNominationButton({
  clubId,
  nominationId,
}: {
  clubId: string;
  nominationId: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon-sm"
      className="absolute right-1.5 top-1.5 rounded-full opacity-0 shadow transition-opacity group-hover:opacity-100"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await removeNomination(clubId, nominationId);
          router.refresh();
        })
      }
    >
      <X className="size-3.5" />
    </Button>
  );
}
