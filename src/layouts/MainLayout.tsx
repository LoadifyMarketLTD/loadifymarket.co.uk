import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { isPublicPixelPerfectPath } from "@/lib/publicPixelPerfectRoutes";
import PublicNavbar from "@/components/pixel-perfect/PublicNavbar";
import PublicPixelPerfectLayout from "./PublicPixelPerfectLayout";
import MobileAppLayout from "./MobileAppLayout";
import DesktopLayout from "./DesktopLayout";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const location = useLocation();

  if (isPublicPixelPerfectPath(location.pathname)) {
    return (
      <PublicPixelPerfectLayout navbar={<PublicNavbar />}>
        {children}
      </PublicPixelPerfectLayout>
    );
  }

  return isMobile
    ? <MobileAppLayout>{children}</MobileAppLayout>
    : <DesktopLayout>{children}</DesktopLayout>;
}
