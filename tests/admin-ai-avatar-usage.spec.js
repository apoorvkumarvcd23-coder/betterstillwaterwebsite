const { test, expect } = require("@playwright/test");

const ADMIN_PHONE = process.env.TEST_ADMIN_PHONE || "9000000001";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "StillwaterAdmin#123";

async function ensureAdminSession(page) {
  const loginRes = await page.request.post("/auth/login", {
    data: {
      phone: ADMIN_PHONE,
      password: ADMIN_PASSWORD,
      returnTo: "/admin.html",
    },
  });

  expect(
    loginRes.ok(),
    "Admin login failed. Run npm run seed:test-admin before this test.",
  ).toBeTruthy();
}

test("admin avatar time page shows intake-linked sessions", async ({ page }) => {
  await ensureAdminSession(page);
  await page.setViewportSize({ width: 1360, height: 1000 });

  await page.goto("/ai-avatar-usage.html", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/ai-avatar-usage\.html/);

  await expect(page.getByRole("heading", { name: "AI Avatar Time" })).toBeVisible();

  await expect.poll(async () => page.locator(".session-row").count()).toBeGreaterThan(0);

  const firstRow = page.locator(".session-row").first();
  await expect(firstRow.locator(".session-name")).toContainText(/\S+/);
  await expect(firstRow.locator(".duration-pill")).toContainText(/\S+/);
});