"use client";

import { Globe, Lock, Users } from "lucide-react";
import type { ListVisibility } from "@/lib/list-visibility";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function VisibilityIcon({
  visibility,
  className,
}: {
  visibility: ListVisibility;
  className?: string;
}) {
  if (visibility === "PUBLIC") return <Globe className={className} />;
  if (visibility === "FRIENDS") return <Users className={className} />;
  return <Lock className={className} />;
}

export function VisibilitySelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: ListVisibility;
  onChange: (value: ListVisibility) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ListVisibility)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="PRIVATE">Only me — private</SelectItem>
        <SelectItem value="FRIENDS">Friends — anyone you&apos;re friends with</SelectItem>
        <SelectItem value="PUBLIC">Everyone — any Reel Club member</SelectItem>
      </SelectContent>
    </Select>
  );
}
