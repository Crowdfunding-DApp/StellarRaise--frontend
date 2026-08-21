"use client"

import React, { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { useAdmin } from "@/context/AdminContext"
import { getCampaigns, type Campaign } from "@/lib/soroban"
  import {
  getCampaignModeration,
  updateCampaignStatus,
  addCampaignAnnotation,
  type CampaignModeration,
  type CampaignStatus,
  type AdminUser,
} from "@/lib/admin"
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function StatusSelector({
  current,
  campaignId,
  campaignTitle,
  admin,
  onUpdate,
}: {
  current: CampaignStatus
  campaignId: string
  campaignTitle: string
  admin: AdminUser
  onUpdate: () => void
}) {
  const [selected, setSelected] = useState(current)
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    updateCampaignStatus(
      campaignId,
      campaignTitle,
      selected,
      selected === "suspended" ? reason : undefined,
      admin
    )
    onUpdate()
    setIsSubmitting(false)
  }

  const options: { value: CampaignStatus; label: string; icon: React.ElementType; color: string }[] = [
    { value: "active", label: "Active", icon: CheckCircle, color: "text-green-400" },
    { value: "flagged", label: "Flagged", icon: AlertTriangle, color: "text-amber-400" },
    { value: "suspended", label: "Suspended", icon: Shield, color: "text-red-400" },
  ]

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-card-border rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Change Status</h3>

      <div className="flex gap-2">
        {options.map((opt) => {
          const Icon = opt.icon
          const isSelected = selected === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelected(opt.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors border",
                isSelected
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-background border-card-border text-foreground/60 hover:text-foreground"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isSelected ? opt.color : "")} />
              {opt.label}
            </button>
          )
        })}
      </div>

      {selected === "suspended" && (
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for suspension (required)..."
          rows={3}
          className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-foreground placeholder:text-foreground/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          required
        />
      )}

      {selected === "active" && current === "suspended" && (
        <p className="text-xs text-amber-400 flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          This will unsuspend the campaign and restore public visibility
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || selected === current}
        variant={selected === "suspended" ? "destructive" : "default"}
        size="sm"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Updating...
          </>
        ) : (
          "Apply"
        )}
      </Button>
    </form>
  )
}

function AnnotationForm({
  campaignId,
  campaignTitle,
  admin,
  onUpdate,
}: {
  campaignId: string
  campaignTitle: string
  admin: AdminUser
  onUpdate: () => void
}) {
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    setIsSubmitting(true)
    addCampaignAnnotation(campaignId, campaignTitle, note.trim(), admin)
    setNote("")
    onUpdate()
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-card-border rounded-2xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Add Annotation</h3>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Internal note about this campaign..."
        rows={3}
        className="w-full px-3 py-2 rounded-xl bg-background border border-card-border text-foreground placeholder:text-foreground/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
      />
      <Button
        type="submit"
        disabled={isSubmitting || !note.trim()}
        size="sm"
        className="gap-1.5"
      >
        <Send className="w-3.5 h-3.5" />
        {isSubmitting ? "Adding..." : "Add Note"}
      </Button>
    </form>
  )
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAdmin()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [moderation, setModeration] = useState<CampaignModeration | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  const campaignId = params.id as string

  const loadData = () => {
    getCampaigns().then((all) => {
      const found = all.find((c) => c.id === campaignId)
      setCampaign(found || null)
    })
    setModeration(getCampaignModeration(campaignId))
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [campaignId])

  const refresh = () => {
    setModeration(getCampaignModeration(campaignId))
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    )
  }

  if (!campaign) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-foreground/40" />
          <p className="text-lg font-medium text-foreground">Campaign not found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/campaigns")}>
            Back to Campaigns
          </Button>
        </div>
      </AdminLayout>
    )
  }

  const status = moderation?.status ?? "active"

  return (
    <AdminLayout>
      <button
        onClick={() => router.push("/admin/campaigns")}
        className="flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to campaigns
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
            {campaign.image && (
              <div className="h-48 relative">
                <img
                  src={campaign.image}
                  alt={campaign.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{campaign.title}</h1>
                  <p className="text-sm text-foreground/50 mt-1">ID: {campaign.id}</p>
                </div>
              </div>

              <p className="text-foreground/70 text-sm">{campaign.description}</p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-background rounded-xl p-3">
                  <p className="text-xs text-foreground/50 mb-1">Raised</p>
                  <p className="text-lg font-bold text-primary">{campaign.raised.toLocaleString()} XLM</p>
                </div>
                <div className="bg-background rounded-xl p-3">
                  <p className="text-xs text-foreground/50 mb-1">Goal</p>
                  <p className="text-lg font-bold text-foreground">{campaign.goal.toLocaleString()} XLM</p>
                </div>
                <div className="bg-background rounded-xl p-3">
                  <p className="text-xs text-foreground/50 mb-1">Deadline</p>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(campaign.deadline).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-background rounded-xl p-3">
                  <p className="text-xs text-foreground/50 mb-1">Status</p>
                  <div className="mt-0.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                        status === "active" && "bg-green-500/10 text-green-400 border-green-500/20",
                        status === "flagged" && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                        status === "suspended" && "bg-red-500/10 text-red-400 border-red-500/20"
                      )}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              Annotations ({moderation?.annotations.length ?? 0})
            </h3>
            {moderation && moderation.annotations.length > 0 ? (
              <div className="space-y-3">
                {moderation.annotations.map((ann) => (
                  <div
                    key={ann.id}
                    className="bg-background rounded-xl p-4 border border-card-border/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-foreground/80">
                        {ann.adminName}
                      </span>
                      <span className="text-xs text-foreground/40">
                        {new Date(ann.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/70 whitespace-pre-wrap">{ann.note}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground/40 text-center py-6">No annotations yet</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {user && (
            <>
              <StatusSelector
                current={status}
                campaignId={campaign.id}
                campaignTitle={campaign.title}
                admin={user}
                onUpdate={refresh}
              />
              <AnnotationForm
                campaignId={campaign.id}
                campaignTitle={campaign.title}
                admin={user}
                onUpdate={refresh}
              />
            </>
          )}

          {moderation && (
            <div className="bg-card border border-card-border rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Moderation Info</h3>
              <div className="space-y-2 text-xs text-foreground/60">
                <div className="flex justify-between">
                  <span>Flag count</span>
                  <span className="font-medium text-foreground/80">{moderation.flagCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created</span>
                  <span className="font-medium text-foreground/80">
                    {new Date(moderation.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last updated</span>
                  <span className="font-medium text-foreground/80">
                    {new Date(moderation.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
