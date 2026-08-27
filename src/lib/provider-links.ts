/**
 * TMDB's watch/providers endpoint returns only one aggregate JustWatch link,
 * not per-service deep links. To send people straight to the service we build
 * its own search URL.
 *
 * Matching is driven by the provider NAME rather than a fixed id table: TMDB
 * renames and re-ids services regularly (Paramount's base id, for example, was
 * replaced by separate "Essential"/"Premium" entries), and there is a long tail
 * of reseller variants like "Shudder Amazon Channel". Name rules cover all of
 * those, including services added after this was written.
 *
 * Rules are ordered — reseller variants must be matched before the underlying
 * service, since a title watched through "Paramount+ Amazon Channel" actually
 * plays inside Amazon.
 */
type Rule = { test: RegExp; url: (title: string) => string };

const RULES: Rule[] = [
  // ── Reseller / channel variants (must come first) ─────────────────────────
  { test: /amazon channel/i, url: (t) => `https://www.amazon.com/s?k=${t}&i=instant-video` },
  { test: /apple tv channel/i, url: (t) => `https://tv.apple.com/search?term=${t}` },
  {
    test: /roku/i,
    url: (t) => `https://therokuchannel.roku.com/search/${t}`,
  },

  // ── Subscription services ────────────────────────────────────────────────
  { test: /^netflix/i, url: (t) => `https://www.netflix.com/search?q=${t}` },
  { test: /^(hbo )?max\b/i, url: (t) => `https://play.max.com/search?q=${t}` },
  { test: /^hulu/i, url: (t) => `https://www.hulu.com/search?q=${t}` },
  { test: /^disney/i, url: (t) => `https://www.disneyplus.com/search?q=${t}` },
  { test: /^paramount/i, url: (t) => `https://www.paramountplus.com/search/?query=${t}` },
  { test: /^peacock/i, url: (t) => `https://www.peacocktv.com/search?q=${t}` },
  { test: /^starz/i, url: (t) => `https://www.starz.com/us/en/search?q=${t}` },
  { test: /^showtime/i, url: (t) => `https://www.sho.com/search?q=${t}` },
  { test: /^amc\+/i, url: (t) => `https://www.amcplus.com/search?q=${t}` },
  { test: /^criterion/i, url: (t) => `https://www.criterionchannel.com/search?q=${t}` },
  { test: /^mubi/i, url: (t) => `https://mubi.com/en/search/films?query=${t}` },
  { test: /^shudder/i, url: (t) => `https://www.shudder.com/search?q=${t}` },
  { test: /^crunchyroll/i, url: (t) => `https://www.crunchyroll.com/search?q=${t}` },
  { test: /^britbox/i, url: (t) => `https://www.britbox.com/us/search/${t}` },
  { test: /^acorn/i, url: (t) => `https://acorn.tv/search/?q=${t}` },
  { test: /^fubo/i, url: (t) => `https://www.fubo.tv/welcome/search?q=${t}` },
  { test: /^plex/i, url: (t) => `https://watch.plex.tv/search?q=${t}` },
  { test: /^kanopy/i, url: (t) => `https://www.kanopy.com/en/search?query=${t}` },
  { test: /^hoopla/i, url: (t) => `https://www.hoopladigital.com/search?q=${t}` },

  // ── Free / ad-supported ──────────────────────────────────────────────────
  { test: /^tubi/i, url: (t) => `https://tubitv.com/search/${t}` },
  { test: /^pluto/i, url: (t) => `https://pluto.tv/en/search/details?query=${t}` },
  { test: /^freevee/i, url: (t) => `https://www.amazon.com/s?k=${t}&i=instant-video` },

  // ── Rent / buy and storefronts ───────────────────────────────────────────
  // Any remaining Amazon entry (Prime Video, Amazon Video, "with Ads", …).
  { test: /^amazon|prime video/i, url: (t) => `https://www.amazon.com/s?k=${t}&i=instant-video` },
  { test: /^apple tv/i, url: (t) => `https://tv.apple.com/search?term=${t}` },
  { test: /^google play/i, url: (t) => `https://play.google.com/store/search?q=${t}&c=movies` },
  { test: /^youtube/i, url: (t) => `https://www.youtube.com/results?search_query=${t}+movie` },
  { test: /^fandango/i, url: (t) => `https://www.fandangoathome.com/search?q=${t}` },
  { test: /^microsoft/i, url: (t) => `https://www.microsoft.com/en-us/search/shop/movies?q=${t}` },
];

/**
 * Direct link to watch `title` on the given provider, or null when we have no
 * rule for it (caller falls back to the JustWatch page).
 */
export function providerUrl(providerName: string, title: string): string | null {
  const rule = RULES.find((r) => r.test.test(providerName.trim()));
  return rule ? rule.url(encodeURIComponent(title)) : null;
}
