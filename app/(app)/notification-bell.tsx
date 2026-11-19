"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  FiAlertCircle,
  FiBell,
  FiCheck,
  FiCheckCircle,
  FiInbox,
  FiPlusCircle,
  FiSend,
  FiSlash,
  FiTrash2,
  FiXCircle,
} from "react-icons/fi";
import type {
  NotificationItem,
  NotificationType,
  NotificationsPayload,
} from "@/lib/notification-types";
import {
  clearReadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  removeNotification,
} from "./notifications/actions";

const POLL_MS = 30_000;

const TYPE_STYLE: Record<NotificationType, { icon: ReactNode; tone: string }> = {
  booking_submitted: { icon: <FiPlusCircle />, tone: "bg-blue-100 text-blue-700" },
  booking_reviewed: { icon: <FiSend />, tone: "bg-orange-100 text-orange-600" },
  booking_approved: { icon: <FiCheckCircle />, tone: "bg-green-100 text-green-700" },
  booking_rejected: { icon: <FiXCircle />, tone: "bg-red-100 text-red-600" },
  booking_cancelled: { icon: <FiSlash />, tone: "bg-gray-200 text-gray-600" },
  review_ping: { icon: <FiAlertCircle />, tone: "bg-yellow-100 text-yellow-700" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Fixed to Philippine time (UTC+8, no DST) and built by hand so server and browser
// render identical text (Intl output differs between Node and browsers).
function formatStamp(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${((h + 11) % 12) + 1}:${m} ${h < 12 ? "AM" : "PM"}`;
}

export function NotificationBell({ initial }: { initial: NotificationsPayload }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>(initial.items);
  const [unread, setUnread] = useState(initial.unread);
  // "Delete all read" asks for a second click, so a stray click cannot wipe the list.
  const [confirmClear, setConfirmClear] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as NotificationsPayload;
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      // Offline or session expired: keep showing what we have.
    }
  }, []);

  // Pick up new notifications without a page reload.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    void refresh();
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, refresh]);

  function markOneRead(id: number) {
    const target = items.find((n) => n.id === id);
    if (!target || target.read) return;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
    void markNotificationRead(id).catch(() => void refresh());
  }

  function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
    void markAllNotificationsRead().catch(() => void refresh());
  }

  function deleteOne(id: number) {
    const target = items.find((n) => n.id === id);
    if (!target) return;
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (!target.read) setUnread((c) => Math.max(0, c - 1));
    void removeNotification(id).catch(() => void refresh());
  }

  const readCount = items.filter((n) => n.read).length;

  function deleteAllRead() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    setItems((prev) => prev.filter((n) => !n.read));
    // Reload afterwards: older read notifications beyond the visible list were deleted too.
    void clearReadNotifications().then(refresh, refresh);
  }

  // Forget a half-made "are you sure" after a few seconds, or when the panel closes.
  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(() => setConfirmClear(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmClear]);
  useEffect(() => {
    if (!open) setConfirmClear(false);
  }, [open]);

  const badge = unread > 9 ? "9+" : String(unread);

  return (
    <div ref={ref}>
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-2xl hover:bg-accent-4 focus:outline-2 focus:outline-offset-2 focus:outline-accent-1"
      >
        <FiBell aria-hidden="true" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-2 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-container"
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Notifications"
          className="absolute right-0 top-full z-20 mt-2 w-[26rem] max-w-[90vw] overflow-hidden rounded-lg bg-container shadow-lg ring-1 ring-black/10"
        >
          <div className="flex items-center justify-between border-b border-accent-6 px-4 py-3">
            <h2 className="text-base font-bold">Notifications</h2>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={markAll}
                disabled={unread === 0}
                className="text-sm font-semibold text-accent-1 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
              >
                Mark all as read
              </button>
              <button
                type="button"
                onClick={deleteAllRead}
                disabled={readCount === 0}
                title="Deletes only the notifications you have already read"
                className={`text-sm font-semibold hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline ${
                  confirmClear ? "text-red-600" : "text-accent-1"
                }`}
              >
                {confirmClear ? "Click again to confirm" : "Delete all read"}
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-gray-500">
              <FiInbox aria-hidden="true" className="text-3xl" />
              <p className="text-sm">You&apos;re all caught up.</p>
            </div>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-accent-6 overflow-y-auto">
              {items.map((n) => {
                const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.booking_reviewed;
                return (
                  <li key={n.id} className={`flex items-stretch ${n.read ? "" : "bg-accent-1/5"}`}>
                    <Link
                      href={n.href}
                      onClick={() => {
                        markOneRead(n.id);
                        setOpen(false);
                      }}
                      className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 hover:bg-accent-4"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${style.tone}`}
                      >
                        {style.icon}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`line-clamp-3 text-sm wrap-break-word ${n.read ? "" : "font-semibold"}`}
                        >
                          {n.message}
                        </span>
                        <span className="mt-1 block text-xs font-semibold text-gray-500">
                          {formatStamp(n.createdAt)}
                        </span>
                      </span>
                    </Link>

                    {/* Mark-as-read on top (unread only), delete always at the bottom right. */}
                    <div className="flex shrink-0 flex-col items-center justify-between gap-1 py-2 pr-2">
                      {n.read ? (
                        <span aria-hidden="true" className="h-8 w-8" />
                      ) : (
                        <button
                          type="button"
                          aria-label="Mark as read"
                          title="Mark as read"
                          onClick={() => markOneRead(n.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-accent-6 hover:text-accent-1"
                        >
                          <FiCheck aria-hidden="true" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Delete notification"
                        title="Delete notification"
                        onClick={() => deleteOne(n.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600"
                      >
                        <FiTrash2 aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
