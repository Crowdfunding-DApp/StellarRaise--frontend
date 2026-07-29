import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { WalletProvider } from "@/context/WalletContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AdminProvider } from "@/context/AdminContext";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Stellar Raise Interface",
  description: "The Gateway for Users to browse active campaigns and contribute to projects.",
};

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
`.trim();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // No className here — the FOUC script sets/clears "dark" before paint
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* FOUC prevention: runs synchronously before any paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${outfit.variable} antialiased font-sans`}>
        <ThemeProvider>
          <WalletProvider>
            <AdminProvider>
              {children}
            </AdminProvider>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
