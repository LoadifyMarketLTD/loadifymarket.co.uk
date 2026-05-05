import { useEffect } from 'react';

/**
 * Ambient interaction layer — gold cursor glow, 3D card parallax, magnetic buttons.
 * All effects are skipped on mobile (< 768 px) for performance and usability.
 * Call once at the top of the component tree (e.g. AmbientLayer).
 */
export function useAmbientEffects() {
  useEffect(() => {
    const isMobile = window.innerWidth < 768;

    // ── 1. Gold cursor glow via CSS custom properties ─────────────────────────
    const handleMouseMove = (e: MouseEvent) => {
      document.body.style.setProperty('--cursor-x', `${e.clientX}px`);
      document.body.style.setProperty('--cursor-y', `${e.clientY}px`);
    };

    if (!isMobile) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    // ── 2. Card 3D parallax (event delegation) ────────────────────────────────
    const handleCardMove = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const card = e.target.closest<HTMLElement>('[data-parallax]');
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const rotateX = ((e.clientY - rect.top) / rect.height - 0.5) * -6;
      const rotateY = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    };

    const handleCardLeave = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const card = e.target.closest<HTMLElement>('[data-parallax]');
      if (card) card.style.transform = 'translateY(0)';
    };

    if (!isMobile) {
      document.addEventListener('mousemove', handleCardMove, { passive: true });
      document.addEventListener('mouseleave', handleCardLeave, { passive: true });
    }

    // ── 3. Magnetic buttons (event delegation) ────────────────────────────────
    const handleBtnMove = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const btn = e.target.closest<HTMLElement>('[data-magnetic]');
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const moveX = (e.clientX - rect.left - rect.width / 2) * 0.15;
      const moveY = (e.clientY - rect.top - rect.height / 2) * 0.15;
      btn.style.transform = `translate(${moveX}px, ${moveY}px)`;
    };

    const handleBtnLeave = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const btn = e.target.closest<HTMLElement>('[data-magnetic]');
      if (btn) btn.style.transform = 'translate(0, 0)';
    };

    if (!isMobile) {
      document.addEventListener('mousemove', handleBtnMove, { passive: true });
      document.addEventListener('mouseleave', handleBtnLeave, { passive: true });
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleCardMove);
      document.removeEventListener('mouseleave', handleCardLeave);
      document.removeEventListener('mousemove', handleBtnMove);
      document.removeEventListener('mouseleave', handleBtnLeave);
      document.body.style.removeProperty('--cursor-x');
      document.body.style.removeProperty('--cursor-y');
    };
  }, []);
}
