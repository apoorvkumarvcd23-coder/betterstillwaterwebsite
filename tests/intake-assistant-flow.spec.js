const { test, expect } = require("@playwright/test");

test("intake submission routes to assistant and reaches guide-ready state", async ({ page }) => {
  await page.route("https://unpkg.com/@daily-co/daily-js", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `
        window.DailyIframe = {
          createFrame: () => {
            const handlers = {};
            return {
              on(eventName, callback) {
                handlers[eventName] = callback;
              },
              async join() {
                if (handlers["joined-meeting"]) {
                  handlers["joined-meeting"]({});
                }
                if (handlers["app-message"]) {
                  handlers["app-message"]({ data: { type: "bot_ready" } });
                }
              },
              async leave() {},
              destroy() {},
            };
          },
        };
      `,
    });
  });

  await page.route("**/api/lemonslice/rooms", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        room_url: "https://example.daily.co/mock-room",
        token: "mock-token",
        image_url: "https://example.com/agent.png",
        session_id: "mock-session",
      }),
    });
  });

  await page.goto("/intake.html", { waitUntil: "domcontentloaded" });

  await page.getByLabel("1. Name").fill("Test User");
  await page.getByLabel("2. Phone Number").fill("9999999999");
  await page.getByLabel("3. Age").fill("35");
  await page.getByLabel("Diabetes").check();

  await page.getByRole("button", { name: "Submit Wellness Assessment" }).click();

  await expect(page.getByText("Assessment saved. Preparing your guided session...")).toBeVisible();
  await expect(page).toHaveURL(/\/assistant\.html/);

  await expect(
    page.getByText("Your Stillwater guide is ready. Speak when comfortable."),
  ).toBeVisible();
});
