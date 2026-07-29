import { Navbar } from "@/components/layout/Navbar"
import { CreatorCampaignDashboard } from "@/components/analytics/CreatorCampaignDashboard"

interface CampaignDashboardPageProps {
  params: Promise<{ campaignId: string }>
}

export async function generateMetadata({
  params,
}: CampaignDashboardPageProps) {
  const { campaignId } = await params
  return {
    title: `Campaign #${campaignId} — Creator Dashboard — Stellar Raise`,
  }
}

export default async function CampaignDashboardPage({
  params,
}: CampaignDashboardPageProps) {
  const { campaignId } = await params
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <CreatorCampaignDashboard campaignId={campaignId} />
      </main>
    </div>
  )
}
