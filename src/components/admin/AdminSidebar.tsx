"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAdmin } from "@/context/AdminContext"
import {
  LayoutDashboard,
  Megaphone,
  ClipboardList,
  LogOut,
  Shield,
  Rocket,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/audit-log", label: "Audit Log", icon: ClipboardList },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { user, logout } = useAdmin()

  return (
    <aside className="w-64 bg-card border-r border-card-border flex flex-col shrink-0">
      <div className="p-4 border-b border-card-border">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-lg font-bold text-foreground"
        >
          <div className="bg-primary/20 p-1.5 rounded-lg text-primary" aria-hidden="true">
            <Shield className="w-4 h-4" />
          </div>
          <span>Admin Console</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/60 hover:text-foreground hover:bg-card-border/30"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-card-border space-y-2">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-card-border/30 transition-colors"
        >
          <Rocket className="w-4 h-4" />
          View Site
        </Link>

        {user && (
          <div className="px-3 py-2 text-xs text-foreground/40">
            <p className="font-mono truncate">{user.username}</p>
            <p className="capitalize">{user.role}</p>
          </div>
        )}

        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
