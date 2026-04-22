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

test("admin intake review loads the live feed and drawer", async ({ page }) => {
  await ensureAdminSession(page);

  await page.goto("/admin.html", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/admin\.html/);

  await expect.poll(async () => {
    const value = await page.locator("#metricVisibleCount").textContent();
    return Number(value || 0);
  }).toBeGreaterThan(0);

  await expect.poll(async () => page.locator(".submission-row").count()).toBeGreaterThan(0);

  const rows = page.locator(".submission-row");
  const rowCount = await rows.count();
  const targetRow = rows.nth(rowCount > 1 ? 1 : 0);
  const targetId = await targetRow.getAttribute("data-submission-id");
  const targetName = (await targetRow.locator(".submission-name").innerText()).trim();

  await targetRow.click();

  await expect(targetRow).toHaveClass(/selected/);
  await expect(page.locator("#drawerRoot .drawer-heading")).toContainText(targetName);
  await expect(page.locator("#drawerRoot")).toContainText("Phone history");
  await expect(page.locator("#drawerRoot")).toContainText("Linked activity");
  await expect(page.getByRole("link", { name: "Open care path" })).toHaveAttribute(
    "href",
    new RegExp(`submissionId=${targetId}`),
  );
});