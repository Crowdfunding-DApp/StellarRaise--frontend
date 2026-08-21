import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { WalletProvider } from "@/context/WalletContext"
import { ThemeProvider } from "@/context/ThemeContext"
import { AdminProvider } from "@/context/AdminContext"
import messages from "../../../messages/en.json"
import "../globals.css"

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Stellar Raise Interface",
  description: "The Gateway for Users to browse active campaigns and contribute to projects.",
}

/**
 * Inline script executed before first paint to prevent flash of wrong theme.
 * Reads from localStorage first; falls back to OS preference.
 * Must be a plain string so Next.js can embed it as a raw <script>.
 */
const themeScript = `
(function () {
  var stored = null;
  try { stored = localStorage.getItem('stellar-raise-theme'); } catch (_) {}
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var isDark = stored ? stored === 'dark' : prefersDark;
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
})();
`.trim()

// This is the root layout for the (app) route group: the admin console and
// creator dashboard (admin/*, dashboard/*), which are excluded from
// next-intl's middleware and stay English-only. It's a sibling root to
// src/app/[locale]/layout.tsx, not an ancestor of it — route groups let both
// define their own <html>/<body> without nesting one inside the other.
// It still wraps children in NextIntlClientProvider (English messages) so
// shared components like Navbar that call useTranslations() work here too.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // No className here — the FOUC script sets/clears "dark" before paint
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* FOUC prevention: runs synchronously before any paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${outfit.variable} antialiased font-sans`}>
        <NextIntlClientProvider locale="en" messages={messages}>
          <ThemeProvider>
            <WalletProvider>
              <AdminProvider>{children}</AdminProvider>
            </WalletProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
