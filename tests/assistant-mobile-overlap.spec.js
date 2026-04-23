const { test, expect } = require("@playwright/test");

test("assistant avoids custom bottom overlap in connected state on mobile", async ({ page }) => {
  const phone = `98${Date.now().toString().slice(-8)}`;
  const loginRes = await page.request.post("/auth/login", {
    form: {
      phone,
      password: "testpass123",
      returnTo: "/assistant.html",
    },
  });
  expect(loginRes.ok()).toBeTruthy();

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
        session_id: "mock-session-mobile",
      }),
    });
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/assistant.html?submissionId=mobile-test", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByText("Your Stillwater guide is ready. Speak when comfortable."),
  ).toBeVisible();

  await expect(page.locator(".overlay-bottom")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "End Session" })).toHaveCount(0);

  await expect(page.locator(".status-chip")).toBeVisible();
  await expect(page.locator("#meetingMeta")).toBeVisible();

  const viewport = page.viewportSize();
  const statusBox = await page.locator(".status-chip").boundingBox();
  const metaBox = await page.locator("#meetingMeta").boundingBox();

  expect(statusBox).toBeTruthy();
  expect(metaBox).toBeTruthy();

  expect(statusBox.x).toBeGreaterThanOrEqual(0);
  expect(statusBox.y).toBeGreaterThanOrEqual(0);
  expect(statusBox.x + statusBox.width).toBeLessThanOrEqual(viewport.width + 1);

  expect(metaBox.x).toBeGreaterThanOrEqual(0);
  expect(metaBox.y).toBeGreaterThanOrEqual(0);
  expect(metaBox.x + metaBox.width).toBeLessThanOrEqual(viewport.width + 1);
});
