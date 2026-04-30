/**
 * SocialFollowSection
 *
 * Premium static social cards — NO iframes or live embeds.
 * Three full cards (Facebook, Instagram, TikTok), each with:
 *   • Large platform icon (28 px)
 *   • Platform-specific title ("Follow us on TikTok" etc.)
 *   • Short description
 *   • CTA button that opens the official profile in a new tab
 *
 * Visual style: dark glass background, gold hover glow, -6px floating lift —
 * consistent with the site-wide dark/gold design system.
 */

import { Facebook, Instagram } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FC, CSSProperties } from "react";
import TikTokIcon from "@/components/ui/TikTokIcon";

type IconComponent = LucideIcon | FC<{ className?: string; style?: CSSProperties; 'aria-hidden'?: string | boolean }>;

type SocialEntry = {
  platform: string;
  Icon: IconComponent;
  title: string;
  description: string;
  cta: string;
  href: string;
};

const SOCIAL_CARDS: SocialEntry[] = [
  {
    platform: "tiktok",
    Icon: TikTokIcon,
    title: "TikTok",
    description: "Short videos, trending products & seller stories.",
    cta: "Follow",
    href: "https://www.tiktok.com/@loadifymarket",
  },
  {
    platform: "instagram",
    Icon: Instagram,
    title: "Instagram",
    description: "New arrivals, visual inspiration & behind-the-scenes.",
    cta: "Follow",
    href: "https://www.instagram.com/loadifymarket",
  },
  {
    platform: "facebook",
    Icon: Facebook,
    title: "Facebook",
    description: "Latest deals, seller spotlights & marketplace news.",
    cta: "Follow",
    href: "https://www.facebook.com/loadifymarket",
  },
];

export default function SocialFollowSection() {
  return (
    <section aria-label="Follow us on social media">
      {/* Section heading */}
      <div className="mb-5 sm:mb-8 sm:text-center">
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
          Follow Loadify
        </h2>
        <p className="mt-1 text-[12px] sm:text-[13px] text-slate-400">
          Stay connected across all platforms.
        </p>
      </div>

      {/* ── Mobile: compact rows ─────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:hidden">
        {SOCIAL_CARDS.map(({ platform, Icon, title, description, cta, href }) => (
          <div
            key={platform}
            className="flex items-center gap-4 rounded-xl p-4"
            style={{
              background: "linear-gradient(145deg, #0F172A, #020617)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {/* Icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(145deg, rgba(17,24,39,0.98), rgba(2,6,23,0.98))",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <Icon className="w-6 h-6 text-slate-300" aria-hidden="true" />
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white leading-tight">{title}</p>
              <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{description}</p>
            </div>
            {/* Follow button */}
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-[11px] font-bold text-[#020617] bg-[#FBBF24] hover:bg-[#D97706] px-3 py-1.5 rounded-lg transition-colors"
            >
              {cta}
            </a>
          </div>
        ))}
      </div>

      {/* ── Desktop: 3-column card grid ──────────────────────────────── */}
      <div className="hidden sm:grid grid-cols-3 gap-6">
        {SOCIAL_CARDS.map(({ platform, Icon, title, description, cta, href }) => (
          <div
            key={platform}
            className={
              `social-card ${platform} group ` +
              `relative rounded-xl p-7 text-left ` +
              `flex flex-col gap-5 ` +
              `transition-all duration-300 ease-out ` +
              `hover:-translate-y-[6px] ` +
              `hover:shadow-[0_0_25px_rgba(251,191,36,0.15),0_16px_40px_rgba(0,0,0,0.55)]`
            }
            style={{
              background: "linear-gradient(145deg, #0F172A, #020617)",
              border: "1px solid rgba(255,255,255,0.05)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
            }}
          >
            {/* Platform icon */}
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:shadow-[0_0_18px_rgba(251,191,36,0.22)]"
              style={{
                background: "linear-gradient(145deg, rgba(17,24,39,0.98), rgba(2,6,23,0.98))",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <Icon
                className="w-7 h-7 text-slate-400 group-hover:text-[#FBBF24] transition-colors duration-300"
                aria-hidden="true"
              />
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-semibold text-white leading-snug mb-2">Follow us on {title}</h3>
              <p className="text-[13px] text-slate-400 leading-relaxed">{description}</p>
            </div>
            {/* CTA button */}
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={
                "inline-flex items-center justify-center gap-2 " +
                "px-5 py-2.5 rounded-lg text-[13px] font-semibold " +
                "border border-[#FBBF24]/30 text-[#FBBF24] " +
                "hover:bg-[#FBBF24] hover:text-[#020617] hover:border-[#FBBF24] " +
                "transition-all duration-200 " +
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60"
              }
            >
              {cta}
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}