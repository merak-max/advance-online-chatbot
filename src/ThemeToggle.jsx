import { useEffect, useState } from "react";

const THEME_KEY = "advance-online-chatbot-theme";

function initialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* Storage may be disabled; the toggle still works for this session. */ }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* Session-only theme. */ }
  }, [theme]);

  return <button className="theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
    <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    {theme === "dark" ? "Light mode" : "Dark mode"}
  </button>;
}
