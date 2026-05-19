/**
 * Localhost-only CORS guard. The viewer binds to 127.0.0.1; the only legitimate
 * origin is the same host:port. Reject anything else so a stray browser tab
 * can't drive the server.
 */
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

export const isOriginAllowed = (origin: string | null, expectedOrigin: string): boolean =>
  origin === null || origin === expectedOrigin;
