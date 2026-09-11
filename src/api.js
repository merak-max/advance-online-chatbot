const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");

// The server converts provider SSE events into a small newline-delimited protocol.
export async function streamReply(body, signal, onDelta) {
  const response = await fetch(`${apiBaseUrl}/api/chat`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, stream: true }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(50_000)]),
  });
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "AI request failed.");
    if (data.mode !== "openai" || typeof data.reply !== "string" || !data.reply.trim()) throw new Error("The backend returned no AI text.");
    onDelta(data.reply);
    return;
  }
  if (!response.ok || !type.includes("application/x-ndjson") || !response.body) throw new Error("Backend not reachable. Check the local server.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", completed = false;
  function parseLine(line) {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === "error") throw new Error(event.error || "Reply interrupted.");
    if (event.type === "delta" && typeof event.text === "string") onDelta(event.text);
    if (event.type === "done") completed = true;
  }
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) { parseLine(buffer.slice(0, newline)); buffer = buffer.slice(newline + 1); }
      if (done) break;
    }
    parseLine(buffer);
    if (!completed) throw new Error("The connection ended before the reply finished. Please retry.");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function requestApi(path, options = {}) {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      signal: AbortSignal.timeout(path === "/api/chat" ? 50_000 : 12_000),
    });
    if (!response.headers.get("content-type")?.includes("application/json")) {
      throw new Error("Backend not reachable. Start the local server, or configure VITE_API_BASE_URL for static hosting.");
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The request failed. Please try again.");
    return data;
  } catch (error) {
    if (error.name === "TimeoutError") throw new Error("The request timed out. Please try again.");
    if (error instanceof TypeError) throw new Error("Cannot reach the backend. Check that the server is running.");
    throw error;
  }
}
