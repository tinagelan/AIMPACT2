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
  await page.getByTestId("celebration").getByRole("button").click(); // first-diagnosis welcome

  // Team
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByTestId("add-employee").click();
  const row = page.getByTestId("employee-row").first();
  await row.locator("select").first().selectOption("account_manager");

  // Software (step 4)
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
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
  await expect(page.getByTestId("rec-title").filter({ hasText: /Cancel Asana/ })).toBeVisible();

  // Unlock (mock payment)
  await page.getByTestId("unlock-link").click();
  await page.getByTestId("buy").click();
  await expect(page).toHaveURL(/report/);
  await expect(page.getByTestId("tile-direct")).toHaveText("₪1,200/month");
});

/** Deleting a diagnosis: confirm dialog, animated removal, gone after reload, report URL 404s. */
test("delete a diagnosis from My diagnoses", async ({ page }) => {
  await signIn(page, `e2e-del-${Date.now()}@example.test`);
  for (const name of ["Keep Ltd", "Delete Ltd"]) {
    await page.goto("/en/app/new");
    await page.locator('input[name="orgName"]').fill(name);
    await page.getByRole("button", { name: "Start the diagnosis" }).click();
    await expect(page).toHaveURL(/wizard/);
  }
  const reportUrl = page.url().replace(/wizard.*$/, "report");

  await page.goto("/en/app");
  const cards = page.getByTestId("diagnosis-card");
  await expect(cards).toHaveCount(2);
  const target = cards.filter({ hasText: "Delete Ltd" });

  // Cancel keeps it
  await target.getByTestId("delete-diagnosis").click();
  await expect(page.getByTestId("delete-dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByTestId("delete-dialog")).toBeHidden();
  await expect(cards).toHaveCount(2);

  // Confirm deletes, with a visible deleting/removing phase and a toast
  await target.getByTestId("delete-diagnosis").click();
  await page.getByTestId("confirm-delete").click();
  await expect(page.getByTestId("delete-toast")).toContainText("Delete Ltd");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Keep Ltd");

  await page.reload();
  await expect(page.getByTestId("diagnosis-card")).toHaveCount(1);
  const res = await page.goto(reportUrl);
  expect(res?.status()).toBe(404);
});

/** Regression: rapid repeated submits of the new-diagnosis form create only one diagnosis. */
test("double-clicking Start creates a single diagnosis", async ({ page }) => {
  await signIn(page, `e2e-dbl-${Date.now()}@example.test`);
  await page.goto("/en/app/new");
  await page.locator('input[name="orgName"]').fill("Double Click Ltd");
  await page.getByTestId("submit").dblclick();
  await expect(page).toHaveURL(/wizard/);
  await page.goto("/en/app");
  await expect(page.getByTestId("diagnosis-card")).toHaveCount(1);
});

/** First diagnosis after sign-up shows confetti and a welcome message once; later diagnoses don't. */
test("new user sees a celebration on their first diagnosis only", async ({ page }) => {
  await signIn(page, `e2e-welcome-${Date.now()}@example.test`);

  await page.goto("/en/app/new");
  await page.locator('input[name="orgName"]').fill("Welcome Ltd");
  await page.getByRole("button", { name: "Start the diagnosis" }).click();
  await expect(page).toHaveURL(/wizard/);
  const dialog = page.getByTestId("celebration");
  await expect(dialog).toContainText("One step closer to career success");
  await page.waitForTimeout(1500); // past the wizard's autosave, whose server refresh must not close the dialog
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Let's go" }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeVisible();
  await expect(page.getByTestId("celebration")).toHaveCount(0);

  await page.goto("/en/app/new");
  await page.locator('input[name="orgName"]').fill("Second Ltd");
  await page.getByRole("button", { name: "Start the diagnosis" }).click();
  await expect(page).toHaveURL(/wizard/);
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeVisible();
  await expect(page.getByTestId("celebration")).toHaveCount(0);
});
