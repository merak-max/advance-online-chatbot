// Browser tests use only this local simulated provider, never paid credentials.
import { createServer } from "node:http";
import { once } from "node:events";
import { createApp } from "../../server.js";

const provider = createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw);
  const text = `**Local test provider — not a real AI reply.**\n\nReceived ${body.input.length} conversation messages.\n\n\`\`\`js\nconsole.log("hello");\n\`\`\``;
  if (body.stream) {
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    const slow = body.input.at(-1).content.includes("slow-stream-test");
    const chunks = [text.slice(0, 20), text.slice(20)];
    for (const delta of chunks) {
      if (res.destroyed) return;
      res.write(`data: ${JSON.stringify({ type: "response.output_text.delta", delta })}\n\n`);
      if (slow) await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    if (!res.destroyed) res.end(`data: ${JSON.stringify({ type: "response.completed", response: { status: "completed" } })}\n\ndata: [DONE]\n\n`);
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ object: "response", output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text }] }] }));
});
provider.listen(0, "127.0.0.1");
await once(provider, "listening");
const server = createApp({ OPENAI_API_KEY: "local-test-only", OPENAI_BASE_URL: `http://127.0.0.1:${provider.address().port}/v1`, OPENAI_MODEL: "local-test", OPENAI_ALLOWED_MODELS: "local-test,local-alternative", CHAT_REQUESTS_PER_MINUTE: "1000", CHAT_REQUESTS_PER_DAY: "1000" })
  .listen(18788, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(); server.closeAllConnections();
    provider.close(); provider.closeAllConnections();
  });
}
