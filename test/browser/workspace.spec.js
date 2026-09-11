import { test, expect } from "@playwright/test";

test("theme follows system preference then remembers the user's choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/advance-online-chatbot/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark theme" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("theme still toggles when storage is unavailable", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error("Storage unavailable"); };
  });
  await page.goto("/advance-online-chatbot/");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

for (const theme of ["light", "dark"]) {
  for (const width of [320, 1440]) {
    test(`${theme} workspace at ${width}px`, async ({ page }) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.emulateMedia({ colorScheme: theme });
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/advance-online-chatbot/");
      await expect(page.getByRole("heading", { name: "What will you explore today?" })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      await expect(page.locator(".message-row")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const box = await page.getByRole("textbox", { name: "Message", exact: true }).boundingBox();
      expect(box.y + box.height).toBeLessThanOrEqual(900);
      await page.screenshot({ path: test.info().outputPath(`workspace-${theme}-${width}.png`) });
      await page.getByRole("button", { name: "Explain React like I am 12", exact: true }).click();
      await expect(page.getByText("Received 1 conversation messages.")).toBeVisible();
      await expect(page.getByRole("heading", { name: "What will you explore today?" })).toHaveCount(0);
      await expect(page.locator("pre code")).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}
