const exactPublicRoutes = new Set([
  "/catalog",
  "/cart",
  "/checkout",
  "/about",
  "/contact",
  "/deals",
  "/terms",
  "/privacy",
  "/cookies",
  "/returns-policy",
  "/returns",
  "/shipping-policy",
  "/shipping",
  "/buyer-terms",
  "/seller-terms",
  "/disclaimer",
  "/faq",
  "/help",
  "/wholesale-info",
]);

const publicPrefixes = [
  "/category/",
  "/categories/",
  "/product/",
];

const standaloneAuthRoutes = new Set([
  "/login",
  "/register",
  "/signup",
  "/trade-account",
  "/forgot-password",
  "/reset-password",
]);

export function isPublicPixelPerfectPath(pathname: string): boolean {
  if (exactPublicRoutes.has(pathname)) return true;
  return publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function hidesGlobalHeader(pathname: string): boolean {
  return isPublicPixelPerfectPath(pathname) || standaloneAuthRoutes.has(pathname);
}
