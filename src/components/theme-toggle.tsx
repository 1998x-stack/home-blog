"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const saved = localStorage.getItem("home-blog-theme");
    const initial: Theme = saved === "dark" || saved === "light" ? saved :
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = initial;
    // External synchronization after mounting is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("home-blog-theme", next);
    setTheme(next);
  }
  return <button type="button" className="icon-button" onClick={toggle} aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"} title="切换主题">{theme === "dark" ? "☀" : "☾"}</button>;
}
