/**
 * Where to send someone after sign-in. Only an in-site path is kept, so a crafted link
 * (`?returnTo=//evil.com`) can't send people to another site; anything else becomes "/".
 */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/")) return "/";
  // "//host" and "/\host" are protocol-relative URLs to another site in browsers.
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
