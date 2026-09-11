import test from "node:test";
import assert from "node:assert/strict";
import { createServer, get } from "node:http";
import { once } from "node:events";
import { createApp } from "../server.js";

async function listen(t, server) {
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  return `http://127.0.0.1:${server.address().port}`;
}
const messages = [{ sender: "user", text: "Hello" }];
const post = (url, body, extra = {}) => fetch(`${url}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages, ...body }), ...extra });

test("stream sends real deltas, completion, selected model and document context", async (t) => {
  let input;
  const provider = await listen(t, createServer(async (req, res) => {
    let raw = ""; for await (const chunk of req) raw += chunk; input = JSON.parse(raw);
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.end('data: {"type":"response.output_text.delta","delta":"Hello"}\n\ndata: {"type":"response.output_text.delta","delta":" world"}\n\ndata: {"type":"response.completed"}\n\ndata: [DONE]\n\n');
  }));
  const url = await listen(t, createServer(createApp({ OPENAI_API_KEY: "test", OPENAI_BASE_URL: provider })));
  const response = await post(url, { stream: true, document: { name: "note.txt", text: "A\nB" } });
  const events = (await response.text()).trim().split("\n").map(JSON.parse);
  assert.equal(response.status, 200);
  assert.equal(events[0].model, "gpt-5.2");
  assert.equal(events.filter((e) => e.type === "delta").map((e) => e.text).join(""), "Hello world");
  assert.equal(events.at(-1).type, "done");
  assert.equal(input.stream, true);
  assert.match(input.input[0].content, /\[L2\] B/);
  assert.match(input.instructions, /untrusted/);
});

test("premature or failed provider stream is never reported as complete", async (t) => {
  const provider = await listen(t, createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.end('data: {"type":"response.output_text.delta","delta":"partial"}\n\ndata: [DONE]\n\n');
  }));
  const url = await listen(t, createServer(createApp({ OPENAI_API_KEY: "test", OPENAI_BASE_URL: provider })));
  const response = await post(url, { stream: true });
  const text = await response.text();
  assert.match(text, /"type":"error"/);
  assert.doesNotMatch(text, /"type":"done"/);
});

test("client cancellation closes the upstream provider connection", { timeout: 5000 }, async (t) => {
  let disconnected;
  const closed = new Promise((resolve) => { disconnected = resolve; });
  const provider = await listen(t, createServer((_req, res) => {
    res.on("close", disconnected);
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    res.write('data: {"type":"response.output_text.delta","delta":"partial"}\n\n');
  }));
  const url = await listen(t, createServer(createApp({ OPENAI_API_KEY: "test", OPENAI_BASE_URL: provider })));
  const controller = new AbortController();
  const response = await post(url, { stream: true }, { signal: controller.signal });
  await response.body.getReader().read();
  controller.abort();
  await closed;
});

test("daily and minute request caps prevent additional provider calls", async (t) => {
  let calls = 0;
  const provider = await listen(t, createServer((_req, res) => {
    calls++; res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ object: "response", output: [{ type: "message", content: [{ type: "output_text", text: "hi" }] }] }));
  }));
  for (const caps of [{ CHAT_REQUESTS_PER_DAY: "1" }, { CHAT_REQUESTS_PER_MINUTE: "1" }]) {
    const url = await listen(t, createServer(createApp({ OPENAI_API_KEY: "test", OPENAI_BASE_URL: provider, ...caps })));
    assert.equal((await post(url, {})).status, 200);
    assert.equal((await post(url, {})).status, 429);
  }
  assert.equal(calls, 2);
});

test("untrusted browser origins and invalid documents are rejected", async (t) => {
  const url = await listen(t, createServer(createApp({})));
  assert.equal((await fetch(`${url}/api/models`, { headers: { Origin: "https://untrusted.example" } })).status, 403);
  const hostStatus = await new Promise((resolve, reject) => {
    get(`${url}/api/models`, { headers: { Host: "untrusted.example" } }, (response) => { response.resume(); resolve(response.statusCode); }).on("error", reject);
  });
  assert.equal(hostStatus, 403);
  assert.equal((await post(url, { document: { name: "a.pdf", text: "bad" } })).status, 400);
});
