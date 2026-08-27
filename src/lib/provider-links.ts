/**
 * TMDB's watch/providers endpoint only returns one aggregate JustWatch link,
 * not per-service deep links. To send people straight to the service, map the
 * known TMDB provider ids to that service's own search URL. Opening these on
 * a phone hands off to the installed app via universal links; on desktop they
 * open the service in the browser.
 *
 * Anything not in this map falls back to the JustWatch link.
 */
const PROVIDER_SEARCH: Record<number, (title: string) => string> = {
  // Subscription
  8: (t) => `https://www.netflix.com/search?q=${t}`, // Netflix
  1796: (t) => `https://www.netflix.com/search?q=${t}`, // Netflix basic with ads
  9: (t) => `https://www.amazon.com/s?k=${t}&i=instant-video`, // Prime Video
  119: (t) => `https://www.amazon.com/s?k=${t}&i=instant-video`, // Amazon Prime Video
  337: (t) => `https://www.disneyplus.com/search?q=${t}`, // Disney+
  15: (t) => `https://www.hulu.com/search?q=${t}`, // Hulu
  1899: (t) => `https://play.max.com/search?q=${t}`, // Max
  384: (t) => `https://play.max.com/search?q=${t}`, // HBO Max
  350: (t) => `https://tv.apple.com/search?term=${t}`, // Apple TV+
  531: (t) => `https://www.paramountplus.com/search/?query=${t}`, // Paramount+
  386: (t) => `https://www.peacocktv.com/search?q=${t}`, // Peacock
  387: (t) => `https://www.peacocktv.com/search?q=${t}`, // Peacock Premium
  43: (t) => `https://www.starz.com/us/en/search?q=${t}`, // Starz
  37: (t) => `https://www.sho.com/search?q=${t}`, // Showtime
  526: (t) => `https://www.amcplus.com/search?q=${t}`, // AMC+
  258: (t) => `https://www.criterionchannel.com/search?q=${t}`, // Criterion Channel
  11: (t) => `https://mubi.com/en/search/films?query=${t}`, // MUBI
  99: (t) => `https://www.shudder.com/search?q=${t}`, // Shudder
  283: (t) => `https://www.crunchyroll.com/search?q=${t}`, // Crunchyroll
  // Free / ad-supported
  73: (t) => `https://tubitv.com/search/${t}`, // Tubi
  300: (t) => `https://pluto.tv/en/search/details?query=${t}`, // Pluto TV
  613: (t) => `https://www.freevee.com/search?q=${t}`, // Freevee
  // Rent / buy
  10: (t) => `https://www.amazon.com/s?k=${t}&i=instant-video`, // Amazon Video
  2: (t) => `https://tv.apple.com/search?term=${t}`, // Apple TV
  3: (t) => `https://play.google.com/store/search?q=${t}&c=movies`, // Google Play
  192: (t) => `https://www.youtube.com/results?search_query=${t}+movie`, // YouTube
  7: (t) => `https://www.fandangoathome.com/search?q=${t}`, // Fandango at Home (Vudu)
  68: (t) => `https://www.microsoft.com/en-us/search/shop/movies?q=${t}`, // Microsoft Store
};

/**
 * Direct link to watch `title` on the given provider, or null when we have no
 * mapping for it (caller should fall back to the JustWatch page).
 */
export function providerUrl(providerId: number, title: string): string | null {
  const build = PROVIDER_SEARCH[providerId];
  return build ? build(encodeURIComponent(title)) : null;
}
