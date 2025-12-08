"use client";

import { useEffect, useState } from "react";

const themes = {
  dark: "dark",
  light: "light",
};

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState("dark");

  // Hydrate from localStorage
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const initial = stored === themes.light ? themes.light : themes.dark;
    applyTheme(initial);
  }, []);

  const applyTheme = (nextTheme) => {
    setTheme(nextTheme);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", nextTheme);
      document.body?.setAttribute("data-theme", nextTheme);
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("theme", nextTheme);
    }
  };

  const toggleTheme = () => {
    const next = theme === themes.dark ? themes.light : themes.dark;
    applyTheme(next);
  };

  const isLight = theme === themes.light;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors duration-200 ${
        isLight
          ? "border-sky-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400/50 hover:bg-emerald-500/20"
      } ${className}`}
      aria-label="Toggle theme"
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-base ${
          isLight ? "bg-sky-100 text-sky-700" : "bg-emerald-500/20 text-emerald-100"
        }`}
      >
        {isLight ? "☀️" : "🌙"}
      </span>
      <span>{isLight ? "Light" : "Dark"} mode</span>
    </button>
  );
}
