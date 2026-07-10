import { test, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const base = process.env.RESPONSIVE_BASE || "https://twivo.github.io/DCMorgesV2";
const outDir = "test-results/responsive-audit";

const pages = [
  ["/", "home"],
  ["/news/", "news"],
  ["/sda/", "sda"],
  ["/lmf/", "lmf"],
  ["/club/", "club"],
  ["/agenda/", "agenda"],
  ["/archives/", "archives"],
  ["/videos/", "videos"],
  ["/contact/", "contact"],
  ["/lmf-stats-live/", "lmf-stats-live"],
  ["/sources/archives-halloffame-lmf-championnat-htm/", "source-lmf"]
];

const viewports = [
  { name: "iphone-se", width: 320, height: 740 },
  { name: "mobile", width: 375, height: 812 },
  { name: "large-mobile", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "desktop", width: 1366, height: 768 },
  { name: "wide", width: 1920, height: 1080 }
];

const results = [];

test.beforeAll(async () => {
  await mkdir(outDir, { recursive: true });
});

for (const [path, slug] of pages) {
  for (const viewport of viewports) {
    test(`${slug} ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts?.ready);

      const audit = await page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        const height = window.innerHeight;
        const maxScroll = Math.max(
          document.documentElement.scrollWidth,
          document.body?.scrollWidth || 0
        );
        const offenders = [];

        for (const el of Array.from(document.body.querySelectorAll("*"))) {
          const style = window.getComputedStyle(el);
          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            Number(style.opacity) === 0 ||
            el.closest("script, style")
          ) {
            continue;
          }

          const rect = el.getBoundingClientRect();
          if (rect.width < 2 || rect.height < 2) continue;
          const outsideX = rect.left < -1 || rect.right > width + 1;
          const huge = rect.width > width + 1 && style.position !== "fixed";

          if (outsideX || huge) {
            offenders.push({
              tag: el.tagName.toLowerCase(),
              className: typeof el.className === "string" ? el.className.slice(0, 120) : "",
              text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120),
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              viewport: width,
              top: Math.round(rect.top),
              visibleNow: rect.bottom >= 0 && rect.top <= height
            });
          }
        }

        return {
          title: document.title,
          viewportWidth: width,
          scrollWidth: maxScroll,
          horizontalOverflow: maxScroll - width,
          offenders: offenders.slice(0, 10)
        };
      });

      const failed = audit.horizontalOverflow > 2 || audit.offenders.some((item) => item.visibleNow);
      const record = {
        path,
        slug,
        viewport,
        ...audit,
        failed
      };

      if (failed) {
        const screenshot = `${outDir}/${slug}-${viewport.name}.png`;
        await page.screenshot({ path: screenshot, fullPage: true });
        record.screenshot = screenshot;
      }

      results.push(record);
      await expect.soft(audit.horizontalOverflow, JSON.stringify(record, null, 2)).toBeLessThanOrEqual(2);
      await expect.soft(
        audit.offenders.filter((item) => item.visibleNow),
        JSON.stringify(record, null, 2)
      ).toHaveLength(0);
    });
  }
}

test.afterAll(async () => {
  await writeFile(`${outDir}/report.json`, JSON.stringify(results, null, 2));
});
