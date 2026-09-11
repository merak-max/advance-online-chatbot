import { useState } from "react";

export default function ChatTitle({ title, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  if (!editing) return <div className="chat-heading"><h1>{title}</h1><button className="ghost-action" onClick={() => { setDraft(title); setEditing(true); }}>Rename chat</button></div>;
  return <form className="rename-form" onSubmit={(event) => { event.preventDefault(); if (draft.trim()) { onRename(draft.trim()); setEditing(false); } }}>
    <input autoFocus aria-label="Chat name" maxLength={100} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setEditing(false); }} />
    <button className="ghost-action" disabled={!draft.trim()}>Save name</button>
    <button className="ghost-action" type="button" onClick={() => setEditing(false)}>Cancel rename</button>
  </form>;
}
