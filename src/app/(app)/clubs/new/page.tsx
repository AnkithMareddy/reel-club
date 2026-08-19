import { createClub } from "@/lib/actions/clubs";
import { ClubForm } from "@/components/club-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewClubPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Create a club</CardTitle>
          <CardDescription>
            You&apos;ll be the admin. Cycle 1 opens for nominations as soon as you create it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClubForm action={createClub} submitLabel="Create club" />
        </CardContent>
      </Card>
    </div>
  );
}
