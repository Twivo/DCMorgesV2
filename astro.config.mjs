import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";

// Public domain used for canonical URLs and the sitemap.
// Override at build time with SITE_URL=https://mon-domaine.ch pnpm build
const site = process.env.SITE_URL || "https://www.dcmorges.ch";

export default defineConfig({
  site,
  // Public pages are prerendered to static HTML (dist/client) and are the only
  // thing that should be published online. The admin + API opt into on-demand
  // rendering (dist/server) and must stay LOCAL — never expose them publicly.
  output: "static",
  adapter: node({ mode: "standalone" }),
  integrations: [
    sitemap({
      // Never advertise the admin in the sitemap.
      filter: (page) => !page.includes("/admin") && !page.includes("/lmf-stats-live")
    })
  ]
});
