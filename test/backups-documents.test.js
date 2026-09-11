import test from "node:test";
import assert from "node:assert/strict";
import { parseBackup, exportBackup } from "../src/backups.js";
import { validateDocument, documentContext } from "../shared/document.js";
import { createStarterChat, messagesForApi } from "../src/chat-state.js";

test("backup roundtrip preserves content but imports independent IDs", () => {
  const chat = { ...createStarterChat(), title: "My chat", document: { name: "notes.md", text: "hello" } };
  const text = exportBackup([chat]);
  const [copy] = parseBackup(text);
  assert.notEqual(copy.id, chat.id);
  assert.deepEqual(copy.messages, chat.messages);
  assert.deepEqual(copy.document, chat.document);
});

test("invalid/oversized backups rejected and extraneous fields stripped", () => {
  for (const text of ["broken", "{}", '{"format":"advance-online-chatbot","version":2,"chats":[]}', "x".repeat(5 * 1024 * 1024 + 1)]) assert.throws(() => parseBackup(text));
  const data = { format: "advance-online-chatbot", version: 1, chats: [{ title: "Test", messages: [{ sender: "bot", text: "hi", model: { malicious: true }, html: "bad" }], secret: "unused" }] };
  const [chat] = parseBackup(JSON.stringify(data));
  assert.equal(chat.secret, undefined);
  assert.equal(chat.messages[0].model, undefined);
  assert.equal(chat.messages[0].html, undefined);
  data.chats[0].messages = [null];
  assert.throws(() => parseBackup(JSON.stringify(data)));
});

test("text documents validate names, sizes, binary data and line limits", () => {
  assert.equal(validateDocument({ name: "notes.md", text: "Hello\nWorld" }), null);
  assert.match(documentContext({ name: "notes.md", text: "Hello\nWorld" }), /\[L2\] World/);
  for (const doc of [{ name: "file.pdf", text: "hi" }, { name: "a.txt", text: "\0binary" }, { name: "a.txt", text: " " }, { name: "a.md", text: "x".repeat(24001) }, { name: "a.md", text: "x\n".repeat(1001) }]) assert.ok(validateDocument(doc));
});

test("partial replies are kept out of follow-up context", () => {
  const user = { sender: "user", text: "Question" };
  assert.deepEqual(messagesForApi([user, { sender: "bot", text: "partial", kind: "partial" }]), [user]);
});
