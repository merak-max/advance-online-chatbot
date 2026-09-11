import { test, expect } from "@playwright/test";

test("selection is sent, attributed and remembered across reload", async ({ page }) => {
  await page.goto("/advance-online-chatbot/");
  const selector = page.getByRole("combobox", { name: "Model", exact: true });
  await expect(selector).toHaveValue("local-test");
  await selector.selectOption("local-alternative");
  await page.getByRole("textbox", { name: "Message", exact: true }).fill("Which model?");
  const request = page.waitForRequest("**/api/chat");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  expect((await request).postDataJSON().model).toBe("local-alternative");
  await expect(page.locator(".reply-model")).toHaveText("· local-alternative");
  await page.reload();
  await expect(selector).toHaveValue("local-alternative");
  await expect(page.locator(".reply-model")).toHaveText("· local-alternative");
});

test("removed saved model falls back to approved default", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("advance-online-chatbot-model", "removed-model"));
  await page.goto("/advance-online-chatbot/");
  await expect(page.getByRole("combobox", { name: "Model", exact: true })).toHaveValue("local-test");
});

test("model list failure is recoverable", async ({ page }) => {
  await page.route("**/api/models", (route) => route.fulfill({ status: 503, json: { error: "Model list offline" } }));
  await page.goto("/advance-online-chatbot/");
  await expect(page.getByText("Model list offline", { exact: false })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Model", exact: true })).toBeDisabled();
  await page.unroute("**/api/models");
  await page.getByRole("button", { name: "Reload models" }).click();
  await expect(page.getByRole("combobox", { name: "Model", exact: true })).toHaveValue("local-test");
});

test("model cannot change while a reply is pending", async ({ page }) => {
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  await page.route("**/api/chat", async (route) => { await pending; await route.continue(); });
  await page.goto("/advance-online-chatbot/");
  const selector = page.getByRole("combobox", { name: "Model", exact: true });
  await expect(selector).toHaveValue("local-test");
  await page.getByRole("textbox", { name: "Message", exact: true }).fill("Pending");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(selector).toBeDisabled();
  release();
  await expect(page.locator(".reply-model")).toHaveText("· local-test");
  await expect(selector).toBeEnabled();
});
