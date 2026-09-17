import MobileWorkspaceFrame from '@/components/mobile/MobileWorkspaceFrame';
import SellerProducts from '@/pages/pixel-perfect/seller/SellerProducts';

export default function MobileSellerListingsPage() {
  return (
    <MobileWorkspaceFrame eyebrow="Seller catalogue" title="My listings">
      <SellerProducts />
    </MobileWorkspaceFrame>
  );
}
