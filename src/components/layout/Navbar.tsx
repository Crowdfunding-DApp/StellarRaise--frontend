"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Button, buttonVariants } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { Wallet, Rocket, LogOut, Loader2, Menu, X, Shield, BarChart3 } from "lucide-react"
import { useWallet } from "@/context/WalletContext"
import { useTranslations } from "next-intl"
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher"
import { MobileConnectModal } from "@/components/ui/MobileConnectModal"
import { cn } from "@/lib/utils"

export function Navbar() {
  const { address, connect, disconnect, isConnecting, error, isMobile, extensionAvailable } = useWallet()
  const t = useTranslations("Navbar")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileConnectOpen, setMobileConnectOpen] = useState(false)

  // On mobile without an extension, Freighter's connect() is a dead end
  // (it just throws "not installed"), so route to the QR/deep-link flow.
  const needsMobileFallback = isMobile && extensionAvailable === false

  const handleConnectClick = () => {
    if (needsMobileFallback) {
      setMobileConnectOpen(true)
    } else {
      connect()
    }
  }

  const shortAddress = address
    ? `${address.substring(0, 4)}…${address.substring(address.length - 4)}`
    : null

  const fullAddress = address
    ? `${address.substring(0, 5)}...${address.substring(address.length - 4)}`
    : null

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      className="sticky top-0 z-50 w-full border-b border-card-border bg-background/80 backdrop-blur-md"
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo — flex row, inherits RTL direction so icon and text swap naturally */}
        <Link
          href="/"
          aria-label={t("logo_label")}
          className="flex items-center gap-2 text-xl font-bold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          <div
            className="bg-primary/20 p-2 rounded-xl text-primary"
            aria-hidden="true"
          >
            <Rocket className="w-5 h-5" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            {t("brand")}
          </span>
        </Link>

        {/* Desktop: locale switcher + theme toggle + admin link + wallet controls */}
        <div className="hidden sm:flex items-center gap-3">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground/50 hover:text-foreground hover:bg-card border border-transparent hover:border-card-border transition-all"
          >
            <Shield className="w-3.5 h-3.5" />
            {t("admin_label")}
          </Link>

          {error && (
            <p role="alert" aria-live="polite" className="text-red-500 text-sm">
              {error}
            </p>
          )}

          {address ? (
            <div className="flex items-center gap-2">
              {/* Static display, not an actionable control — a real <button>
                  here with no onClick would be a focusable dead end for
                  keyboard/screen-reader users. */}
              <span
                className={cn(buttonVariants({ variant: "secondary" }), "gap-2 font-mono cursor-default")}
                aria-label={t("connected_label", { address })}
              >
                <Wallet className="w-4 h-4" aria-hidden="true" />
                {fullAddress}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={disconnect}
                aria-label={t("disconnect_label")}
              >
                <LogOut className="w-4 h-4 text-foreground/60" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleConnectClick}
              disabled={isConnecting}
              aria-label={isConnecting ? t("connecting_label") : t("connect_wallet")}
              className="gap-2 shadow-primary/30"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Wallet className="w-4 h-4" aria-hidden="true" />
              )}
              {isConnecting ? t("connecting") : t("connect_wallet")}
            </Button>
          )}
        </div>

        {/* Mobile: locale switcher + theme toggle + compact wallet + hamburger */}
        <div className="flex sm:hidden items-center gap-1">
          <LocaleSwitcher />
          <ThemeToggle />

          {address ? (
            <Link
              href="/dashboard"
              aria-label={t("dashboard_aria_label")}
              className="text-xs font-medium text-foreground/80 hover:text-foreground px-2 py-1 rounded-md hover:bg-card inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <BarChart3 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              {t("dashboard_label")}
            </Link>
          ) : null}
          {address ? (
            <>
              <span
                className="font-mono text-xs text-foreground/70 bg-card border border-card-border rounded-lg px-2 py-1"
                aria-label={t("connected_label", { address })}
              >
                {shortAddress}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={disconnect}
                aria-label={t("disconnect_label")}
              >
                <LogOut className="w-4 h-4 text-foreground/60" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? t("close_menu") : t("open_menu")}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5" aria-hidden="true" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && !address && (
        <div
          id="mobile-menu"
          role="region"
          aria-label={t("mobile_menu_label")}
          className="sm:hidden border-t border-card-border bg-background/95 backdrop-blur-md px-4 py-4 flex flex-col gap-3"
        >
          {error && (
            <p
              role="alert"
              aria-live="polite"
              className="text-red-400 text-sm text-center"
            >
              {error}
            </p>
          )}
          <Button
            onClick={() => {
              handleConnectClick()
              setMobileMenuOpen(false)
            }}
            disabled={isConnecting}
            aria-label={isConnecting ? t("connecting_label") : t("connect_wallet")}
            className="w-full gap-2 shadow-primary/30"
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Wallet className="w-4 h-4" aria-hidden="true" />
            )}
            {isConnecting ? t("connecting") : t("connect_wallet")}
          </Button>
        </div>
      )}

      <MobileConnectModal isOpen={mobileConnectOpen} onClose={() => setMobileConnectOpen(false)} />
    </nav>
  )
}
