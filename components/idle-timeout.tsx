"use client";

import * as React from "react";
import { signOut, useSession } from "next-auth/react";

// 30 minutes of inactivity = auto sign-out (Jobber/ServiceTitan standard).
// Warning modal appears 2 minutes before sign-out so users can stay in.
const IDLE_MS = 30 * 60 * 1000;
const WARN_BEFORE_MS = 2 * 60 * 1000;

// Throttle activity-event handling so we don't reset on every mousemove pixel.
const ACTIVITY_THROTTLE_MS = 1000;

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
] as const;

export function IdleTimeout() {
  const { status } = useSession();
  const [warningOpen, setWarningOpen] = React.useState(false);
  const [remainingSec, setRemainingSec] = React.useState(
    Math.floor(WARN_BEFORE_MS / 1000),
  );

  const lastActivityRef = React.useRef<number>(Date.now());
  const lastThrottleRef = React.useRef<number>(0);
  const warnTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const signOutTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const countdownRef = React.useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const clearTimers = React.useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (signOutTimerRef.current) clearTimeout(signOutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    warnTimerRef.current = null;
    signOutTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const scheduleTimers = React.useCallback(() => {
    clearTimers();
    warnTimerRef.current = setTimeout(() => {
      setRemainingSec(Math.floor(WARN_BEFORE_MS / 1000));
      setWarningOpen(true);
      // Tick the visible countdown each second.
      countdownRef.current = setInterval(() => {
        setRemainingSec((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
    }, IDLE_MS - WARN_BEFORE_MS);

    signOutTimerRef.current = setTimeout(() => {
      void signOut({ callbackUrl: "/login" });
    }, IDLE_MS);
  }, [clearTimers]);

  const resetIdle = React.useCallback(() => {
    lastActivityRef.current = Date.now();
    if (warningOpen) setWarningOpen(false);
    scheduleTimers();
  }, [scheduleTimers, warningOpen]);

  // Only run while authenticated.
  React.useEffect(() => {
    if (status !== "authenticated") {
      clearTimers();
      setWarningOpen(false);
      return;
    }

    scheduleTimers();

    const onActivity = () => {
      const now = Date.now();
      if (now - lastThrottleRef.current < ACTIVITY_THROTTLE_MS) return;
      lastThrottleRef.current = now;
      // While the warning is showing, activity does NOT auto-dismiss — user
      // must click "Stay signed in". Prevents accidental scroll resets.
      if (warningOpen) return;
      resetIdle();
    };

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, onActivity, { passive: true }),
    );

    return () => {
      ACTIVITY_EVENTS.forEach((ev) =>
        window.removeEventListener(ev, onActivity),
      );
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status !== "authenticated" || !warningOpen) return null;

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-timeout-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-border">
        <div className="p-6">
          <h2
            id="idle-timeout-title"
            className="text-lg font-bold text-n-900 mb-2"
          >
            Still there?
          </h2>
          <p className="text-sm text-muted mb-1">
            You&rsquo;ll be signed out in
          </p>
          <p className="text-4xl font-bold text-accent tabular-nums mb-4">
            {timeStr}
          </p>
          <p className="text-sm text-muted mb-6">
            For your security, Paradise Academy signs you out after 30 minutes
            of inactivity.
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={resetIdle}
              className="w-full rounded-full bg-accent text-white font-medium py-2.5 text-sm shadow-sm hover:bg-pw-orange-deep active:scale-[0.97] transition"
            >
              Stay signed in
            </button>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/login" })}
              className="w-full rounded-full bg-transparent text-n-700 font-medium py-2.5 text-sm hover:bg-n-50 active:scale-[0.97] transition"
            >
              Sign out now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
