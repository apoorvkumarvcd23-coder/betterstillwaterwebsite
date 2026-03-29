const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");

const VIEWPORTS = [
  { label: "w320", width: 320, height: 800 },
  { label: "w375", width: 375, height: 812 },
  { label: "w480", width: 480, height: 900 },
  { label: "w640", width: 640, height: 960 },
  { label: "w768", width: 768, height: 1024 },
  { label: "w992", width: 992, height: 1100 },
  { label: "w1200", width: 1200, height: 1300 },
  { label: "w1360", width: 1360, height: 1400 },
];

const THEMES = ["dark", "light"];

const PUBLIC_ROUTES = [
  "/",
  "/about.html",
  "/auth.html",
  "/blog.html",
  "/careers.html",
  "/intake.html",
  "/medical-disclaimer.html",
  "/partners.html",
  "/privacy-policy.html",
  "/teams.html",
  "/terms-of-use.html",
];

const CUSTOMER_ROUTES = ["/", "/portal.html", "/intake.html"];
const ADMIN_ROUTES = ["/admin.html"];

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
];

const authDir = path.join(__dirname, ".auth");
const customerStatePath = path.join(authDir, "customer.json");
const adminStatePath = path.join(authDir, "admin.json");

function buildPhoneSeed() {
  const stamp = String(Date.now());
  return `9${stamp.slice(-9)}`;
}

async function applyTheme(page, theme) {
  await page.evaluate((chosenTheme) => {
    localStorage.setItem("stillwater_theme", chosenTheme);
    document.documentElement.setAttribute("data-theme", chosenTheme);
  }, theme);

  await expect
    .poll(async () =>
      page.evaluate(() => document.documentElement.getAttribute("data-theme")),
    )
    .toBe(theme);
}

async function runChecks(page, route, viewport, theme) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(route, { waitUntil: "networkidle" });
  await applyTheme(page, theme);

  const report = await page.evaluate(
    ({ overflowSelectors, borderSelectors, viewportWidth }) => {
      const doc = document.documentElement;
      const docOverflow = doc.scrollWidth - doc.clientWidth;

      const overflowNodes = [];
      overflowSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
          if (element.clientWidth === 0) return;
          if (element.scrollWidth > element.clientWidth + 1) {
            overflowNodes.push({
              selector,
              scrollWidth: element.scrollWidth,
              clientWidth: element.clientWidth,
            });
          }
        });
      });

      const boundsFailures = [];
      [".header", "nav", ".header-logo", "#authActions"].forEach((selector) => {
        const element = document.querySelector(selector);
        if (!element) return;
        const rect = element.getBoundingClientRect();
        if (rect.right > viewportWidth + 1 || rect.left < -1) {
          boundsFailures.push({ selector, left: rect.left, right: rect.right });
        }
      });

      const borderFailures = [];
      let borderedElements = 0;
      if (viewportWidth <= 767) {
        borderSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((element) => {
            if (element.clientWidth === 0 || element.clientHeight === 0) return;
            const styles = getComputedStyle(element);
            const widths = [
              parseFloat(styles.borderTopWidth) || 0,
              parseFloat(styles.borderRightWidth) || 0,
              parseFloat(styles.borderBottomWidth) || 0,
              parseFloat(styles.borderLeftWidth) || 0,
            ];
            const maxWidth = Math.max(...widths);
            if (maxWidth <= 0) return;
            borderedElements += 1;
            if (maxWidth < 0.75 || maxWidth > 2.5) {
              borderFailures.push({ selector, maxWidth });
            }
          });
        });
      }

      const gridFailures = [];
      if (viewportWidth <= 767) {
        document.querySelectorAll(".grid-2").forEach((grid) => {
          if (grid.clientWidth === 0) return;
          const value = getComputedStyle(grid).gridTemplateColumns;
          if (!value || value === "none") return;
          const columns = value.split(" ").filter(Boolean).length;
          if (columns > 1) {
            gridFailures.push({ value, columns });
          }
        });
      }

      return {
        hasViewportMeta: Boolean(document.querySelector('meta[name="viewport"]')),
        themeValue: doc.getAttribute("data-theme"),
        docOverflow,
        overflowNodes,
        boundsFailures,
        borderFailures,
        borderedElements,
        gridFailures,
      };
    },
    {
      overflowSelectors: OVERFLOW_SELECTORS,
      borderSelectors: BORDER_SELECTORS,
      viewportWidth: viewport.width,
    },
  );

  expect(report.hasViewportMeta).toBeTruthy();
  expect(report.themeValue).toBe(theme);
  expect(
    report.docOverflow,
    `${route} ${viewport.label} ${theme}: document horizontal overflow ${report.docOverflow}`,
  ).toBeLessThanOrEqual(1);
  expect(
    report.overflowNodes,
    `${route} ${viewport.label} ${theme}: overflowing containers ${JSON.stringify(report.overflowNodes)}`,
  ).toEqual([]);
  expect(
    report.boundsFailures,
    `${route} ${viewport.label} ${theme}: off-screen header/nav elements ${JSON.stringify(report.boundsFailures)}`,
  ).toEqual([]);
  expect(
    report.borderFailures,
    `${route} ${viewport.label} ${theme}: mobile border width issues ${JSON.stringify(report.borderFailures)}`,
  ).toEqual([]);
  expect(
    report.gridFailures,
    `${route} ${viewport.label} ${theme}: .grid-2 should collapse on mobile ${JSON.stringify(report.gridFailures)}`,
  ).toEqual([]);
}

