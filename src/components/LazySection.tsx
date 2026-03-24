import { useRef, useState, useEffect, type ReactNode } from 'react';

interface LazySectionProps {
  children: ReactNode;
  /** How far below the viewport to start rendering (default: 300px) */
  rootMargin?: string;
  /** Optional placeholder shown until the section becomes visible */
  placeholder?: ReactNode;
}

/**
 * Defers rendering its children until the placeholder div enters (or
 * approaches) the viewport using IntersectionObserver.  Once visible the
 * children replace the placeholder and the observer is disconnected.
 *
 * Use this for below-the-fold sections to reduce the initial DOM size and
 * avoid executing component-level side effects before they are needed.
 */
export default function LazySection({
  children,
  rootMargin = '300px',
  placeholder,
}: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // IntersectionObserver is universally supported in our target browsers.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  if (visible) return <>{children}</>;
  return <div ref={ref}>{placeholder ?? null}</div>;
}
