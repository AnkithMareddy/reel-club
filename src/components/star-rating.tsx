"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Interactive 1–10 rating rendered as 5 half-star-capable stars. */
export function StarRatingInput({
  value,
  onChange,
  name,
}: {
  value: number;
  onChange: (value: number) => void;
  name?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input type="hidden" name={name} value={value} />
      <div className="flex">
        {[0, 1, 2, 3, 4].map((i) => {
          const base = i * 2;
          const fillPercent = Math.max(0, Math.min(100, (value - base) * 50));
          return (
            <div key={i} className="relative size-6">
              <Star className="absolute inset-0 size-6 text-muted-foreground" />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fillPercent}%` }}
              >
                <Star className="size-6 fill-yellow-500 text-yellow-500" />
              </div>
              <button
                type="button"
                aria-label={`${base + 1} of 10`}
                className="absolute inset-y-0 left-0 w-1/2"
                onClick={() => onChange(base + 1)}
              />
              <button
                type="button"
                aria-label={`${base + 2} of 10`}
                className="absolute inset-y-0 right-0 w-1/2"
                onClick={() => onChange(base + 2)}
              />
            </div>
          );
        })}
      </div>
      <span className={cn("text-sm text-muted-foreground", value === 0 && "opacity-0")}>
        {(value / 2).toFixed(1)} / 5
      </span>
    </div>
  );
}

/** Read-only star display for showing an existing 1–10 score. */
export function StarRatingDisplay({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("flex", className)}>
      {[0, 1, 2, 3, 4].map((i) => {
        const base = i * 2;
        const fillPercent = Math.max(0, Math.min(100, (value - base) * 50));
        return (
          <div key={i} className="relative size-4">
            <Star className="absolute inset-0 size-4 text-muted-foreground" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
              <Star className="size-4 fill-yellow-500 text-yellow-500" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
