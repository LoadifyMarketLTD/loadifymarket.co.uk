import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isCapacitorContext } from '@/lib/capacitorUtils';

const CLASS_NAMES = [
  'loadify-seller-listing-route',
  'loadify-seller-products-route',
  'loadify-admin-products-route',
  'loadify-admin-settings-route',
  'loadify-native-product-route',
  'loadify-native-catalog-route',
  'loadify-native-category-route',
  'loadify-native-inbox-route',
] as const;

const SELLER_LISTING_ROUTE = /^\/seller\/products\/(?:new|[^/]+\/edit)\/?$/;
const SELLER_PRODUCTS_ROUTE = /^\/seller\/products\/?$/;
const ADMIN_PRODUCTS_ROUTE = /^\/admin\/products\/?$/;
const ADMIN_SETTINGS_ROUTE = /^\/admin\/settings\/?$/;
const PRODUCT_ROUTE = /^\/product\/[^/]+\/?$/;
const CATALOG_ROUTE = /^\/catalog\/?$/;
const CATEGORY_ROUTE = /^\/category\/[^/]+\/?$/;
const INBOX_ROUTE = /^\/inbox(?:\/[^/]+)?\/?$/;

const LEGACY_APPROVAL_COPY =
  'Use Save as Draft to continue editing later, or Publish to submit for admin approval.';
const DIRECT_PUBLISH_COPY =
  'Use Save as Draft to continue editing later, or Publish Listing to make your product live on the marketplace.';

function repairLegacySellerPublishCopy(): void {
  for (const paragraph of document.querySelectorAll('p')) {
    if (paragraph.textContent?.trim() === LEGACY_APPROVAL_COPY) {
      paragraph.textContent = DIRECT_PUBLISH_COPY;
    }
  }
}

/**
 * Adds narrow route classes used by compatibility/polish CSS without changing
 * the visual treatment of unrelated Marketplace, Workspace or Admin screens.
 *
 * The native marketplace route classes are added only inside Capacitor. They
 * provide a hard CSS boundary so approved mobile-web polish cannot leak into
 * the established installed-app identity on Product, Catalog, Category or
 * Inbox/Chat routes.
 *
 * The legacy ProductFormPage still contains one pre-approval sentence. Until
 * that large form is decomposed into smaller components, replace only that
 * exact sentence at runtime so the seller is never told that owner approval is
 * required. The backend/database remain the authority for publication safety.
 */
export default function RouteSurfaceClass() {
  const { pathname } = useLocation();

  useEffect(() => {
    const root = document.documentElement;
    const sellerListing = SELLER_LISTING_ROUTE.test(pathname);
    const native = isCapacitorContext();

    root.classList.toggle('loadify-seller-listing-route', sellerListing);
    root.classList.toggle('loadify-seller-products-route', SELLER_PRODUCTS_ROUTE.test(pathname));
    root.classList.toggle('loadify-admin-products-route', ADMIN_PRODUCTS_ROUTE.test(pathname));
    root.classList.toggle('loadify-admin-settings-route', ADMIN_SETTINGS_ROUTE.test(pathname));
    root.classList.toggle('loadify-native-product-route', native && PRODUCT_ROUTE.test(pathname));
    root.classList.toggle('loadify-native-catalog-route', native && CATALOG_ROUTE.test(pathname));
    root.classList.toggle('loadify-native-category-route', native && CATEGORY_ROUTE.test(pathname));
    root.classList.toggle('loadify-native-inbox-route', native && INBOX_ROUTE.test(pathname));

    let observer: MutationObserver | null = null;
    if (sellerListing) {
      repairLegacySellerPublishCopy();
      observer = new MutationObserver(repairLegacySellerPublishCopy);
      const appRoot = document.getElementById('root');
      if (appRoot) observer.observe(appRoot, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      for (const className of CLASS_NAMES) root.classList.remove(className);
    };
  }, [pathname]);

  return null;
}
