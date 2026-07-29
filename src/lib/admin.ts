export interface AdminUser {
  id: string
  username: string
  role: "admin" | "superadmin"
}

export type CampaignStatus = "active" | "suspended" | "flagged"

export interface CampaignModeration {
  id: string
  campaignId: string
  campaignTitle: string
  status: CampaignStatus
  flagCount: number
  flaggedBy: string[]
  suspendedAt?: string
  suspendedBy?: string
  suspensionReason?: string
  annotations: Annotation[]
  createdAt: string
  updatedAt: string
}

export interface Annotation {
  id: string
  adminId: string
  adminName: string
  note: string
  createdAt: string
}

export type AuditActionType =
  | "admin.login"
  | "admin.logout"
  | "campaign.suspend"
  | "campaign.unsuspend"
  | "campaign.annotate"
  | "campaign.flag"
  | "campaign.review"

export interface AuditEntry {
  id: string
  timestamp: string
  action: AuditActionType
  adminId: string
  adminName: string
  targetId?: string
  targetType?: string
  details: string
  ipAddress?: string
}

const ADMIN_STORAGE_KEY = "stellar_raise_admin_session"
const AUDIT_LOG_KEY = "stellar_raise_audit_log"
const MODERATION_KEY = "stellar_raise_moderation_data"

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getAdminSecret(): string {
  return process.env.NEXT_PUBLIC_ADMIN_SECRET || ""
}

function getAdminUsername(): string {
  return process.env.NEXT_PUBLIC_ADMIN_USERNAME || "admin"
}

export async function authenticateAdmin(password: string): Promise<AdminUser | null> {
  const secret = getAdminSecret()
  if (!secret) {
    console.warn(
      "[AdminAuth] NEXT_PUBLIC_ADMIN_SECRET is not set. " +
      "Set it in .env.local to enable admin authentication. " +
      "For development, you can use: NEXT_PUBLIC_ADMIN_SECRET=dev-admin-key"
    )
    return null
  }

  const encoder = new TextEncoder()
  const inputHash = await crypto.subtle.digest("SHA-256", encoder.encode(password))
  const storedHash = await crypto.subtle.digest("SHA-256", encoder.encode(secret))

  const inputArray = new Uint8Array(inputHash)
  const storedArray = new Uint8Array(storedHash)

  if (inputArray.byteLength !== storedArray.byteLength) return null

  let match = true
  for (let i = 0; i < inputArray.byteLength; i++) {
    if (inputArray[i] !== storedArray[i]) {
      match = false
      break
    }
  }

  if (!match) return null

  const user: AdminUser = {
    id: generateId(),
    username: getAdminUsername(),
    role: "superadmin",
  }

  return user
}

export function saveAdminSession(user: AdminUser): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(user))
  } catch {
    console.warn("[AdminAuth] Failed to save admin session")
  }
}

export function getAdminSession(): AdminUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(ADMIN_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AdminUser
  } catch {
    return null
  }
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY)
  } catch {
    console.warn("[AdminAuth] Failed to clear admin session")
  }
}

export function isAdminAuthenticated(): boolean {
  return getAdminSession() !== null
}

export function recordAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const audit: AuditEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  }

  if (typeof window === "undefined") return audit

  try {
    const existing = getAuditLog()
    existing.unshift(audit)
    const trimmed = existing.slice(0, 1000)
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmed))
  } catch {
    console.warn("[AdminAudit] Failed to persist audit entry")
  }

  return audit
}

export function getAuditLog(): AuditEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY)
    if (!raw) return []
    return JSON.parse(raw) as AuditEntry[]
  } catch {
    return []
  }
}

export function clearAuditLog(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(AUDIT_LOG_KEY)
  } catch {
    console.warn("[AdminAudit] Failed to clear audit log")
  }
}

export function getModerationData(): Map<string, CampaignModeration> {
  if (typeof window === "undefined") return new Map()
  try {
    const raw = localStorage.getItem(MODERATION_KEY)
    if (!raw) return new Map()
    const entries = JSON.parse(raw) as [string, CampaignModeration][]
    return new Map(entries)
  } catch {
    return new Map()
  }
}

