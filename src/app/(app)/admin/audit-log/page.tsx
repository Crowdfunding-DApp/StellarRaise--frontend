"use client"

import React, { useState } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { getAuditLog, clearAuditLog, type AuditEntry, type AuditActionType } from "@/lib/admin"
import { Search, Trash2, ClipboardList, LogIn, LogOut, Shield, AlertTriangle, MessageSquare, Flag, Eye, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const actionConfig: Record<AuditActionType, { icon: React.ElementType; label: string; color: string }> = {
  "admin.login": { icon: LogIn, label: "Login", color: "text-green-400" },
  "admin.logout": { icon: LogOut, label: "Logout", color: "text-foreground/60" },
  "campaign.suspend": { icon: Shield, label: "Suspend", color: "text-red-400" },
  "campaign.unsuspend": { icon: Shield, label: "Unsuspend", color: "text-green-400" },
  "campaign.annotate": { icon: MessageSquare, label: "Annotation", color: "text-blue-400" },
  "campaign.flag": { icon: Flag, label: "Flag", color: "text-amber-400" },
  "campaign.review": { icon: Eye, label: "Review", color: "text-purple-400" },
}

function ActionBadge({ action }: { action: AuditActionType }) {
  const config = actionConfig[action]
  if (!config) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-card-border/30 text-foreground/60">
        {action}
      </span>
    )
  }
  const Icon = config.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        "bg-card-border/20",
        config.color
      )}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>(() => getAuditLog())
  const [search, setSearch] = useState("")
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const filtered = logs.filter((log) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      log.details.toLowerCase().includes(q) ||
      log.adminName.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      (log.targetId && log.targetId.toLowerCase().includes(q))
    )
  })

  const handleClear = () => {
    clearAuditLog()
    setLogs([])
    setShowClearConfirm(false)
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Log</h1>
          <p className="text-foreground/60 mt-1">
            Complete record of all admin actions ({logs.length} entries)
          </p>
        </div>
        {logs.length > 0 && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(!showClearConfirm)}
              className="gap-1.5 text-red-400 border-red-500/20 hover:bg-red-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Log
            </Button>
            {showClearConfirm && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-card-border rounded-2xl p-4 shadow-xl z-10">
                <p className="text-sm text-foreground/80 mb-3">
                  This will permanently delete all audit entries. This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClear}
                    className="flex-1"
                  >
                    Delete All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
        <input
          type="text"
          placeholder="Search audit log..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-card-border text-foreground placeholder:text-foreground/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-foreground/40">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">
            {logs.length === 0 ? "No audit entries yet" : "No entries match your search"}
          </p>
          <p className="text-sm mt-1">
            {logs.length === 0
              ? "Admin actions will be recorded here"
              : "Try a different search term"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-4 px-5 py-4 bg-card border border-card-border rounded-2xl"
            >
              <ActionBadge action={log.action} />

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground/80 truncate">{log.details}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-foreground/40 font-mono">{log.adminName}</span>
                  {log.targetId && (
                    <span className="text-xs text-foreground/30">
                      Target: {log.targetId}
                    </span>
                  )}
                </div>
              </div>

              <time
                dateTime={log.timestamp}
                className="text-xs text-foreground/40 tabular-nums shrink-0"
              >
                {new Date(log.timestamp).toLocaleString()}
              </time>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
