import { test, expect } from "@playwright/test";

/**
 * Smoke test against a running dev server with seeded data.
 * Requires local Supabase (`npm run db:start`) or staging credentials in env.
 */
test.describe("CareStickers smoke", () => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    "Set E2E_EMAIL and E2E_PASSWORD to run authenticated smoke tests",
  );

  test("sign in and see home", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder("Email").fill(process.env.E2E_EMAIL!);
    await page.getByPlaceholder("Password").fill(process.env.E2E_PASSWORD!);
    await page.getByRole("button", { name: /login/i }).click();
    await expect(page.getByText("Care Chart")).toBeVisible({ timeout: 15_000 });
  });
});
