"use client"

import React, { useState, useEffect } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { ProgressBar } from "@/components/ui/ProgressBar"
import { CountdownTimer } from "@/components/ui/CountdownTimer"
import { Button } from "@/components/ui/button"
import { PledgeModal } from "@/components/ui/PledgeModal"
import { RefundModal } from "@/components/ui/RefundModal"
import { getCampaigns, type Campaign } from "@/lib/soroban"

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
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [selectedRefundCampaign, setSelectedRefundCampaign] = useState<Campaign | null>(null)

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        setLoading(true)
        setError(null)
        const data = await getCampaigns()
        setCampaigns(data)
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "An unexpected error occurred while loading campaigns. Please try again later."
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [])

  const handlePledgeClick = (title: string) => {
    setSelectedCampaign(title)
  }

  const closePledgeModal = () => {
    setSelectedCampaign(null)
  }

  const closeRefundModal = () => {
    setSelectedRefundCampaign(null)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
            Fund the Future on <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Stellar</span>
          </h1>
          <p className="text-lg text-foreground/70">
            Discover and support innovative projects with lightning-fast, secure transactions on the Stellar network.
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <CampaignSkeleton />
            <CampaignSkeleton />
            <CampaignSkeleton />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Failed to Load Campaigns</h2>
            <p className="text-foreground/60 max-w-md mb-6">{error}</p>
            <Button
              variant="outline"
              onClick={() => {
                setLoading(true)
                setError(null)
                getCampaigns()
                  .then(setCampaigns)
                  .catch((err) =>
                    setError(
                      err instanceof Error
                        ? err.message
                        : "An unexpected error occurred. Please try again later."
                    )
                  )
                  .finally(() => setLoading(false))
              }}
            >
              Try Again
            </Button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {campaigns.map((campaign) => {
              const progress = (campaign.raised / campaign.goal) * 100
              const isFunded = progress >= 100
              const isFailed =
                !isFunded && new Date(campaign.deadline) < new Date()

              return (
                <div
                  key={campaign.id}
                  className="group flex flex-col bg-card border border-card-border rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="relative h-48 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={campaign.image}
                      alt={campaign.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3">
                      <CountdownTimer deadline={campaign.deadline} />
                    </div>
                    {isFailed && (
                      <div className="absolute top-3 left-3 bg-red-500/90 text-white text-xs font-semibold px-2 py-1 rounded-lg">
                        Failed
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
                          <span className="text-primary">{campaign.raised.toLocaleString()} XLM raised</span>
                          <span className="text-foreground/60">{campaign.goal.toLocaleString()} XLM goal</span>
                        </div>
                        <ProgressBar progress={progress} />
                      </div>

                      {isFailed ? (
                        <Button
                          className="w-full font-bold"
                          variant="destructive"
                          onClick={() => setSelectedRefundCampaign(campaign)}
                        >
                          Claim Refund
                        </Button>
                      ) : (
                        <Button
                          className="w-full font-bold"
                          variant={isFunded ? "secondary" : "default"}
                          onClick={() => !isFunded && handlePledgeClick(campaign.title)}
                          disabled={isFunded}
                        >
                          {isFunded ? "Successfully Funded" : "Pledge Now"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <PledgeModal
        isOpen={!!selectedCampaign}
        onClose={closePledgeModal}
        campaignTitle={selectedCampaign || ""}
      />

      <RefundModal
        isOpen={!!selectedRefundCampaign}
        onClose={closeRefundModal}
        campaignTitle={selectedRefundCampaign?.title || ""}
      />
    </div>
  )
}
