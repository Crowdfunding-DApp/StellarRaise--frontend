"use client";

/**
 * NotificationDock (Issue #78).
 *
 * Self-contained client component that:
 *   - mounts the lifecycle hooks so deadline / refund events fire while the
 *     user is connected to a wallet and campaigns are loaded
 *   - renders a CTA banner that opens the NotificationSettingsModal
 *
 * Designed to be a single, opinionated drop-in for the dashboard. The host
 * page (e.g. `src/app/page.tsx`) only needs to import + render this component.
 */

import React, { useState } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NotificationSettingsModal } from "@/components/ui/NotificationSettingsModal";
import { useNotifications } from "@/context/NotificationContext";
import { useWallet } from "@/context/WalletContext";
import {
  useDeadlineApproachingTrigger,
  useRefundEligibleTrigger,
} from "@/lib/notifications";
import type { Campaign } from "@/lib/soroban";

interface NotificationDockProps {
  campaigns: Campaign[];
}

export function NotificationDock({
  campaigns,
}: NotificationDockProps): React.ReactElement | null {
  const { address } = useWallet();
  const { preferences, isReady } = useNotifications();
  const [open, setOpen] = useState(false);

  // Triggers only fire for the connected wallet's campaigns, never before the
  // wallet is connected.
  useDeadlineApproachingTrigger({
    enabled: Boolean(address),
    walletAddress: address,
    campaigns,
  });
  useRefundEligibleTrigger({
    enabled: Boolean(address),
    walletAddress: address,
    campaigns,
  });

  // Don't render the CTA until the provider has hydrated; otherwise the badge
  // flicks from "not opted in" → "opted in" briefly during wallet connect.
  if (!isReady || !address) return null;

  if (preferences) {
    return (
      <>
        <div className="bg-card border border-card-border rounded-2xl p-4 flex items-center gap-4 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            <Bell className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              Notifications enabled
            </p>
            <p className="text-sm text-foreground/60">
              You&apos;ll be alerted when a campaign deadline approaches and when
              a refund becomes available for the connected wallet.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setOpen(true)}
            aria-label="Open notification settings"
          >
            Manage
          </Button>
        </div>
        <NotificationSettingsModal
          isOpen={open}
          onClose={() => setOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="bg-card border border-dashed border-primary/40 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
          <Bell className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">
            Never miss a deadline or refund
          </p>
          <p className="text-sm text-foreground/60">
            Opt in to get notified when a campaign you pledge to is about to
            close, or when a campaign has failed and your refund is available.
          </p>
        </div>
        <Button
          onClick={() => setOpen(true)}
          aria-label="Open notification opt-in"
          className="shadow-primary/30"
        >
          Enable notifications
        </Button>
      </div>
      <NotificationSettingsModal
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
