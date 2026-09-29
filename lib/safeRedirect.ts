/**
 * Same-origin redirect paths only. Prevents open redirects such as
 * `?next=https://evil.example`, `//evil.example` and `/\evil.example`
 * (browsers normalise `\` to `/`, so `/\host` becomes `//host`).
 */
export function safeRedirectPath(next: string | null | undefined, fallback = '/'): string {
  if (!next) return fallback;
  // Reject protocol-relative and absolute URLs outright.
  if (next.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(next)) return fallback;
  // Must start with a single slash.
  if (!next.startsWith('/')) return fallback;
  // Reject backslashes and control characters (tab/newline are stripped by URL parsers).
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  return next;
}
