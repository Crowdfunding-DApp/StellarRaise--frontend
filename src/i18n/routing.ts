import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  // Supported locales — add more here as translations are added
  locales: ["en", "ar"],

  // Default locale (used when no prefix is present or locale is unknown)
  defaultLocale: "en",

  // Locale prefix strategy: "always" means /en/... and /ar/...
  // Switch to "as-needed" to omit the prefix for the default locale
  localePrefix: "always",
})
