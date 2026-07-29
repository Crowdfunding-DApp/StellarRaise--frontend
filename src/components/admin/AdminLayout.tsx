"use client"

import React from "react"
import { AdminGuard } from "@/components/admin/AdminGuard"
import { AdminSidebar } from "@/components/admin/AdminSidebar"

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-background flex">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </AdminGuard>
  )
}
