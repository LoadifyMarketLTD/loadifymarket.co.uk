import { useAmbientEffects } from '@/hooks/useAmbientEffects';

/**
 * Fixed overlay layer that provides:
 *   - Fine-grain noise texture (opacity 0.025 — barely perceptible)
 *   - Gold ambient cursor glow (via CSS custom props on body)
 *   - 3D card parallax + magnetic button effects (via delegated events)
 *
 * Mount once at the root of the app (before <Header /> / <Routes />).
 * Both overlays use pointer-events: none so they never capture clicks.
 */
export default function AmbientLayer() {
  useAmbientEffects();

  return (
    <div
      aria-hidden="true"
      className="noise-layer"
    />
  );
}
