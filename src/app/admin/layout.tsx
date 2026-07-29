import React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Admin Console — Stellar Raise",
  robots: "noindex, nofollow",
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
