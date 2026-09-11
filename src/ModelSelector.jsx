import { useEffect, useState } from "react";
import { requestApi } from "./api.js";

const STORAGE_KEY = "advance-online-chatbot-model";

export default function ModelSelector({ value, onChange, disabled }) {
  const [models, setModels] = useState([]);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError("");
    requestApi("/api/models").then((data) => {
      if (!Array.isArray(data.models) || !data.models.length || !data.models.every((id) => typeof id === "string" && id.trim()) || !data.models.includes(data.defaultModel)) {
        throw new Error("The backend returned an invalid model list.");
      }
      if (cancelled) return;
      let saved;
      try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* Session-only selection. */ }
      setModels(data.models);
      onChange(data.models.includes(saved) ? saved : data.defaultModel);
    }).catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [attempt, onChange]);

  function selectModel(event) {
    const model = event.target.value;
    onChange(model);
    try { localStorage.setItem(STORAGE_KEY, model); } catch { /* Session-only selection. */ }
  }

  return <div className="model-control">
    <label className="model-label">Model
      <select value={value} onChange={selectModel} disabled={disabled || models.length === 0}>
        {!models.length && <option value="">{error ? "Models unavailable" : "Loading models…"}</option>}
        {models.map((model) => <option key={model} value={model}>{model}</option>)}
      </select>
    </label>
    {error ? <div className="model-error" role="alert">{error} <button className="ghost-action" onClick={() => setAttempt((n) => n + 1)}>Reload models</button></div>
      : <small>Applies to your next reply. Availability and cost depend on the provider.</small>}
  </div>;
}
