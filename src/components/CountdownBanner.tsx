import { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(targetMs: number): TimeLeft {
  const diff = Math.max(0, targetMs - Date.now());
  return {
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/**
 * CountdownBanner — shows a dismissible promotional bar at the very top of
 * the page.  The target time is midnight of the NEXT calendar day so the
 * banner always reads as a "today only" offer without needing a hard-coded
 * end date.
 */
export default function CountdownBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('countdown_banner_dismissed') === '1';
    } catch {
      return false;
    }
  });

  // Target = midnight tonight (local time)
  const [targetMs] = useState(() => {
    const d = new Date();
    d.setHours(24, 0, 0, 0);
    return d.getTime();
  });

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(targetMs));

  useEffect(() => {
    if (dismissed) return;
    const id = setInterval(() => setTimeLeft(calcTimeLeft(targetMs)), 1_000);
    return () => clearInterval(id);
  }, [dismissed, targetMs]);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('countdown_banner_dismissed', '1');
    } catch {
      // ignore storage errors
    }
  };

  if (dismissed) return null;

  return (
    <div
      role="banner"
      className="relative z-50 bg-[#0A2239] text-white text-sm"
    >
      <div className="container-market flex items-center justify-center gap-3 py-2.5 px-4 text-center">
        <Clock className="h-4 w-4 text-[#D4AF37] flex-shrink-0" aria-hidden="true" />
        <span className="font-medium">
          🔥 Limited-time offer ends today —&nbsp;
          <span className="font-extrabold text-[#D4AF37]">
            {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
          </span>
          &nbsp;remaining
        </span>
        <button
          onClick={dismiss}
          aria-label="Dismiss banner"
          className="ml-4 text-white/60 hover:text-white transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
