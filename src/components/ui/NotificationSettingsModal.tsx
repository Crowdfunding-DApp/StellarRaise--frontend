"use client";

/* eslint-disable react-hooks/set-state-in-effect --
   The form hydrates its local `email` / `consent` / `channels` state from
   the wallet-bound `preferences` whenever the modal opens. This is a
   "controlled form, externally-driven initial values" pattern; the rule
   complains because the hydration runs in a `useEffect`. We accept the
   cascade here because (a) the dependency list only triggers on real
   preference changes driven by `register()`/`update()` (one re-render per
   write) and (b) the alternative — driving each field straight from props
   — would prevent the user from editing the form between save cycles. */

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useNotifications } from "@/context/NotificationContext";
import {
  CHANNEL_LABELS,
  availableChannelIds,
  type NotificationChannelId,
  type NotificationPreferences,
  type SimpleResult,
} from "@/lib/notifications";

type ViewState =
  | { kind: "form" }
  | { kind: "saving" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUCCESS_AUTOCLOSE_MS = 1800;

function buildErrorMessage(
  result: SimpleResult,
  fallback: string
): string {
  if (result.ok) return "";
  return result.error || fallback;
}

const EMAIL_INPUT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function NotificationSettingsModal({
  isOpen,
  onClose,
}: NotificationSettingsModalProps): React.ReactElement | null {
  const { preferences, isReady, register, update, optOut } = useNotifications();

  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [channels, setChannels] = useState<NotificationChannelId[]>(["email"]);
  const [view, setView] = useState<ViewState>({ kind: "form" });

  // Reset the local form whenever the modal opens or the wallet-bound
  // preferences change — never leak email field contents across sessions.
  useEffect(() => {
    if (!isOpen) return;
    setEmail(preferences?.email ?? "");
    setConsent(preferences?.consent ?? false);
    setChannels(
      preferences && preferences.channels.length > 0
        ? preferences.channels
        : [availableChannelIds[0]]
    );
    setView({ kind: "form" });
  }, [isOpen, preferences, isReady]);

  // Auto-close on success.
  useEffect(() => {
    if (view.kind !== "success") return;
    const t = setTimeout(onClose, SUCCESS_AUTOCLOSE_MS);
    return () => clearTimeout(t);
  }, [view, onClose]);

  const title = preferences ? "Notification preferences" : "Get notifications";

  const handleSubmit = async (): Promise<void> => {
    if (view.kind === "saving") return;
    if (!consent) {
      setView({
        kind: "error",
        message: "Please confirm consent before continuing.",
      });
      return;
    }
    setView({ kind: "saving" });
    let result: SimpleResult;
    if (preferences) {
      result = update({ email, channels });
    } else {
      result = register(email, true);
    }
    if (result.ok) {
      setView({
        kind: "success",
        message: preferences
          ? "Your preferences were updated."
          : "You are now opted in.",
      });
    } else {
      setView({
        kind: "error",
        message: buildErrorMessage(result, "Could not save your preferences."),
      });
    }
  };

  const handleOptOut = (): void => {
    if (view.kind === "saving") return;
    const result = optOut();
    if (result.ok) {
      setConsent(false);
      setEmail("");
      setView({
        kind: "success",
        message: "Notifications disabled for this wallet.",
      });
    } else {
      setView({
        kind: "error",
        message: buildErrorMessage(result, "Could not opt out."),
      });
    }
  };

  const handleClose = (): void => {
    if (view.kind === "saving") return;
    onClose();
  };

  const toggleChannel = (id: NotificationChannelId): void => {
    setChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const formDisabled = useMemo(() => view.kind === "saving", [view]);

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-settings-title"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-card border border-card-border rounded-2xl shadow-2xl p-6 pointer-events-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Bell
                    className="w-5 h-5 text-primary"
                    aria-hidden="true"
                  />
                  <h2
                    id="notification-settings-title"
                    className="text-xl font-bold text-foreground"
                  >
                    {title}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  disabled={formDisabled}
                  className="rounded-full"
                  aria-label="Close notification settings"
                >
                  <X className="w-5 h-5 text-foreground/60" />
                </Button>
              </div>

              {view.kind === "success" ? (
                <SuccessPanel message={view.message} />
              ) : view.kind === "error" ? (
                <ErrorPanel
                  message={view.message}
                  onRetry={() => setView({ kind: "form" })}
                />
              ) : view.kind === "saving" ? (
                <LoadingPanel />
              ) : (
                <FormPanel
                  email={email}
                  setEmail={setEmail}
                  consent={consent}
                  setConsent={setConsent}
                  channels={channels}
                  toggleChannel={toggleChannel}
                  preferences={preferences}
                  isSaving={formDisabled}
                  onSubmit={handleSubmit}
                  onOptOut={handleOptOut}
                />
              )}
            </motion.div>
          </div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}

interface FormPanelProps {
  email: string;
  setEmail: (value: string) => void;
  consent: boolean;
  setConsent: (value: boolean) => void;
  channels: NotificationChannelId[];
  toggleChannel: (id: NotificationChannelId) => void;
  preferences: NotificationPreferences | null;
  isSaving: boolean;
  onSubmit: () => void;
  onOptOut: () => void;
}

function FormPanel(props: FormPanelProps): React.ReactElement {
  const {
    email,
    setEmail,
    consent,
    setConsent,
    channels,
    toggleChannel,
    preferences,
    isSaving,
    onSubmit,
    onOptOut,
  } = props;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-foreground/70">
        We&apos;ll only contact you about the campaigns you pledge to —
        deadline reminders and refund eligibility. We never share your email.
      </p>

      {/* Email field */}
      <div className="space-y-2">
        <label
          htmlFor="notification-email"
          className="text-sm font-medium flex items-center gap-2"
        >
          <Mail className="w-4 h-4 text-foreground/60" aria-hidden="true" />
          Email address
        </label>
        <input
          id="notification-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isSaving}
          aria-invalid={
            email.length > 0 && !EMAIL_INPUT_REGEX.test(email)
          }
          className="w-full bg-background border border-card-border rounded-xl px-4 py-3 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors disabled:opacity-60"
        />
      </div>

      {/* Channel toggles — data-driven from `availableChannelIds`. */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Channels</legend>
        <div className="grid grid-cols-2 gap-2">
          {availableChannelIds.map((id) => (
            <ChannelToggle
              key={id}
              id={id}
              label={CHANNEL_LABELS[id]}
              checked={channels.includes(id)}
              disabled={isSaving}
              onChange={() => toggleChannel(id)}
            />
          ))}
        </div>
        <p className="text-xs text-foreground/50">
          Push notifications require browser permission. New channels can be
          added without changing this form.
        </p>
      </fieldset>

      {/* Consent */}
      <label
        htmlFor="notification-consent"
        className="flex items-start gap-3 rounded-xl border border-card-border bg-background/50 px-4 py-3 cursor-pointer hover:border-primary/40 transition-colors"
      >
        <input
          id="notification-consent"
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={isSaving}
          className="mt-1 h-4 w-4 rounded border-card-border accent-primary"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 font-medium text-sm">
            <ShieldCheck
              className="w-4 h-4 text-primary"
              aria-hidden="true"
            />
            I consent to receive notifications
          </div>
          <p className="text-xs text-foreground/60 mt-1 leading-relaxed">
            By saving, you authorize Stellar Raise to email you about deadlines
            and refunds for campaigns connected to your wallet. You can update
            or opt out at any time. Your email is never shared.
          </p>
        </div>
      </label>

      <div className="flex flex-col gap-2">
        <Button
          onClick={onSubmit}
          disabled={isSaving || !email || !consent}
          className="w-full h-11 shadow-primary/30"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </span>
          ) : preferences ? (
            "Save changes"
          ) : (
            "Enable notifications"
          )}
        </Button>

        {preferences && (
          <Button
            variant="ghost"
            onClick={onOptOut}
            disabled={isSaving}
            className="w-full"
          >
            Opt out &amp; erase stored data
          </Button>
        )}
      </div>
    </div>
  );
}

