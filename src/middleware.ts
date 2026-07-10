import { defineMiddleware } from "astro:middleware";
import { createHash, timingSafeEqual } from "node:crypto";

const protectedPrefixes = ["/admin", "/api"];
const adminUser = import.meta.env.ADMIN_USER;
const adminPassword = import.meta.env.ADMIN_PASSWORD;
const authEnabled = Boolean(adminUser && adminPassword);

// Constant-time string compare: hash both sides so lengths never leak and the
// comparison itself doesn't short-circuit (mitigates timing attacks).
const safeEqual = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

const unauthorized = () =>
  new Response("Authentification requise.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="DC Morges Admin"',
      "content-type": "text/plain; charset=utf-8"
    }
  });

const forbidden = () =>
  new Response("Requête refusée.", {
    status: 403,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });

const notConfigured = () =>
  new Response(
    "Administration désactivée : définissez ADMIN_USER et ADMIN_PASSWORD dans .env.local.",
    { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
  );

const decodeBasicAuth = (header: string | null) => {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator === -1) return null;
    return {
      user: decoded.slice(0, separator),
      password: decoded.slice(separator + 1)
    };
  } catch {
    return null;
  }
};

const writeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const isSameOriginWrite = (request: Request, url: URL) => {
  if (!writeMethods.has(request.method)) return true;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === url.origin;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === url.origin;
    } catch {
      return false;
    }
  }

  return false;
};

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  if (!protectedPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
    return next();
  }

  // Fail closed: if no credentials are configured, deny access to the protected
  // area rather than leaving it wide open.
  if (!authEnabled) {
    return notConfigured();
  }

  if (!isSameOriginWrite(request, url)) {
    return forbidden();
  }

  const credentials = decodeBasicAuth(request.headers.get("authorization"));
  if (credentials && safeEqual(credentials.user, adminUser) && safeEqual(credentials.password, adminPassword)) {
    return next();
  }

  return unauthorized();
});