async function runRouteMatrix(page, route) {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      await test.step(`${route} ${viewport.label} ${theme}`, async () => {
        await runChecks(page, route, viewport, theme);
      });
    }
  }
}

test.beforeAll(async ({ playwright, baseURL }) => {
  fs.mkdirSync(authDir, { recursive: true });

  const customerApi = await playwright.request.newContext({ baseURL });
  const customerPhone = process.env.TEST_CUSTOMER_PHONE || buildPhoneSeed();
  const customerPassword =
    process.env.TEST_CUSTOMER_PASSWORD || "StillwaterUser#123";

  let customerRes = await customerApi.post("/auth/login", {
    data: {
      phone: customerPhone,
      password: customerPassword,
      returnTo: "/portal.html",
    },
  });

  if (!customerRes.ok()) {
    const registerRes = await customerApi.post("/auth/register", {
      data: {
        phone: customerPhone,
        name: "Mobile QA Customer",
        password: customerPassword,
        returnTo: "/portal.html",
      },
    });

    expect(registerRes.ok(), "Customer auth setup failed").toBeTruthy();

    customerRes = await customerApi.post("/auth/login", {
      data: {
        phone: customerPhone,
        password: customerPassword,
        returnTo: "/portal.html",
      },
    });
  }

  expect(customerRes.ok(), "Customer login failed").toBeTruthy();
  await customerApi.storageState({ path: customerStatePath });
  await customerApi.dispose();

  const adminApi = await playwright.request.newContext({ baseURL });
  const adminPhone = process.env.TEST_ADMIN_PHONE || "9000000001";
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || "StillwaterAdmin#123";
  const adminRes = await adminApi.post("/auth/login", {
    data: {
      phone: adminPhone,
      password: adminPassword,
      returnTo: "/admin.html",
    },
  });

  expect(
    adminRes.ok(),
    "Admin login failed. Run npm run seed:test-admin before test:mobile-ui.",
  ).toBeTruthy();

  await adminApi.storageState({ path: adminStatePath });
  await adminApi.dispose();
});

test.describe("Mobile DOM QA - Logged Out", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`public matrix ${route}`, async ({ page }) => {
      await runRouteMatrix(page, route);
    });
  }
});

test.describe("Mobile DOM QA - Logged In Customer", () => {
  test.use({ storageState: customerStatePath });

  for (const route of CUSTOMER_ROUTES) {
    test(`customer matrix ${route}`, async ({ page }) => {
      await runRouteMatrix(page, route);
    });
  }
});

test.describe("Mobile DOM QA - Seeded Admin", () => {
  test.use({ storageState: adminStatePath });

  for (const route of ADMIN_ROUTES) {
    test(`admin matrix ${route}`, async ({ page }) => {
      await runRouteMatrix(page, route);
    });
  }
});
