"use client"

import React, { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { Wallet, Rocket, LogOut, Loader2, Menu, X } from "lucide-react"
import { useWallet } from "@/context/WalletContext"

export function Navbar() {
  const { address, connect, disconnect, isConnecting, error } = useWallet()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
        {/* Logo */}
        <Link
          href="/"
          aria-label="Stellar Raise home"
          className="flex items-center gap-2 text-xl font-bold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          <div className="bg-primary/20 p-2 rounded-xl text-primary" aria-hidden="true">
            <Rocket className="w-5 h-5" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Stellar Raise
          </span>
        </Link>

        {/* Desktop: theme toggle + wallet controls */}
        <div className="hidden sm:flex items-center gap-3">
          <ThemeToggle />

          {error && (
            <p role="alert" aria-live="polite" className="text-red-500 text-sm">
              {error}
            </p>
          )}
          {address ? (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="gap-2 font-mono"
                aria-label={`Connected wallet: ${address}`}
              >
                <Wallet className="w-4 h-4" aria-hidden="true" />
                {fullAddress}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={disconnect}
                aria-label="Disconnect wallet"
              >
                <LogOut className="w-4 h-4 text-foreground/60" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={connect}
              disabled={isConnecting}
              aria-label={isConnecting ? "Connecting wallet…" : "Connect wallet"}
              className="gap-2 shadow-primary/30"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Wallet className="w-4 h-4" aria-hidden="true" />
              )}
              Connect Wallet
            </Button>
          )}
        </div>

        {/* Mobile: theme toggle + compact wallet + hamburger */}
        <div className="flex sm:hidden items-center gap-1">
          <ThemeToggle />

          {address ? (
            <Link
              href="/dashboard"
              aria-label="Open creator analytics dashboard"
              className="text-xs font-medium text-foreground/80 hover:text-foreground px-2 py-1 rounded-md hover:bg-card inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <BarChart3 className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
              Dashboard
            </Link>
          ) : null}
          {address ? (
            <>
              <span
                className="font-mono text-xs text-foreground/70 bg-card border border-card-border rounded-lg px-2 py-1"
                aria-label={`Connected wallet: ${address}`}
              >
                {shortAddress}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={disconnect}
                aria-label="Disconnect wallet"
              >
                <LogOut className="w-4 h-4 text-foreground/60" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
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
          aria-label="Mobile navigation menu"
          className="sm:hidden border-t border-card-border bg-background/95 backdrop-blur-md px-4 py-4 flex flex-col gap-3"
        >
          {error && (
            <p role="alert" aria-live="polite" className="text-red-500 text-sm text-center">
              {error}
            </p>
          )}
          <Button
            onClick={() => {
              connect()
              setMobileMenuOpen(false)
            }}
            disabled={isConnecting}
            aria-label={isConnecting ? "Connecting wallet…" : "Connect wallet"}
            className="w-full gap-2 shadow-primary/30"
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Wallet className="w-4 h-4" aria-hidden="true" />
            )}
            Connect Wallet
          </Button>
        </div>
      )}
    </nav>
  )
}
