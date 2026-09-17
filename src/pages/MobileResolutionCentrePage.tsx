import MobileWorkspaceFrame from '@/components/mobile/MobileWorkspaceFrame';
import BuyerDisputes from '@/pages/pixel-perfect/buyer/BuyerDisputes';

export default function MobileResolutionCentrePage() {
  return (
    <MobileWorkspaceFrame eyebrow="Buyer protection" title="Resolution Centre">
      <BuyerDisputes />
    </MobileWorkspaceFrame>
  );
}
