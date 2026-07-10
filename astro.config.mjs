import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";

// Public domain used for canonical URLs and the sitemap.
// Override at build time with SITE_URL=https://mon-domaine.ch pnpm build
const site = process.env.SITE_URL || "https://www.dcmorges.ch";
const rawBase = process.env.BASE_PATH?.trim() || "";
const base = rawBase ? `/${rawBase.replace(/^\/+|\/+$/g, "")}` : undefined;

export default defineConfig({
  site,
  base,
  // Public pages are prerendered to static HTML (dist/client) and are the only
  // thing that should be published online. The admin + API opt into on-demand
  // rendering (dist/server) and must stay LOCAL — never expose them publicly.
  output: "static",
  adapter: node({ mode: "standalone" }),
  // Hide the Astro dev toolbar (the black oval that appears at the bottom in dev).
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
      // Never advertise the admin in the sitemap.
      filter: (page) => !page.includes("/admin") && !page.includes("/lmf-stats-live")
    })
  ]
});
