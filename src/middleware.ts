import { defineMiddleware } from "astro:middleware";

const protectedPrefixes = ["/admin", "/api"];
const adminUser = import.meta.env.ADMIN_USER;
const adminPassword = import.meta.env.ADMIN_PASSWORD;
const authEnabled = Boolean(adminUser && adminPassword);

const unauthorized = () =>
  new Response("Authentification requise.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="DC Morges Admin"',
      "content-type": "text/plain; charset=utf-8"
    }
  });

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

export const onRequest = defineMiddleware(async ({ request, url }, next) => {
  if (!authEnabled || !protectedPrefixes.some((prefix) => url.pathname.startsWith(prefix))) {
    return next();
  }

  const credentials = decodeBasicAuth(request.headers.get("authorization"));
  if (credentials?.user === adminUser && credentials.password === adminPassword) {
    return next();
  }

  return unauthorized();
});
