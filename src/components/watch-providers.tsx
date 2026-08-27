import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { tmdbPosterUrl, type WatchProviders, type WatchProvider } from "@/lib/tmdb";
import { providerUrl } from "@/lib/provider-links";

function ProviderRow({
  label,
  providers,
  link,
  title,
}: {
  label: string;
  providers: WatchProvider[];
  link: string | null;
  title: string;
}) {
  if (providers.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => {
          const logo = tmdbPosterUrl(p.logo_path, "w92");
          const chip = (
            <span className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs transition-colors hover:bg-muted">
              <span className="relative size-6 shrink-0 overflow-hidden rounded-full bg-muted">
                {logo ? (
                  <Image src={logo} alt="" fill sizes="24px" className="object-cover" />
                ) : null}
              </span>
              {p.provider_name}
            </span>
          );
          // Prefer the service's own page (opens its app on mobile), and
          // fall back to the JustWatch page for providers we don't map.
          const href = providerUrl(p.provider_id, title) ?? link;
          return href ? (
            <a
              key={p.provider_id}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={`Watch ${title} on ${p.provider_name}`}
            >
              {chip}
            </a>
          ) : (
            <span key={p.provider_id}>{chip}</span>
          );
        })}
      </div>
    </div>
  );
}

export function WatchProvidersSection({
  providers,
  title,
  region = "US",
}: {
  providers: WatchProviders | null;
  /** Movie title, used to build per-service search links. */
  title: string;
  region?: string;
}) {
  if (!providers) {
    return (
      <p className="text-sm text-muted-foreground">
        No {region} streaming availability listed for this one.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ProviderRow label="Stream" providers={providers.stream} link={providers.link} title={title} />
      <ProviderRow label="Rent" providers={providers.rent} link={providers.link} title={title} />
      <ProviderRow label="Buy" providers={providers.buy} link={providers.link} title={title} />
      {providers.link && (
        <a
          href={providers.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
        >
          All watch options on JustWatch
          <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}
