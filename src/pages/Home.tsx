import { useEffect } from 'react';
import SEO from '@/components/SEO';
import MainLayout from '@/layouts/MainLayout';
import UserSourceVisualRestore from '@/components/inspection/UserSourceVisualRestore';
import { trackViewHome } from '@/lib/analytics';

/**
 * Visual-inspection branch only.
 *
 * The homepage on this branch intentionally renders the user-supplied visual
 * direction recovered from focused-image-craft: bright white/blue marketplace,
 * warehouse-led hero and image-first category cards. Runtime commerce/backend
 * code is not replaced; this branch exists only for visual inspection.
 */
export default function Home() {
  useEffect(() => { trackViewHome(); }, []);

  return (
    <MainLayout>
      <SEO
        title="Loadify Market — User Source Visual Inspection"
        description="Visual inspection of the supplied Loadify Market marketplace direction."
        canonical="/"
      />
      <main id="main-content">
        <UserSourceVisualRestore />
      </main>
    </MainLayout>
  );
}
