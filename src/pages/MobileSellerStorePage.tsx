import MobileWorkspaceFrame from '@/components/mobile/MobileWorkspaceFrame';
import SellerProfile from '@/pages/pixel-perfect/seller/SellerProfile';

export default function MobileSellerStorePage() {
  return (
    <MobileWorkspaceFrame eyebrow="Seller account" title="Your store">
      <SellerProfile />
    </MobileWorkspaceFrame>
  );
}
