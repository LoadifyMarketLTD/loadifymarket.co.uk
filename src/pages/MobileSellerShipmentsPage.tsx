import MobileWorkspaceFrame from '@/components/mobile/MobileWorkspaceFrame';
import SellerShipments from '@/pages/pixel-perfect/seller/SellerShipments';

export default function MobileSellerShipmentsPage() {
  return (
    <MobileWorkspaceFrame eyebrow="Marketplace orders" title="Seller fulfilment">
      <SellerShipments />
    </MobileWorkspaceFrame>
  );
}
