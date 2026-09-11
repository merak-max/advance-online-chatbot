import { useRef, useState } from "react";
import { exportBackup, parseBackup, MAX_BACKUP_BYTES } from "./backups.js";

export default function HistoryTools({ chats, onImport, disabled }) {
  const input = useRef(null);
  const [pending, setPending] = useState(null);
  const [notice, setNotice] = useState("");
  function download() {
    try {
      const url = URL.createObjectURL(new Blob([exportBackup(chats)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url; link.download = `advance-chat-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Backup downloaded. It contains conversations and attached text; keep it private.");
    } catch (error) { setNotice(error.message); }
  }
  async function choose(event) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setPending(null);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("Backup exceeds 5 MB.");
      const incoming = parseBackup(await file.text());
      if (!incoming.length) throw new Error("This backup has no conversations.");
      if (incoming.length + chats.length > 200) throw new Error("Import would exceed 200 chats. Export and remove unneeded chats first.");
      setPending(incoming); setNotice("");
    } catch (error) { setNotice(`Import failed: ${error.message}`); }
  }
  return <details className="history-tools">
    <summary>History backup</summary>
    <div className="utility-actions">
      <button className="ghost-action" disabled={disabled} onClick={download}>Export chats</button>
      <button className="ghost-action" disabled={disabled} onClick={() => input.current.click()}>Import chats</button>
      <input ref={input} type="file" accept=".json,application/json" aria-label="Import backup file" hidden onChange={choose} />
    </div>
    {pending && <div className="utility-notice">Add {pending.length} chats? Existing chats will stay unchanged. Re-importing creates copies.
      <button className="ghost-action" disabled={disabled} onClick={() => {
        if (pending.length + chats.length > 200) { setNotice("Import would exceed 200 chats."); setPending(null); return; }
        onImport(pending); setPending(null); setNotice("Chats imported as new copies.");
      }}>Confirm import</button>
      <button className="ghost-action" onClick={() => setPending(null)}>Cancel import</button>
    </div>}
    {notice && <p className="utility-notice" role="note">{notice}</p>}
  </details>;
}
