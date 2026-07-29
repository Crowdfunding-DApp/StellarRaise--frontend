"use client"

import React from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { useAdmin } from "@/context/AdminContext"
import { getAllModeratedCampaigns, getFlaggedCampaigns, getSuspendedCampaigns, getAuditLog } from "@/lib/admin"
import { Shield, Megaphone, AlertTriangle, ClipboardList } from "lucide-react"

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType
  label: string
  value: number
  color: string
}) {
  return (
    <div className="bg-card border border-card-border rounded-2xl p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-foreground/60">{label}</p>
        </div>
      </div>
    </div>
  )
}

function RecentActivity() {
  const logs = getAuditLog().slice(0, 5)

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-foreground/40 text-sm">
        No admin activity yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-start gap-3 px-4 py-3 rounded-xl bg-card/50 border border-card-border/50"
        >
          <div className="w-2 h-2 rounded-full bg-primary/50 mt-1.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-foreground/80 truncate">{log.details}</p>
            <p className="text-xs text-foreground/40 mt-0.5">
              {new Date(log.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboardPage() {
  const { user } = useAdmin()
  const totalModerated = getAllModeratedCampaigns().length
  const flagged = getFlaggedCampaigns().length
  const suspended = getSuspendedCampaigns().length
  const auditCount = getAuditLog().length

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-foreground/60 mt-1">
          Welcome back, {user?.username}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Megaphone}
          label="Total Moderated"
          value={totalModerated}
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Flagged"
          value={flagged}
          color="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          icon={Shield}
          label="Suspended"
          value={suspended}
          color="bg-red-500/10 text-red-400"
        />
        <StatCard
          icon={ClipboardList}
          label="Audit Entries"
          value={auditCount}
          color="bg-green-500/10 text-green-400"
        />
      </div>

      <div className="bg-card border border-card-border rounded-2xl p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Recent Activity</h2>
        <RecentActivity />
      </div>
    </AdminLayout>
  )
}
