// This root layout is intentionally minimal.
// next-intl middleware redirects all root-level requests to the correct
// locale prefix (/en or /ar), so this layout is only ever rendered for
// paths that don't match any locale — e.g. the not-found boundary.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
