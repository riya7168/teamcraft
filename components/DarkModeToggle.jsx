"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "teamcraft-theme";

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const enabled = window.localStorage.getItem(THEME_KEY) === "dark";
    document.documentElement.dataset.theme = enabled ? "dark" : "sage";
    setDark(enabled);
  }, []);

  const toggle = () => {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "sage";
    window.localStorage.setItem(THEME_KEY, next ? "dark" : "sage");
    setDark(next);
  };

  return <button className="dark-mode-toggle" type="button" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={dark} title={dark ? "Switch to light mode" : "Switch to dark mode"}>
    <span aria-hidden="true">{dark ? "☼" : "☾"}</span>{dark ? "Dark mode" : "Light mode"}
  </button>;
}
