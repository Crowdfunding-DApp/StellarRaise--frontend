"use client";

/* eslint-disable react-hooks/set-state-in-effect --
   The hydration `useEffect` mirrors localStorage (an external store) into
   React state on mount and whenever the bound wallet address changes. This
   is the canonical "external-store mirror" pattern that React 18's
   `useSyncExternalStore` was designed to address; we use `useEffect` here
   because the source is synchronous, single-tab, and we do not need a
   re-render signal when localStorage is mutated by *other* tabs. Switching
   to `useSyncExternalStore` would require a custom event bus for in-tab
   updates made through `register()` / `update()` / `optOut()` — net-net a
   loss for a UI that already routes those writes through this provider. */

// NotificationProvider (Issue #78).

/**
 * Thin React wrapper around NotificationService that:
 *   - binds preferences to the connected wallet via WalletContext
 *   - exposes safe register / update / opt-out actions to the UI
 *   - never stores the raw email in any React-tree-visible state when not opted in
 *
 * Must be mounted inside WalletProvider so it can read the address.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useWallet } from "./WalletContext";
import { getNotificationService } from "@/lib/notifications";
import type {
  NotificationPreferences,
  SimpleResult,
} from "@/lib/notifications";

interface NotificationContextValue {
  preferences: NotificationPreferences | null;
  /**
   * Whether the NotificationProvider has finished its initial hydration.
   * UI uses this to gate against showing an "empty" state mid-load.
   */
  isReady: boolean;
  register: (email: string, consent: boolean) => SimpleResult;
  update: (
    patch: Partial<
      Pick<NotificationPreferences, "email" | "consent" | "channels">
    >
  ) => SimpleResult;
  optOut: () => SimpleResult;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { address } = useWallet();
  const service = useMemo(() => getNotificationService(), []);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(
    null
  );
  const [isReady, setIsReady] = useState(false);

  const refresh = useCallback(() => {
    setPreferences(service.getPreferences(address));
    setIsReady(true);
  }, [service, address]);

  // Hydrate preferences when the provider mounts or the wallet changes.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const register = useCallback(
    (email: string, consent: boolean): SimpleResult => {
      const result = service.register(address, email, consent);
      if (result.ok) {
        setPreferences(result.prefs);
        return { ok: true };
      }
      return { ok: false, error: result.error };
    },
    [service, address]
  );

  const update = useCallback<NotificationContextValue["update"]>(
    (patch) => {
      const result = service.update(address, patch);
      if (result.ok) {
        setPreferences(result.prefs);
        return { ok: true };
      }
      return { ok: false, error: result.error };
    },
    [service, address]
  );

  const optOut = useCallback((): SimpleResult => {
    const result = service.optOut(address);
    if (result.ok) {
      setPreferences(null);
    }
    return result;
  }, [service, address]);

  const value = useMemo<NotificationContextValue>(
    () => ({ preferences, isReady, register, update, optOut, refresh }),
    [preferences, isReady, register, update, optOut, refresh]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (ctx === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}
