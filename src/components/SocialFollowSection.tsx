/**
 * SocialFollowSection
 *
 * Premium static social cards — NO iframes or live embeds.
 * Three cards (Facebook, Instagram, TikTok), each with:
 *   • Platform icon
 *   • Short title + one-line description
 *   • "Follow Us →" link that opens the official profile in a new tab
 *
 * Visual style: dark glass background, gold hover glow, floating lift effect —
 * consistent with the site-wide dark/gold design system.
 */

import { Facebook, Instagram } from "lucide-react";
import TikTokIcon from "@/components/ui/TikTokIcon";

type SocialEntry = {
  platform: string;
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | string }>;
  name: string;
  description: string;
  href: string;
};

const SOCIAL_CARDS: SocialEntry[] = [
  {
    platform: "facebook",
    Icon: Facebook,
    name: "Facebook",
    description: "Latest deals, seller spotlights & marketplace news.",
    href: "https://www.facebook.com/loadifymarket",
  },
  {
    platform: "instagram",
    Icon: Instagram,
    name: "Instagram",
    description: "New arrivals, visual inspiration & behind-the-scenes.",
    href: "https://www.instagram.com/loadifymarket",
  },
  {
    platform: "tiktok",
    Icon: TikTokIcon,
    name: "TikTok",
    description: "Short videos, trending products & seller stories.",
    href: "https://www.tiktok.com/@loadifymarket",
  },
];

export default function SocialFollowSection() {
  return (
    <section aria-label="Follow us on social media">
      {/* Heading */}
      <div className="mb-6">
        <h2 className="text-lg font-bold tracking-tight text-white">
          Follow Us
        </h2>
        <p className="mt-1 text-[13px] text-slate-400">
          Stay connected with Loadify Market across social platforms.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {SOCIAL_CARDS.map(({ platform, Icon, name, description, href }) => (
          <div
            key={platform}
            /* Reuse the .social-card CSS class so the ::after shine sweep + platform
               hover glow from index.css apply automatically. */
            className={
              `social-card ${platform} group ` +
              `relative rounded-xl border border-white/[0.07] p-6 ` +
              `flex flex-col gap-4 ` +
              `shadow-[0_10px_24px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)] ` +
              `transition-all duration-300 ease-out ` +
              `hover:-translate-y-1.5 hover:border-yellow-400/[0.25] ` +
              `hover:shadow-[0_0_25px_rgba(251,191,36,0.15),0_16px_40px_rgba(0,0,0,0.55)]`
            }
            style={{
              background:
                "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.05), transparent 40%), " +
                "linear-gradient(145deg, #0B1220, #0F172A)",
            }}
          >
            {/* Platform icon */}
            <div
              className={
                `w-11 h-11 rounded-full border border-white/[0.07] ` +
                `flex items-center justify-center shrink-0 ` +
                `shadow-[0_4px_12px_rgba(0,0,0,0.4)] ` +
                `transition-all duration-300 ` +
                `group-hover:border-yellow-400/[0.3] ` +
                `group-hover:shadow-[0_0_14px_rgba(251,191,36,0.18)]`
              }
              style={{
                background:
                  "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.10), transparent 32%), " +
                  "linear-gradient(145deg, rgba(17,24,39,0.98), rgba(2,6,23,0.98))",
              }}
            >
              <Icon
                className={
                  "w-5 h-5 text-slate-400 " +
                  "group-hover:text-[#FBBF24] transition-colors duration-300"
                }
                aria-hidden="true"
              />
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-white leading-snug mb-1">
                {name}
              </h3>
              <p className="text-[13px] text-slate-400 leading-relaxed">
                {description}
              </p>
            </div>

            {/* CTA link */}
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={
                "inline-flex items-center gap-1.5 " +
                "text-[13px] font-semibold text-[#FBBF24] " +
                "hover:text-white transition-colors duration-200 " +
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60 focus-visible:rounded"
              }
            >
              Follow Us
              {/* Arrow icon */}
              <svg
                className="w-3.5 h-3.5 shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.22 14.78a.75.75 0 0 0 1.06 0l7.22-7.22v5.69a.75.75 0 0 0 1.5 0v-7.5a.75.75 0 0 0-.75-.75h-7.5a.75.75 0 0 0 0 1.5h5.69l-7.22 7.22a.75.75 0 0 0 0 1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
