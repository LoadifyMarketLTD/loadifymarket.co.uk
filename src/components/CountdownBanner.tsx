import { ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PROMO_END_UTC } from "@/lib/promoDeadline";
import { useCountdown } from "@/hooks/use-countdown";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

interface CountdownBannerProps {
  /** "inline" = compact version for /deals; "hero" = replaces pill badge in HeroSection */
  variant?: "inline" | "hero";
}

const CountdownBanner = ({ variant = "inline" }: CountdownBannerProps) => {
  const { days, hours, minutes, seconds, expired } = useCountdown(PROMO_END_UTC);

  const digits = [
    { value: days, label: "Days" },
    { value: hours, label: "Hours" },
    { value: minutes, label: "Mins" },
    { value: seconds, label: "Secs" },
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

  // "hero" variant — countdown tiles for HeroSection
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
};

export default CountdownBanner;
