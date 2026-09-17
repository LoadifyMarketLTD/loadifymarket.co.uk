import MobileWorkspaceFrame from '@/components/mobile/MobileWorkspaceFrame';
import BuyerAddresses from '@/pages/pixel-perfect/buyer/BuyerAddresses';

export default function MobileDeliveryAddressesPage() {
  return (
    <MobileWorkspaceFrame eyebrow="Buyer account" title="Delivery addresses">
      <BuyerAddresses />
    </MobileWorkspaceFrame>
  );
}
