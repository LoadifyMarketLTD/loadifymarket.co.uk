/**
 * MainLayout — universal layout wrapper.
 *
 * Public storefront routes use the restored focused-image-craft visual shell on
 * desktop while preserving current Loadify data/auth/commerce logic. Operational
 * workspaces keep the current app shells unchanged.
 */

import type { CSSProperties, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileAppLayout from "./MobileAppLayout";
import DesktopLayout from "./DesktopLayout";
import FocusedHomepageNavbar from "@/components/FocusedHomepageNavbar";
import Footer from "@/components/Footer";

interface MainLayoutProps {
  children: ReactNode;
}

const focusedPublicPrefixes = [
  "/catalog",
  "/category/",
  "/product/",
  "/cart",
  "/deals",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/cookies",
  "/disclaimer",
  "/returns",
  "/shipping",
  "/buyer-terms",
  "/seller-terms",
  "/faq",
  "/wholesale-info",
];

const focusedTheme = {
  "--background": "210 20% 98%",
  "--foreground": "215 25% 15%",
  "--card": "0 0% 100%",
  "--card-foreground": "215 25% 15%",
  "--popover": "0 0% 100%",
  "--popover-foreground": "215 25% 15%",
  "--primary": "217 91% 40%",
  "--primary-foreground": "0 0% 100%",
  "--secondary": "210 40% 96%",
  "--secondary-foreground": "215 25% 15%",
  "--muted": "210 25% 94%",
  "--muted-foreground": "215 15% 50%",
  "--accent": "43 96% 56%",
  "--accent-foreground": "215 25% 12%",
  "--border": "214 20% 90%",
  "--input": "214 20% 90%",
  "--ring": "217 91% 40%",
} as CSSProperties;

export default function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile();
  const location = useLocation();

  if (isMobile) {
    return <MobileAppLayout>{children}</MobileAppLayout>;
  }

  const focusedPublicRoute = focusedPublicPrefixes.some(
    (prefix) => location.pathname === prefix || location.pathname.startsWith(prefix),
  );

  if (focusedPublicRoute) {
    return (
      <div className="min-h-screen bg-background text-foreground" style={focusedTheme}>
        <FocusedHomepageNavbar />
        <div className="pt-16">{children}</div>
        <Footer />
      </div>
    );
  }

  return <DesktopLayout>{children}</DesktopLayout>;
}
