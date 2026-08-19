"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClubFormValues = {
  name: string;
  description: string;
  coverImage: string;
  scheduleType: string;
  scheduleIntervalDays: number;
  winnersPerCycle: number;
  nominationsPerMember: number;
};

export function ClubForm({
  action,
  submitLabel,
  defaultValues,
}: {
  action: (prevState: { error?: string } | undefined, formData: FormData) => Promise<{ error?: string } | undefined>;
  submitLabel: string;
  defaultValues?: Partial<ClubFormValues>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [scheduleType, setScheduleType] = useState(defaultValues?.scheduleType ?? "WEEKLY");

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Club name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={60}
          defaultValue={defaultValues?.name}
          placeholder="Sunday Night Cinema"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={300}
          rows={3}
          defaultValue={defaultValues?.description}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverImage">Cover image URL (optional)</Label>
        <Input
          id="coverImage"
          name="coverImage"
          type="url"
          defaultValue={defaultValues?.coverImage}
          placeholder="https://…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="scheduleType">Cycle schedule</Label>
          <Select name="scheduleType" value={scheduleType} onValueChange={setScheduleType}>
            <SelectTrigger id="scheduleType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WEEKLY">Weekly</SelectItem>
              <SelectItem value="BIWEEKLY">Biweekly</SelectItem>
              <SelectItem value="MONTHLY">Monthly</SelectItem>
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {scheduleType === "CUSTOM" && (
          <div className="space-y-2">
            <Label htmlFor="scheduleIntervalDays">Days per cycle</Label>
            <Input
              id="scheduleIntervalDays"
              name="scheduleIntervalDays"
              type="number"
              min={1}
              max={365}
              defaultValue={defaultValues?.scheduleIntervalDays ?? 7}
              required
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="winnersPerCycle">Winners per cycle</Label>
          <Input
            id="winnersPerCycle"
            name="winnersPerCycle"
            type="number"
            min={1}
            max={5}
            defaultValue={defaultValues?.winnersPerCycle ?? 1}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nominationsPerMember">Nominations per member</Label>
          <Input
            id="nominationsPerMember"
            name="nominationsPerMember"
            type="number"
            min={1}
            max={10}
            defaultValue={defaultValues?.nominationsPerMember ?? 2}
            required
          />
        </div>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
