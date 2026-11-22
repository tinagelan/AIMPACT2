import { expect, test, type Page } from "@playwright/test";

async function signIn(page: Page, email: string) {
  await page.goto("/en/login");
  await page.getByRole("textbox").fill(email);
  await page.getByRole("button", { name: "Send me a sign-in link" }).click();
  await page.getByTestId("dev-login-link").click(); // dev mode exposes the magic link
  await expect(page).toHaveURL(/\/en\/app$/);
}

/** PRD scenario 2: questionnaire only, duplicate SaaS → 1,200 NIS/month P&L saving after unlock. */
test("duplicate SaaS: free report hides money, paid report shows the saving", async ({ page }) => {
  await signIn(page, `e2e-${Date.now()}@example.test`);

  await page.goto("/en/app/new");
  await page.locator('input[name="orgName"]').fill("E2E Agency");
  await page.locator('select[name="vertical"]').selectOption("agency");
  await page.getByRole("button", { name: "Start the diagnosis" }).click();
  await expect(page).toHaveURL(/wizard/);

  // Team
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByTestId("add-employee").click();
  const row = page.getByTestId("employee-row").first();
  await row.locator("select").first().selectOption("account_manager");

  // Software (step 4)
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  for (const [tool, cost] of [["asana", "1200"], ["monday", "1500"]] as const) {
    await page.getByTestId("add-software").click();
    const sw = page.getByTestId("software-row").last();
    await sw.locator("select").first().selectOption(tool);
    await sw.locator('input[type="number"]').nth(2).fill(cost);
    await sw.locator("select").last().selectOption("medium");
  }
  await page.waitForTimeout(1500); // autosave debounce

  await page.goto(page.url().replace(/\?.*$/, "") + "?step=5");
  await page.getByTestId("see-report").click();
  await expect(page).toHaveURL(/report/);

  // Free tier: hours visible, money locked
  await expect(page.getByTestId("tile-direct")).toHaveText("🔒");
  await expect(page.getByText(/Cancel Asana/)).toBeVisible();

  // Unlock (mock payment)
  await page.getByTestId("unlock-link").click();
  await page.getByTestId("buy").click();
  await expect(page).toHaveURL(/report/);
  await expect(page.getByTestId("tile-direct")).toHaveText("₪1,200/month");
});
