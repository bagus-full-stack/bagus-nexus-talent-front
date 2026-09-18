"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useIsClient } from "@/hooks/use-is-client";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const setStoreTheme = useAppStore((state) => state.setTheme);
  const mounted = useIsClient();

  const toggleTheme = () => {
    const nextTheme = (theme === "dark" || resolvedTheme === "dark") ? "light" : "dark";
    setTheme(nextTheme);
    setStoreTheme(nextTheme);
  };

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        id="theme-toggle-loading"
        className="h-9 w-9 rounded-lg"
        aria-label="Changer de thème"
      >
        <Sun className="h-4 w-4 opacity-50" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark" || theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      id="theme-toggle-btn"
      onClick={toggleTheme}
      className="h-9 w-9 rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
      title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      aria-label="Basculer le mode sombre/clair"
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform rotate-0 scale-100" />
      ) : (
        <Moon className="h-4 w-4 text-neutral-700 transition-transform rotate-0 scale-100" />
      )}
    </Button>
  );
}
