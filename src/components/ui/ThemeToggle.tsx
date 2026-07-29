"use client"

import React from "react"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={!isDark}
      className={cn(
        // Base layout
        "relative inline-flex items-center justify-center h-10 w-10 rounded-xl",
        // Colour — uses semantic tokens so it adapts automatically
        "text-foreground/70 hover:text-foreground",
        "bg-transparent hover:bg-card",
        "border border-transparent hover:border-card-border",
        // Animation
        "transition-colors duration-200",
        // Focus ring
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      {/* Sun — visible in dark mode (click → go light) */}
      <Sun
        className={cn(
          "absolute w-5 h-5 transition-all duration-300",
          isDark
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-50 pointer-events-none"
        )}
        aria-hidden="true"
      />
      {/* Moon — visible in light mode (click → go dark) */}
      <Moon
        className={cn(
          "absolute w-5 h-5 transition-all duration-300",
          !isDark
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 rotate-90 scale-50 pointer-events-none"
        )}
        aria-hidden="true"
      />
    </button>
  )
}