export function saveModerationData(data: Map<string, CampaignModeration>): void {
  if (typeof window === "undefined") return
  try {
    const entries = Array.from(data.entries())
    localStorage.setItem(MODERATION_KEY, JSON.stringify(entries))
  } catch {
    console.warn("[AdminModeration] Failed to persist moderation data")
  }
}

export function getCampaignModeration(campaignId: string): CampaignModeration | undefined {
  return getModerationData().get(campaignId)
}

export function updateCampaignStatus(
  campaignId: string,
  campaignTitle: string,
  status: CampaignStatus,
  reason: string | undefined,
  admin: AdminUser
): CampaignModeration {
  const data = getModerationData()
  let mod = data.get(campaignId)

  if (!mod) {
    mod = {
      id: generateId(),
      campaignId,
      campaignTitle,
      status: "active",
      flagCount: 0,
      flaggedBy: [],
      annotations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  mod.status = status
  mod.updatedAt = new Date().toISOString()

  if (status === "suspended") {
    mod.suspendedAt = new Date().toISOString()
    mod.suspendedBy = admin.id
    mod.suspensionReason = reason
  } else {
    mod.suspendedAt = undefined
    mod.suspendedBy = undefined
    mod.suspensionReason = undefined
  }

  data.set(campaignId, mod)
  saveModerationData(data)

  recordAuditEntry({
    action: status === "suspended" ? "campaign.suspend" : "campaign.unsuspend",
    adminId: admin.id,
    adminName: admin.username,
    targetId: campaignId,
    targetType: "campaign",
    details: reason
      ? `Campaign "${campaignTitle}" ${status === "suspended" ? "suspended" : "unsuspended"}: ${reason}`
      : `Campaign "${campaignTitle}" ${status === "suspended" ? "suspended" : "unsuspended"}`,
  })

  return mod
}

export function addCampaignAnnotation(
  campaignId: string,
  campaignTitle: string,
  note: string,
  admin: AdminUser
): CampaignModeration {
  const data = getModerationData()
  let mod = data.get(campaignId)

  if (!mod) {
    mod = {
      id: generateId(),
      campaignId,
      campaignTitle,
      status: "active",
      flagCount: 0,
      flaggedBy: [],
      annotations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  const annotation: Annotation = {
    id: generateId(),
    adminId: admin.id,
    adminName: admin.username,
    note,
    createdAt: new Date().toISOString(),
  }

  mod.annotations.push(annotation)
  mod.updatedAt = new Date().toISOString()
  data.set(campaignId, mod)
  saveModerationData(data)

  recordAuditEntry({
    action: "campaign.annotate",
    adminId: admin.id,
    adminName: admin.username,
    targetId: campaignId,
    targetType: "campaign",
    details: `Annotation added to campaign "${campaignTitle}": ${note}`,
  })

  return mod
}

export function flagCampaign(
  campaignId: string,
  campaignTitle: string,
  flaggedBy: string
): CampaignModeration {
  const data = getModerationData()
  let mod = data.get(campaignId)

  if (!mod) {
    mod = {
      id: generateId(),
      campaignId,
      campaignTitle,
      status: "flagged",
      flagCount: 0,
      flaggedBy: [],
      annotations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  if (!mod.flaggedBy.includes(flaggedBy)) {
    mod.flaggedBy.push(flaggedBy)
    mod.flagCount = mod.flaggedBy.length
  }

  if (mod.status === "active") {
    mod.status = "flagged"
  }

  mod.updatedAt = new Date().toISOString()
  data.set(campaignId, mod)
  saveModerationData(data)

  recordAuditEntry({
    action: "campaign.flag",
    adminId: "community",
    adminName: "Community Flagging",
    targetId: campaignId,
    targetType: "campaign",
    details: `Campaign "${campaignTitle}" flagged by ${flaggedBy}`,
  })

  return mod
}

export function getAllModeratedCampaigns(): CampaignModeration[] {
  const data = getModerationData()
  return Array.from(data.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export function getFlaggedCampaigns(): CampaignModeration[] {
  return getAllModeratedCampaigns().filter((m) => m.status === "flagged")
}

export function getSuspendedCampaigns(): CampaignModeration[] {
  return getAllModeratedCampaigns().filter((m) => m.status === "suspended")
}
