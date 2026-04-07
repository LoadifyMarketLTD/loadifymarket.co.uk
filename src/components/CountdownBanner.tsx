import { useState, useEffect } from "react";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PROMO_END_UTC } from "@/lib/promoDeadline";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(): TimeLeft {
  const diff = Math.max(0, PROMO_END_UTC - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

interface CountdownBannerProps {
  /** "homepage" = full-width strip below hero; "inline" = compact version for /deals; "hero" = replaces pill badge in HeroSection */
  variant?: "homepage" | "inline" | "hero";
}

const CountdownBanner = ({ variant = "homepage" }: CountdownBannerProps) => {
  const [time, setTime] = useState<TimeLeft>(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const expired = time.days === 0 && time.hours === 0 && time.minutes === 0 && time.seconds === 0;

  const digits = [
    { value: time.days, label: "Days" },
    { value: time.hours, label: "Hours" },
    { value: time.minutes, label: "Mins" },
    { value: time.seconds, label: "Secs" },
  ];

  if (expired) return null;

  if (variant === "hero") {
    return (
      <div className="space-y-3">
        <p className="text-[11px] sm:text-xs font-bold text-[#64748B] uppercase tracking-[0.2em]">
          0% Commission ends in
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {digits.map((d) => (
            <div
              key={d.label}
              className="flex flex-col items-center bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-4 sm:px-4 sm:py-4 lg:py-5"
            >
              <span className="font-display text-4xl sm:text-4xl lg:text-5xl font-extrabold tabular-nums text-[#22C55E] leading-none">
                {pad(d.value)}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mt-2 leading-none">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 mt-4">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">0% Commission</p>
            <p className="text-xs text-muted-foreground">For new sellers</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {digits.map((d) => (
            <div key={d.label} className="flex flex-col items-center">
              <span className="font-display text-lg font-bold tabular-nums text-foreground bg-card border border-border rounded-md px-2 py-0.5 min-w-[2.25rem] text-center shadow-sm">
                {pad(d.value)}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">{d.label}</span>
            </div>
          ))}
        </div>

        <Link to="/signup" className="sm:ml-auto shrink-0">
          <Button size="sm" className="bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">
            Start Selling <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    );
  }

  // Homepage full-width strip
  return (
    <section className="relative border-y border-primary/10 bg-gradient-to-r from-primary/[0.04] via-primary/[0.08] to-primary/[0.04]">
      <div className="container mx-auto px-4 py-5">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          {/* Label */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center md:text-left">
              <p className="text-base sm:text-lg font-display font-bold text-foreground leading-tight">
                0% Commission for New Sellers
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Limited-time offer — list &amp; sell with zero fees
              </p>
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2">
            {digits.map((d, i) => (
              <div key={d.label} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <span className="font-display text-xl sm:text-2xl font-bold tabular-nums text-foreground bg-card border border-border rounded-lg px-3 py-1.5 min-w-[3rem] text-center shadow-sm">
                    {pad(d.value)}
                  </span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground mt-1 font-medium">{d.label}</span>
                </div>
                {i < digits.length - 1 && (
                  <span className="font-display text-xl font-bold text-muted-foreground/40 -mt-4">:</span>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <Link to="/signup" className="shrink-0">
            <Button className="bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-md shadow-primary/10">
              Start Selling Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CountdownBanner;
