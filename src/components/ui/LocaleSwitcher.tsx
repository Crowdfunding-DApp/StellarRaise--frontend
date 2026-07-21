"use client"

import React from "react"
import { useLocale } from "next-intl"
import { usePathname, useRouter } from "next/navigation"
import { routing } from "@/i18n/routing"
import { Globe } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * LocaleSwitcher displays a dropdown or toggle to switch between locales.
 * For simplicity, we cycle through locales on click (en <-> ar).
 * In production, you might replace this with a proper dropdown menu using Radix UI.
 */
export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const handleSwitch = () => {
    // Cycle to the next locale
    const currentIndex = routing.locales.indexOf(locale as "en" | "ar")
    const nextIndex = (currentIndex + 1) % routing.locales.length
    const nextLocale = routing.locales[nextIndex]

    // Replace the locale prefix in the current pathname
    // pathname is e.g. "/en/..." or "/ar/...", so we replace the first segment
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/")
    const newPath = `/${nextLocale}${pathWithoutLocale}`

    router.push(newPath)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleSwitch}
      aria-label={`Switch language (current: ${locale.toUpperCase()})`}
      title={`Switch language (current: ${locale.toUpperCase()})`}
    >
      <Globe className="w-4 h-4" aria-hidden="true" />
    </Button>
  )
}
