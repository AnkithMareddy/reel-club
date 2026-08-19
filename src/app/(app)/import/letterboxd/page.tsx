import { LetterboxdImportClient } from "@/components/letterboxd-import-client";

export default function LetterboxdImportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import from Letterboxd</h1>
        <p className="text-muted-foreground">
          Bring your ratings and watch history over — it&apos;s all just as searchable and
          shareable here, minus the paywall.
        </p>
      </div>
      <LetterboxdImportClient />
    </div>
  );
}
