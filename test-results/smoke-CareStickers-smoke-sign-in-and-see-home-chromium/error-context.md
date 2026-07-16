# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.ts >> CareStickers smoke >> sign in and see home
- Location: e2e\smoke.spec.ts:13:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /login/i })
    - locator resolved to <button type="submit" class="inline-flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50 disabled:pointer-events-none bg-brand-primary text-white shadow-lg shadow-brand-primary/20 active:scale-[0.98] min-h-[48px] px-5 text-base rounded-2xl w-full ">Login</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not stable
    - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - heading "Care Chart" [level=1] [ref=e5]
    - generic [ref=e7]: Admin User's Daily Goals
  - generic [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]:
        - text: Daily Progress
        - generic [ref=e11]: 0 / 0
      - generic [ref=e12]:
        - text: Streak
        - generic [ref=e13]:
          - img [ref=e14]
          - text: "0"
    - progressbar "Daily goal progress" [ref=e16]
  - main [ref=e17]:
    - generic [ref=e18]:
      - generic [ref=e19]:
        - img [ref=e21]
        - generic [ref=e23]:
          - generic [ref=e24]: Daily Challenge
          - generic [ref=e25]:
            - img [ref=e27]
            - generic [ref=e29]:
              - generic [ref=e30]: Gratitude moment
              - generic [ref=e31]: Complete this for extra pride!
      - generic [ref=e32]:
        - heading "My Goals" [level=3] [ref=e33]
        - group "Sort goals" [ref=e34]:
          - button "Newest" [pressed] [ref=e35]
          - button "A-Z" [ref=e36]
      - generic [ref=e37]:
        - generic [ref=e38]:
          - button "Gratitude moment. Tap to earn sticker." [ref=e39]:
            - generic [ref=e40]: Global
            - img [ref=e43]
            - generic [ref=e45]: Gratitude moment
            - generic [ref=e46]: Name one thing you are grateful for today
            - generic [ref=e47]: daily
          - button "Edit Gratitude moment" [ref=e48]:
            - img [ref=e50]
        - generic [ref=e53]:
          - button "Drink water. Tap to earn sticker." [ref=e54]:
            - generic [ref=e55]: Global
            - img [ref=e58]
            - generic [ref=e61]: Drink water
            - generic [ref=e62]: Stay hydrated throughout the day
            - generic [ref=e63]: daily
          - button "Edit Drink water" [ref=e64]:
            - img [ref=e66]
        - generic [ref=e69]:
          - button "Move your body. Tap to earn sticker." [ref=e70]:
            - generic [ref=e71]: Global
            - img [ref=e74]
            - generic [ref=e76]: Move your body
            - generic [ref=e77]: A little movement counts
            - generic [ref=e78]: daily
          - button "Edit Move your body" [ref=e79]:
            - img [ref=e81]
      - button "Share Progress" [ref=e84]:
        - img [ref=e85]
        - text: Share Progress
  - button "Add a new goal" [ref=e91]:
    - img [ref=e92]
  - navigation "Primary" [ref=e93]:
    - link "Home" [ref=e94] [cursor=pointer]:
      - /url: "#/"
      - img [ref=e95]
      - generic [ref=e98]: Home
    - link "Stats" [ref=e100] [cursor=pointer]:
      - /url: "#/stats"
      - img [ref=e101]
      - generic [ref=e103]: Stats
    - link "Social" [ref=e104] [cursor=pointer]:
      - /url: "#/social"
      - img [ref=e105]
      - generic [ref=e110]: Social
    - link "Admin" [ref=e111] [cursor=pointer]:
      - /url: "#/admin"
      - img [ref=e112]
      - generic [ref=e114]: Admin
    - link "Settings" [ref=e115] [cursor=pointer]:
      - /url: "#/settings"
      - img [ref=e116]
      - generic [ref=e119]: Settings
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | /**
  4  |  * Smoke test against a running dev server with seeded data.
  5  |  * Requires local Supabase (`npm run db:start`) or staging credentials in env.
  6  |  */
  7  | test.describe("CareStickers smoke", () => {
  8  |   test.skip(
  9  |     !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
  10 |     "Set E2E_EMAIL and E2E_PASSWORD to run authenticated smoke tests",
  11 |   );
  12 | 
  13 |   test("sign in and see home", async ({ page }) => {
  14 |     await page.goto("/");
  15 |     await page.getByPlaceholder("Email").fill(process.env.E2E_EMAIL!);
  16 |     await page.getByPlaceholder("Password").fill(process.env.E2E_PASSWORD!);
> 17 |     await page.getByRole("button", { name: /login/i }).click();
     |                                                        ^ Error: locator.click: Test timeout of 30000ms exceeded.
  18 |     await expect(page.getByText("Care Chart")).toBeVisible({ timeout: 15_000 });
  19 |   });
  20 | });
  21 | 
```