interface ChannelToggleProps {
  id: NotificationChannelId;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}

function ChannelToggle({
  id,
  label,
  checked,
  disabled,
  onChange,
}: ChannelToggleProps): React.ReactElement {
  return (
    <label
      htmlFor={`channel-${id}`}
      className={`flex items-center gap-2 rounded-xl border border-card-border px-3 py-2 cursor-pointer transition-colors ${
        checked
          ? "bg-primary/10 border-primary/40"
          : "bg-background hover:border-primary/40"
      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <input
        id={`channel-${id}`}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-card-border accent-primary"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

interface MessagePanelProps {
  message: string;
}

function LoadingPanel(): React.ReactElement {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <Loader2
        className="w-10 h-10 text-primary animate-spin mb-4"
        aria-hidden="true"
      />
      <p className="text-foreground/70">{`Saving your preferences…`}</p>
    </div>
  );
}

function SuccessPanel({ message }: MessagePanelProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4"
      >
        <CheckCircle2 className="w-8 h-8" aria-hidden="true" />
      </motion.div>
      <h3 className="text-2xl font-bold mb-2">Saved</h3>
      <p className="text-foreground/70">{message}</p>
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: MessagePanelProps & { onRetry: () => void }): React.ReactElement {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4"
      >
        <AlertCircle className="w-8 h-8" aria-hidden="true" />
      </motion.div>
      <h3 className="text-2xl font-bold mb-2">Something went wrong</h3>
      <p className="text-foreground/70 mb-6">{message}</p>
      <Button variant="outline" onClick={onRetry} className="w-full">
        Try again
      </Button>
    </div>
  );
}
