import { useRef, useState } from "react";
import { MAX_DOCUMENT_BYTES, validateDocument } from "../shared/document.js";

export default function DocumentPanel({ document, onChange, disabled }) {
  const input = useRef(null);
  const [error, setError] = useState("");
  async function choose(event) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    try {
      if (file.size > MAX_DOCUMENT_BYTES) throw new Error("Choose a text file smaller than 64 KB.");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      const candidate = { name: file.name, text };
      const validation = validateDocument(candidate);
      if (validation) throw new Error(validation);
      onChange(candidate); setError("");
    } catch (err) { setError(err.message); }
  }
  return <details className="document-panel">
    <summary>{document ? `Document: ${document.name}` : "Attach a text document"}</summary>
    <p className="utility-notice">.txt or .md · 64 KB / 24,000 characters / 1,000 lines maximum. Stored in this browser and sent to the selected AI with each question until removed. No PDF/OCR support.</p>
    <div className="utility-actions">
      <button className="ghost-action" disabled={disabled} onClick={() => input.current.click()}>{document ? "Replace document" : "Choose document"}</button>
      {document && <button className="ghost-action" disabled={disabled} onClick={() => onChange(null)}>Remove document</button>}
      <input ref={input} type="file" accept=".txt,.md,text/plain,text/markdown" aria-label="Document file" hidden onChange={choose} />
    </div>
    {error && <p className="model-error" role="alert">{error}</p>}
    {document && <pre className="document-preview" aria-label="Document preview">{document.text.split(/\r?\n/).map((line, i) => `[L${i + 1}] ${line}`).join("\n")}</pre>}
  </details>;
}
