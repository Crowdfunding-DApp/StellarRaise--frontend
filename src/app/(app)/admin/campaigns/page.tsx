"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { getAllModeratedCampaigns, type CampaignModeration } from "@/lib/admin"
import { getCampaigns, type Campaign } from "@/lib/soroban"
import { Search, Shield, AlertTriangle, CheckCircle, Loader2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function ModerationBadge({ status }: { status: CampaignModeration["status"] }) {
  const styles = {
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    flagged: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    suspended: "bg-red-500/10 text-red-400 border-red-500/20",
  }

  const labels = {
    active: "Active",
    flagged: "Flagged",
    suspended: "Suspended",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        styles[status]
      )}
    >
      {status === "active" && <CheckCircle className="w-3 h-3" />}
      {status === "flagged" && <AlertTriangle className="w-3 h-3" />}
      {status === "suspended" && <Shield className="w-3 h-3" />}
      {labels[status]}
    </span>
  )
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [moderated, setModerated] = useState<CampaignModeration[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "flagged" | "suspended" | "active">("all")

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [campaignData] = await Promise.all([getCampaigns()])
        const modData = getAllModeratedCampaigns()
        setCampaigns(campaignData)
        setModerated(modData)
      } catch {
        const modData = getAllModeratedCampaigns()
        setModerated(modData)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const merged = campaigns.map((c) => ({
    campaign: c,
    moderation: moderated.find((m) => m.campaignId === c.id),
  }))

  const sorted = [...merged].sort((a, b) => {
    const aStatus = a.moderation?.status ?? "active"
    const bStatus = b.moderation?.status ?? "active"
    const order = { suspended: 0, flagged: 1, active: 2 }
    return (order[aStatus] ?? 3) - (order[bStatus] ?? 3)
  })

  const filtered = sorted.filter((item) => {
    if (filter !== "all") {
      const status = item.moderation?.status ?? "active"
      if (status !== filter) return false
    }
    if (search) {
      const q = search.toLowerCase()
      const title = item.campaign.title.toLowerCase()
      const id = item.campaign.id.toLowerCase()
      if (!title.includes(q) && !id.includes(q)) return false
    }
    return true
  })

  const filterTabs = [
    { key: "all" as const, label: "All", count: campaigns.length },
    { key: "flagged" as const, label: "Flagged", count: moderated.filter((m) => m.status === "flagged").length },
    { key: "suspended" as const, label: "Suspended", count: moderated.filter((m) => m.status === "suspended").length },
    { key: "active" as const, label: "Active", count: campaigns.length - moderated.filter((m) => m.status !== "active").length },
  ]

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Campaign Moderation</h1>
        <p className="text-foreground/60 mt-1">
          Review, suspend, or annotate campaigns
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-card-border text-foreground placeholder:text-foreground/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex gap-1 mb-6 p-1 bg-card border border-card-border rounded-xl w-fit">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              filter === tab.key
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-foreground/60 hover:text-foreground"
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-foreground/40">
          <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No campaigns found</p>
          <p className="text-sm mt-1">
            {filter !== "all"
              ? `No ${filter} campaigns match your search`
              : "Campaigns will appear here once loaded"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ campaign, moderation }) => (
            <Link
              key={campaign.id}
              href={`/admin/campaigns/${campaign.id}`}
              className="flex items-center gap-4 px-5 py-4 bg-card border border-card-border rounded-2xl hover:border-primary/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-card-border/50 overflow-hidden shrink-0">
                {campaign.image && (
                  <img
                    src={campaign.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {campaign.title}
                  </p>
                  <ModerationBadge status={moderation?.status ?? "active"} />
                </div>
                <p className="text-xs text-foreground/50 truncate">
                  ID: {campaign.id}
                  {moderation && ` · ${moderation.annotations.length} annotation${moderation.annotations.length !== 1 ? "s" : ""}`}
                  {moderation && moderation.flagCount > 0 && ` · ${moderation.flagCount} flag${moderation.flagCount !== 1 ? "s" : ""}`}
                </p>
              </div>

              <ExternalLink className="w-4 h-4 text-foreground/30 group-hover:text-primary transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
