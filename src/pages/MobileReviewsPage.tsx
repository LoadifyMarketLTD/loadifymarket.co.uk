import MobileWorkspaceFrame from '@/components/mobile/MobileWorkspaceFrame';
import BuyerReviews from '@/pages/pixel-perfect/buyer/BuyerReviews';

export default function MobileReviewsPage() {
  return (
    <MobileWorkspaceFrame eyebrow="Your purchases" title="Reviews">
      <BuyerReviews />
    </MobileWorkspaceFrame>
  );
}
