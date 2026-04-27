export type SocialPlatform = 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'tiktok';

/** Accepts Lucide icons or any custom SVG component with the same prop surface. */
type IconComponent = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean | string;
}>;

interface SocialCardProps {
  href: string;
  label: string;
  Icon: IconComponent;
  platform: SocialPlatform;
  /** "footer" renders slightly smaller (42×42 px, 18px icon) */
  size?: 'default' | 'footer';
}

/**
 * Premium dark/gold rounded social card.
 * Platform-specific hover box-shadows (subtle brand-colour glow) are applied via
 * the `.social-card.{platform}:hover` rules in index.css.
 * The shine sweep ::after is also in index.css.
 */
export default function SocialCard({ href, label, Icon, platform, size = 'default' }: SocialCardProps) {
  const sizeClass = size === 'footer' ? 'w-[42px] h-[42px]' : 'w-[46px] h-[46px]';
  const iconSize  = size === 'footer' ? 'w-[18px] h-[18px]' : 'w-[19px] h-[19px]';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      /* The `social-card {platform}` classes carry the ::after shine + platform hover shadow via CSS */
      className={
        `social-card ${platform} group ` +
        `${sizeClass} inline-flex items-center justify-center rounded-full ` +
        `border border-white/[0.07] ` +
        `shadow-[0_10px_24px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)] ` +
        `transition-all duration-[280ms] ease-out ` +
        `hover:-translate-y-1 hover:scale-[1.04] ` +
        `hover:border-yellow-400/[0.34]`
      }
      style={{
        background:
          'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.10), transparent 32%), ' +
          'linear-gradient(145deg, rgba(17,24,39,0.98), rgba(2,6,23,0.98))',
      }}
    >
      <Icon
        className={
          `relative z-10 ${iconSize} text-slate-400 ` +
          `group-hover:text-[#FBBF24] group-hover:scale-110 ` +
          `transition-all duration-[280ms]`
        }
        style={{ filter: 'none' }}
        aria-hidden="true"
      />
    </a>
  );
}
