"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  /** The currently active theme */
  theme: Theme
  /** Toggle between light and dark, persisting the choice */
  toggleTheme: () => void
  /** True when the active theme matches the system preference (no override set) */
  isSystemDefault: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const STORAGE_KEY = "stellar-raise-theme"

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with the theme already applied by the FOUC script so there is no
  // mismatch on the first render.  Falls back to "dark" on the server.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark"
    // FOUC script already set the class; read it back so we're in sync
    return document.documentElement.classList.contains("dark") ? "dark" : "light"
  })

  const [isSystemDefault, setIsSystemDefault] = useState<boolean>(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem(STORAGE_KEY) === null
  })

  // Keep the <html> class in sync whenever theme changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Listen for OS-level preference changes and update when the user hasn't
  // set an explicit override.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")

    const handleChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(STORAGE_KEY) === null) {
        const next: Theme = e.matches ? "dark" : "light"
        setTheme(next)
        setIsSystemDefault(true)
      }
    }

    mq.addEventListener("change", handleChange)
    return () => mq.removeEventListener("change", handleChange)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark"
      localStorage.setItem(STORAGE_KEY, next)
      setIsSystemDefault(false)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isSystemDefault }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>")
  }
  return ctx
}
