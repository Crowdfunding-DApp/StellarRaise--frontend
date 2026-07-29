"use client"

import React, { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useTranslations, useLocale } from "next-intl"
import { Navbar } from "@/components/layout/Navbar"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { CountdownTimer } from "@/components/ui/CountdownTimer"
import { Button } from "@/components/ui/button"
import { PledgeModal } from "@/components/ui/PledgeModal"
import { RefundModal } from "@/components/ui/RefundModal"
import { WithdrawModal } from "@/components/ui/WithdrawModal"
import { VirtualizedCampaignGrid } from "@/components/VirtualizedCampaignGrid"
import type { Campaign } from "@/lib/soroban"
import { useWallet } from "@/context/WalletContext"
import { useFeatureFlag } from "@/hooks/useFeatureFlag"
import {
  getRemainingBalance,
  getWithdrawalState,
  isWithinGracePeriod,
  getGracePeriodEndsAt,
} from "@/lib/withdrawal"
import { formatXlm } from "@/lib/format"
import { ChevronDown, ChevronUp } from "lucide-react"

// @stellar/stellar-sdk is a large dependency only needed once we actually
// fetch campaigns — dynamic import keeps it out of the initial JS bundle
// instead of shipping it on every page load regardless of whether the
// contract call ever happens.
async function loadCampaigns(walletAddress?: string | null): Promise<Campaign[]> {
  const { getCampaigns } = await import("@/lib/soroban")
  return getCampaigns(walletAddress)
}

// ActivityFeed pulls in @stellar/stellar-sdk's Horizon client for on-chain
// history queries. It's only ever shown after a user expands a campaign's
// "Live activity" toggle, so load it lazily instead of shipping that weight
// on every initial page load.
const ActivityFeed = dynamic(
  () => import("@/components/ui/ActivityFeed").then((m) => m.ActivityFeed),
  { ssr: false }
)

