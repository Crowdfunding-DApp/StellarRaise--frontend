import type { Metadata } from "next"
import { Outfit } from "next/font/google"
import { WalletProvider } from "@/context/WalletContext"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { isRtlLocale } from "@/lib/format"
import { notFound } from "next/navigation"
import { routing } from "@/i18n/routing"
import "../globals.css"

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Stellar Raise Interface",
  description:
    "The Gateway for Users to browse active campaigns and contribute to projects.",
}

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params

  // Validate locale — return 404 for unknown locale segments
  if (!routing.locales.includes(locale as "en" | "ar")) {
    notFound()
  }

  // Load messages for this locale on the server
  const messages = await getMessages()
  const dir = isRtlLocale(locale) ? "rtl" : "ltr"

  return (
    <html lang={locale} dir={dir} className="dark">
      <body className={`${outfit.variable} antialiased font-sans`}>
        <NextIntlClientProvider messages={messages}>
          <WalletProvider>{children}</WalletProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
