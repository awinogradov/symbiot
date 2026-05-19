/**
 * Localhost-only CORS guard. The viewer binds to 127.0.0.1 and is single-tenant;
 * the only legitimate origin is the same host:port. Anything else is rejected so
 * a stray browser tab can't drive the server.
 */

/** Build the CORS response headers for one request. Echoes only the expected origin. */
export const corsHeaders = (
  origin: string | null,
  expectedOrigin: string
): Record<string, string> => {
  const allowed = origin === expectedOrigin ? expectedOrigin : "null";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
};

/** True when the request lacks an Origin (same-origin or curl) or matches expectedOrigin. */
export const isOriginAllowed = (origin: string | null, expectedOrigin: string): boolean =>
  origin === null || origin === expectedOrigin;
