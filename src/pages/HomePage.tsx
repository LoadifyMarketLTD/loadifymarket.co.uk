import { lazy, Suspense } from 'react';
import CinematicHero from '../components/cinematic/CinematicHero';

const HomeBelowFold = lazy(() => import('../components/HomeBelowFold'));

// ─────────────────────────────────────────────────────────────────────────────
// Page structure (spec order):
//   §1  Hero            — CinematicHero
//   §2  Trust section   — HomeBelowFold
//   §3  What You Can Sell
//   §4  Why Sellers Choose Us
//   §5  How It Works
//   §6  Profit section
//   §7  Urgency section
//   §8  Final CTA
// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="bg-white">
      <CinematicHero />
      <Suspense fallback={null}>
        <HomeBelowFold />
      </Suspense>
    </div>
  );
}
