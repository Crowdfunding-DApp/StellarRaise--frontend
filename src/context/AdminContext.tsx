"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import {
  type AdminUser,
  type AuditEntry,
  isAdminAuthenticated,
  getAdminSession,
  saveAdminSession,
  clearAdminSession,
  authenticateAdmin,
  recordAuditEntry,
} from "@/lib/admin"

interface AdminContextType {
  user: AdminUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isAdminAuthenticated()) {
      setUser(getAdminSession())
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (password: string) => {
    setIsLoading(true)
    try {
      const admin = await authenticateAdmin(password)
      if (!admin) {
        setIsLoading(false)
        const hasSecret = !!process.env.NEXT_PUBLIC_ADMIN_SECRET
        return {
          success: false,
          error: hasSecret
            ? "Invalid admin credentials"
            : "Admin secret not configured. Set NEXT_PUBLIC_ADMIN_SECRET in .env.local",
        }
      }
      saveAdminSession(admin)
      setUser(admin)

      recordAuditEntry({
        action: "admin.login",
        adminId: admin.id,
        adminName: admin.username,
        details: `Admin "${admin.username}" logged in`,
      })

      setIsLoading(false)
      return { success: true }
    } catch (err) {
      setIsLoading(false)
      return {
        success: false,
        error: err instanceof Error ? err.message : "Authentication failed",
      }
    }
  }, [])

  const logout = useCallback(() => {
    if (user) {
      recordAuditEntry({
        action: "admin.logout",
        adminId: user.id,
        adminName: user.username,
        details: `Admin "${user.username}" logged out`,
      })
    }
    clearAdminSession()
    setUser(null)
  }, [user])

  return (
    <AdminContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin(): AdminContextType {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider")
  }
  return context
}
