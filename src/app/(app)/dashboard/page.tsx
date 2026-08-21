import { Navbar } from "@/components/layout/Navbar"
import { CreatorDashboardClient } from "@/components/analytics/CreatorDashboardClient"

export const metadata = {
  title: "Creator Dashboard — Stellar Raise",
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <CreatorDashboardClient />
      </main>
    </div>
  )
}
