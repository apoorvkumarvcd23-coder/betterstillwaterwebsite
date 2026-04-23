const { test, expect } = require("@playwright/test");

test("intake submission routes to assistant and reaches guide-ready state", async ({ page }) => {
  const phone = `99${Date.now().toString().slice(-8)}`;
  const loginRes = await page.request.post("/auth/login", {
    form: {
      phone,
      password: "testpass123",
      returnTo: "/intake.html",
    },
  });
  expect(loginRes.ok()).toBeTruthy();

  let requestedAgentId = null;

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
    const payload = route.request().postDataJSON() || {};
    requestedAgentId = payload.agentId || null;

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
  await expect(page).toHaveURL(/\/care-path\.html/);

  await expect(page.getByRole("button", { name: "Connect with AI Healer" })).toBeVisible();
  await expect(page.locator("#providersPanel")).toBeHidden();
  await page.getByRole("button", { name: "Connect with AI Healer" }).first().click();

  await expect(page).toHaveURL(/\/ai-healer-choice\.html/);
  await expect(page.getByRole("button", { name: "Continue with Sadhguru" })).toBeVisible();
  await page.getByRole("button", { name: "Continue with Sadhguru" }).click();

  await expect(page).toHaveURL(/\/assistant\.html/);
  await expect(page).toHaveURL(/agentId=agent_6194e41857189803/);
  await expect.poll(() => requestedAgentId).toBe("agent_6194e41857189803");

  await expect(page.locator('source[src="visionBGvideo.mp4"]')).toHaveCount(0);
  await expect(page.locator(".overlay-bottom")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "End Session" })).toHaveCount(0);

  await expect(
    page.getByText("Your Stillwater guide is ready. Speak when comfortable."),
  ).toBeVisible();

  await expect(page.locator("#meetingMeta")).toBeVisible();
});
