import { validateDocument } from "../shared/document.js";

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export function parseBackup(text) {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error("Backup exceeds 5 MB.");
  const data = JSON.parse(text);
  if (data?.format !== "advance-online-chatbot" || data.version !== 1 || !Array.isArray(data.chats)
    || data.chats.length > 200) throw new Error("Choose a version 1 Advance Online Chatbot backup (up to 200 chats).");
  return data.chats.map((chat) => {
    if (!chat || typeof chat.title !== "string" || !chat.title.trim() || chat.title.length > 100
      || !Array.isArray(chat.messages) || chat.messages.length > 1000 || validateDocument(chat.document)) throw new Error("Backup contains an invalid conversation.");
    const messages = chat.messages.map((m) => {
      if (!m || !["user", "bot"].includes(m.sender) || typeof m.text !== "string" || m.text.length > 100000) throw new Error("Backup contains an invalid message.");
      return { sender: m.sender, text: m.text,
        ...(["notice", "error", "partial", "message"].includes(m.kind) ? { kind: m.kind } : {}),
        ...(typeof m.model === "string" && m.model.length < 200 ? { model: m.model } : {}),
        ...(typeof m.documentName === "string" && m.documentName.length <= 180 ? { documentName: m.documentName } : {}),
      };
    });
    return { id: crypto.randomUUID(), title: chat.title.trim(), messages,
      ...(chat.document ? { document: { name: chat.document.name, text: chat.document.text } } : {}),
    };
  });
}

export function exportBackup(chats) {
  const text = JSON.stringify({ format: "advance-online-chatbot", version: 1, exportedAt: new Date().toISOString(), chats }, null, 2);
  // Ensure every export is also accepted by the import validator.
  parseBackup(text);
  return text;
}