function CampaignSkeleton() {
  return (
    <div className="flex flex-col bg-card border border-card-border rounded-2xl overflow-hidden animate-pulse">
      <div className="h-48 bg-card-border" />
      <div className="p-6 flex-1 flex flex-col gap-4">
        <div className="h-5 bg-card-border rounded w-3/4" />
        <div className="h-4 bg-card-border rounded w-full" />
        <div className="h-4 bg-card-border rounded w-2/3 flex-1" />
        <div className="space-y-3">
          <div className="flex justify-between">
            <div className="h-3 bg-card-border rounded w-24" />
            <div className="h-3 bg-card-border rounded w-20" />
          </div>
          <div className="h-3 bg-card-border rounded-full w-full" />
          <div className="h-10 bg-card-border rounded-xl w-full" />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const t = useTranslations("Home")
  const locale = useLocale()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [pledgeModalKey, setPledgeModalKey] = useState(0)
  const [selectedRefundCampaign, setSelectedRefundCampaign] = useState<Campaign | null>(null)
  const [refundModalKey, setRefundModalKey] = useState(0)
  const [selectedWithdrawCampaign, setSelectedWithdrawCampaign] = useState<Campaign | null>(null)
  const [withdrawModalKey, setWithdrawModalKey] = useState(0)
  /** Campaign IDs with their activity feed currently expanded. */
  const [expandedFeeds, setExpandedFeeds] = useState<Set<string>>(new Set())

  const { address } = useWallet()
  const { enabled: indexerMigrationEnabled } = useFeatureFlag(
    "indexer-migration",
    address
  )

  const toggleFeed = (campaignId: string) => {
    setExpandedFeeds((prev) => {
      const next = new Set(prev)
      if (next.has(campaignId)) {
        next.delete(campaignId)
      } else {
        next.add(campaignId)
      }
      return next
    })
  }

  const fetchCampaigns = () => {
    setLoading(true)
    setError(null)
    // Pass the wallet address for consistent feature-flag bucketing
    return loadCampaigns(address)
      .then(setCampaigns)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : t("loading_error_fallback")
        )
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  const handlePledgeClick = (title: string) => {
    setSelectedCampaign(title)
    setPledgeModalKey((k) => k + 1)
  }

  const closePledgeModal = () => {
    setSelectedCampaign(null)
  }

  const closeRefundModal = () => {
    setSelectedRefundCampaign(null)
  }

  const closeWithdrawModal = () => {
    setSelectedWithdrawCampaign(null)
  }

  const handleWithdrawSuccess = (campaignId: string, amount: number) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaignId
          ? { ...c, withdrawnAmount: (c.withdrawnAmount ?? 0) + amount }
          : c
      )
    )
  }

  const renderCampaignCard = (campaign: Campaign) => {
    const progress = (campaign.raised / campaign.goal) * 100
    const isFunded = progress >= 100
    const isFailed = !isFunded && new Date(campaign.deadline) < new Date()

    // Owner not yet returned by the contract (see Campaign.owner) —
    // fall back to treating the connected wallet as owner so the
    // withdrawal flow is testable ahead of that contract support.
    const isOwner = campaign.owner ? address === campaign.owner : !!address
    const remainingBalance = getRemainingBalance(campaign)
    const withdrawalState = getWithdrawalState(campaign)
    const gracePeriodActive = isWithinGracePeriod(campaign)
    const graceEndsAt = getGracePeriodEndsAt(campaign)

    return (
      <div className="group flex flex-col bg-card border border-card-border rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 transform hover:-translate-y-1">
        <div className="relative h-48 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={campaign.image}
            alt={campaign.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 end-3">
            <CountdownTimer deadline={campaign.deadline} />
          </div>
          {isFailed && (
            <div className="absolute top-3 start-3 bg-red-500/90 text-white text-xs font-semibold px-2 py-1 rounded-lg">
              {t("failed_badge")}
            </div>
          )}
        </div>

        <div className="p-6 flex-1 flex flex-col">
          <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-1">{campaign.title}</h3>
          <p className="text-foreground/60 text-sm mb-6 line-clamp-2 flex-1">
            {campaign.description}
          </p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2 font-medium">
                <span className="text-primary">
                  {t("raised_label", { amount: formatXlm(campaign.raised, locale) })}
                </span>
                <span className="text-foreground/60">
                  {t("goal_label", { amount: formatXlm(campaign.goal, locale) })}
                </span>
              </div>
              <ProgressBar
                progress={progress}
                label={`${campaign.title}: ${Math.round(progress)}% funded, ${campaign.raised.toLocaleString()} of ${campaign.goal.toLocaleString()} XLM raised`}
              />
            </div>

            {isFailed ? (
              <Button
                className="w-full font-bold"
                variant="destructive"
                onClick={() => {
                  setSelectedRefundCampaign(campaign)
                  setRefundModalKey((k) => k + 1)
                }}
              >
                {t("claim_refund")}
              </Button>
            ) : isFunded ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-foreground/60">Withdrawal status</span>
                  <span
                    className={
                      withdrawalState === "full"
                        ? "text-green-500 font-semibold"
                        : withdrawalState === "partial"
                        ? "text-primary font-semibold"
                        : "text-foreground/60 font-semibold"
                    }
                  >
                    {withdrawalState === "full"
                      ? "Fully withdrawn"
                      : withdrawalState === "partial"
                      ? `Partially withdrawn (${(campaign.withdrawnAmount ?? 0).toLocaleString()} of ${campaign.raised.toLocaleString()} XLM)`
                      : "Not withdrawn"}
                  </span>
                </div>

                {isOwner ? (
                  <Button
                    className="w-full font-bold"
                    variant={withdrawalState === "full" ? "secondary" : "default"}
                    disabled={withdrawalState === "full" || gracePeriodActive || remainingBalance <= 0}
                    onClick={() => {
                      setSelectedWithdrawCampaign(campaign)
                      setWithdrawModalKey((k) => k + 1)
                    }}
                  >
                    {withdrawalState === "full"
                      ? "Fully Withdrawn"
                      : gracePeriodActive
                      ? `Withdrawal opens ${graceEndsAt ? new Date(graceEndsAt).toLocaleString() : "soon"}`
                      : "Withdraw Funds"}
                  </Button>
                ) : (
                  <Button className="w-full font-bold" variant="secondary" disabled>
                    {t("successfully_funded")}
                  </Button>
                )}
              </div>
            ) : (
              <Button
                className="w-full font-bold"
                variant="default"
                onClick={() => handlePledgeClick(campaign.title)}
              >
                {t("pledge_now")}
              </Button>
            )}

            {/* Activity feed toggle — only shown when a contract address is available */}
            {campaign.contractAddress && (
              <button
                onClick={() => toggleFeed(campaign.id)}
                className="flex items-center justify-center gap-1.5 w-full text-xs text-foreground/40 hover:text-foreground/70 transition-colors py-1"
                aria-expanded={expandedFeeds.has(campaign.id)}
                aria-controls={`feed-${campaign.id}`}
              >
                {expandedFeeds.has(campaign.id) ? (
                  <>
                    <ChevronUp className="w-3 h-3" aria-hidden="true" />
                    Hide activity
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" aria-hidden="true" />
                    Live activity
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Collapsible activity feed panel */}
        {campaign.contractAddress && expandedFeeds.has(campaign.id) && (
          <div id={`feed-${campaign.id}`} className="border-t border-card-border px-4 pb-4 pt-3">
            <ActivityFeed contractAddress={campaign.contractAddress} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {loading && (
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-3xl mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
              {t("hero_title")}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                {t("hero_title_highlight")}
              </span>
            </h1>
            <p className="text-lg text-foreground/70">{t("hero_subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <CampaignSkeleton />
            <CampaignSkeleton />
            <CampaignSkeleton />
          </div>
        </main>
      )}

      {error && (
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-3xl mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
              {t("hero_title")}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                {t("hero_title_highlight")}
              </span>
            </h1>
            <p className="text-lg text-foreground/70">{t("hero_subtitle")}</p>
          </div>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {t("loading_error_title")}
            </h2>
            <p role="alert" className="text-foreground/60 max-w-md mb-6">{error}</p>
            <Button variant="outline" onClick={fetchCampaigns}>
              {t("loading_error_retry")}
            </Button>
          </div>
        </main>
      )}

      {!loading && !error && (
        <main className="flex-1 container mx-auto px-4 py-12 flex flex-col">
          <div className="max-w-3xl mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
              {t("hero_title")}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                {t("hero_title_highlight")}
              </span>
            </h1>
            <p className="text-lg text-foreground/70">{t("hero_subtitle")}</p>
          </div>

          <div className="flex-1">
            <VirtualizedCampaignGrid
              campaigns={campaigns}
              renderCard={renderCampaignCard}
              columnCount={3}
              gap={32}
              overscan={2}
            />
          </div>
        </main>
      )}

      {/* Feature-flag indicator — shows which data path is active.
       *  Remove this badge once the indexer-migration is fully rolled out. */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 end-4 z-50">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${
              indexerMigrationEnabled
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
            }`}
            title={
              indexerMigrationEnabled
                ? "Using indexer endpoint (Issue 49)"
                : "Using legacy RPC simulateTransaction"
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                indexerMigrationEnabled ? "bg-green-400" : "bg-gray-400"
              }`}
            />
            {indexerMigrationEnabled ? "Indexer" : "Legacy RPC"}
          </span>
        </div>
      )}

      <PledgeModal
        key={pledgeModalKey}
        isOpen={!!selectedCampaign}
        onClose={closePledgeModal}
        campaignTitle={selectedCampaign || ""}
      />
      <RefundModal
        key={refundModalKey}
        isOpen={!!selectedRefundCampaign}
        onClose={closeRefundModal}
        campaignTitle={selectedRefundCampaign?.title || ""}
        pledgedAmount={selectedRefundCampaign?.raised}
      />
      <WithdrawModal
        key={withdrawModalKey}
        isOpen={!!selectedWithdrawCampaign}
        onClose={closeWithdrawModal}
        campaignTitle={selectedWithdrawCampaign?.title || ""}
        remainingBalance={selectedWithdrawCampaign ? getRemainingBalance(selectedWithdrawCampaign) : 0}
        onWithdrawSuccess={(amount) => {
          if (selectedWithdrawCampaign) {
            handleWithdrawSuccess(selectedWithdrawCampaign.id, amount)
          }
        }}
      />
    </div>
  )
}
