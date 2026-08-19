"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyInviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const link = typeof window !== "undefined" ? `${window.location.origin}/join/${code}` : "";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <code className="rounded bg-muted px-2 py-1 text-sm font-medium tracking-widest">
          {code}
        </code>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => copy(code)}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => copy(link)}
        className="w-full"
      >
        Copy invite link
      </Button>
    </div>
  );
}
