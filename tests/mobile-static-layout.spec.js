const path = require("path");
const { pathToFileURL } = require("url");
const { test, expect } = require("@playwright/test");

const ROOT = path.resolve(__dirname, "..");

const FILES = [
  "index.html",
  "admin.html",
  "auth.html",
  "blog.html",
  "careers.html",
  "care-path.html",
  "intake.html",
  "medical-disclaimer.html",
  "partners.html",
  "portal.html",
  "privacy-policy.html",
  "terms-of-use.html",
];

const VIEWPORTS = [
  { label: "w320", width: 320, height: 800 },
  { label: "w360", width: 360, height: 800 },
  { label: "w375", width: 375, height: 812 },
  { label: "w412", width: 412, height: 915 },
  { label: "w480", width: 480, height: 900 },
  { label: "w640", width: 640, height: 960 },
  { label: "w768", width: 768, height: 1024 },
];

const THEMES = ["dark", "light"];

const OVERFLOW_SELECTORS = [
  "body",
  ".container",
  ".grid-2",
  ".provider-row-grid",
  ".partners-grid",
  ".blog-grid",
  "footer",
  "header",
  "nav",
  "#authActions",
  ".admin-tabs",
  "table",
];

const BORDER_SELECTORS = [
  ".provider-card",
  ".partner-card",
  ".job-card",
  ".blog-card",
  ".blog-card-featured",
  ".pillar-card",
  ".who-visual-card",
  ".theme-toggle",
  ".admin-table th",
  ".admin-table td",
  ".portal-card",
  ".info-card",
  ".cookie-banner",
  ".settings-panel",
  ".cta-btn",
  ".nav-cta",
];

function toFileUrl(fileName) {
  return pathToFileURL(path.join(ROOT, fileName)).toString();
}

async function runLayoutCheck(page, fileName, viewport, theme) {
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });
  await page.goto(toFileUrl(fileName), { waitUntil: "domcontentloaded" });

  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("stillwater_theme", t);
  }, theme);

  await page.waitForTimeout(120);

  const report = await page.evaluate(
    ({ overflowSelectors, borderSelectors, viewportWidth }) => {
      const doc = document.documentElement;
      const docOverflow = doc.scrollWidth - doc.clientWidth;

      const overflow = [];
      overflowSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          if (el.clientWidth === 0) return;
          if (el.scrollWidth > el.clientWidth + 1) {
            overflow.push({
              selector,
              scrollWidth: el.scrollWidth,
              clientWidth: el.clientWidth,
            });
          }
        });
      });

      const offscreen = [];
      [".header", "nav", ".header-logo", "#authActions", ".nav-cta"].forEach(
        (selector) => {
          const el = document.querySelector(selector);
          if (!el) return;
          const rect = el.getBoundingClientRect();
          if (rect.right > viewportWidth + 1 || rect.left < -1) {
            offscreen.push({ selector, left: rect.left, right: rect.right });
          }
        },
      );

      const borderIssues = [];
      borderSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el) => {
          if (el.clientWidth === 0 || el.clientHeight === 0) return;
          const s = getComputedStyle(el);
          const widths = [
            parseFloat(s.borderTopWidth) || 0,
            parseFloat(s.borderRightWidth) || 0,
            parseFloat(s.borderBottomWidth) || 0,
            parseFloat(s.borderLeftWidth) || 0,
          ];
          const maxWidth = Math.max(...widths);
          if (maxWidth <= 0) return;
          if (maxWidth < 0.75 || maxWidth > 3) {
            borderIssues.push({ selector, maxWidth });
          }
        });
      });

      const gridIssues = [];
      if (viewportWidth <= 767) {
        document.querySelectorAll(".grid-2").forEach((grid) => {
          if (grid.clientWidth === 0) return;
          const columns = (getComputedStyle(grid).gridTemplateColumns || "")
            .split(" ")
            .filter(Boolean).length;
          if (columns > 1) {
            gridIssues.push({ columns });
          }
        });
      }

      return {
        docOverflow,
        overflow,
        offscreen,
        borderIssues,
        gridIssues,
      };
    },
    {
      overflowSelectors: OVERFLOW_SELECTORS,
      borderSelectors: BORDER_SELECTORS,
      viewportWidth: viewport.width,
    },
  );

  expect(
    report.docOverflow,
    `${fileName} ${viewport.label} ${theme}: document overflow ${report.docOverflow}`,
  ).toBeLessThanOrEqual(1);

  expect(
    report.overflow,
    `${fileName} ${viewport.label} ${theme}: element overflow ${JSON.stringify(report.overflow)}`,
  ).toEqual([]);

  expect(
    report.offscreen,
    `${fileName} ${viewport.label} ${theme}: offscreen header/nav controls ${JSON.stringify(report.offscreen)}`,
  ).toEqual([]);

  expect(
    report.borderIssues,
    `${fileName} ${viewport.label} ${theme}: border width issues ${JSON.stringify(report.borderIssues)}`,
  ).toEqual([]);

  expect(
    report.gridIssues,
    `${fileName} ${viewport.label} ${theme}: .grid-2 did not collapse on mobile ${JSON.stringify(report.gridIssues)}`,
  ).toEqual([]);
}

test.describe("Mobile Static Layout Matrix", () => {
  for (const fileName of FILES) {
    test(`static matrix ${fileName}`, async ({ page }) => {
      for (const viewport of VIEWPORTS) {
        for (const theme of THEMES) {
          await test.step(`${fileName} ${viewport.label} ${theme}`, async () => {
            await runLayoutCheck(page, fileName, viewport, theme);
          });
        }
      }
    });
  }
});
