export type ListVisibility = "PRIVATE" | "FRIENDS" | "PUBLIC";

/**
 * Lives outside the "use client" component module: a Server Component that
 * imports a plain value from a client module receives a client-reference
 * stub rather than the value itself.
 */
export const VISIBILITY_LABEL: Record<ListVisibility, string> = {
  PRIVATE: "Only me",
  FRIENDS: "Friends",
  PUBLIC: "Everyone",
};
