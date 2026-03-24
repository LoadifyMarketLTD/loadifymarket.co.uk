import { useEffect, useRef, useState } from 'react';

interface Stat {
  value: string;
  suffix?: string;
  label: string;
  description: string;
}

const STATS: Stat[] = [
  {
    value: '10,000',
    suffix: '+',
    label: 'Active Listings',
    description: 'Products listed across all categories',
  },
  {
    value: '2,500',
    suffix: '+',
    label: 'Registered Sellers',
    description: 'UK-based businesses selling on the platform',
  },
  {
    value: '98',
    suffix: '%',
    label: 'Satisfaction Rate',
    description: 'Of orders fulfilled without disputes',
  },
  {
    value: '£5M',
    suffix: '+',
    label: 'Sales Processed',
    description: 'Total marketplace transaction volume',
  },
];

/**
 * StatsSection — a dark-navy stat strip that shows key marketplace numbers.
 * Uses an IntersectionObserver so the numbers only render once visible.
 */
export default function StatsSection() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="bg-[#0A2239] py-14"
    >
      <div className="container-market">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
            Marketplace by the Numbers
          </h2>
          <p className="text-white/60 text-sm max-w-md mx-auto">
            Growing fast — powered by a community of UK buyers and sellers.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map(({ value, suffix, label, description }) => (
            <div
              key={label}
              className={`text-center transition-all duration-500 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <p className="text-3xl md:text-4xl font-extrabold text-[#D4AF37] mb-1">
                {value}
                {suffix && (
                  <span className="text-2xl md:text-3xl">{suffix}</span>
                )}
              </p>
              <p className="text-white font-bold text-sm mb-1">{label}</p>
              <p className="text-white/50 text-xs leading-snug">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
