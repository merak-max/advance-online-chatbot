import { test, expect } from "@playwright/test";

async function open(page) {
  await page.goto("/advance-online-chatbot/");
  await expect(page.getByRole("combobox", { name: "Model", exact: true })).toHaveValue("local-test");
}
async function send(page, text) {
  await page.getByRole("textbox", { name: "Message", exact: true }).fill(text);
  await page.getByRole("button", { name: "Send", exact: true }).click();
}

test("stream is visible before completion, stop preserves partial and retry excludes it", async ({ page }) => {
  await open(page);
  await send(page, "slow-stream-test");
  await expect(page.locator(".streaming-text")).toContainText("Local test");
  await expect(page.getByRole("button", { name: "Stop generation" })).toBeVisible();
  await page.getByRole("button", { name: "Stop generation" }).click();
  await expect(page.getByRole("alert")).toContainText("Generation stopped");
  await expect(page.getByText("· Partial reply", { exact: false })).toBeVisible();
  const request = page.waitForRequest("**/api/chat");
  await page.getByRole("button", { name: "Retry last message" }).click();
  expect((await request).postDataJSON().messages).toEqual([{ sender: "user", text: "slow-stream-test" }]);
  await expect(page.getByText("Received 1 conversation messages.")).toBeVisible();
  await expect(page.locator(".message-row.user")).toHaveCount(1);
});

test("rename, export and confirmed additive import retain existing chats", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Rename chat" }).click();
  await page.getByRole("textbox", { name: "Chat name" }).fill("Learning notes");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("heading", { name: "Learning notes", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Learning notes", exact: true })).toBeVisible();
  await page.getByText("History backup", { exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export chats" }).click();
  const path = await (await download).path();
  await page.getByLabel("Import backup file").setInputFiles(path);
  await expect(page.getByRole("button", { name: "Confirm import" })).toBeVisible();
  await expect(page.locator(".chat-title")).toHaveCount(1);
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(page.locator(".chat-title")).toHaveCount(2);
  await page.getByLabel("Import backup file").setInputFiles({ name: "bad.json", mimeType: "application/json", buffer: Buffer.from('{"invalid":true}') });
  await expect(page.getByText("Import failed:", { exact: false })).toBeVisible();
  await expect(page.locator(".chat-title")).toHaveCount(2);
});

test("text attachment travels with question, previews lines and can be removed", async ({ page }) => {
  await open(page);
  await page.getByText("Attach a text document", { exact: true }).click();
  await page.getByLabel("Document file").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("Project: Advance\nLaunch: Friday") });
  await expect(page.getByLabel("Document preview")).toContainText("[L2] Launch: Friday");
  const request = page.waitForRequest("**/api/chat");
  await send(page, "When is launch?");
  expect((await request).postDataJSON().document.name).toBe("notes.txt");
  await expect(page.getByText("Received 2 conversation messages.")).toBeVisible();
  await page.getByRole("button", { name: "Remove document" }).click();
  await expect(page.getByLabel("Document preview")).toHaveCount(0);
  await page.getByLabel("Document file").setInputFiles({ name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("not supported") });
  await expect(page.getByRole("alert")).toContainText(".txt or .md");
});

test("stream failure keeps partial text and shows retry instead of success", async ({ page }) => {
  await open(page);
  await page.route("**/api/chat", (route) => route.fulfill({ contentType: "application/x-ndjson", body: '{"type":"delta","text":"Unfinished"}\n{"type":"error","error":"Provider disconnected"}\n' }));
  await send(page, "Fail stream");
  await expect(page.getByRole("alert")).toContainText("Provider disconnected");
  await expect(page.getByText("Unfinished", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry last message" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("failed");
});
