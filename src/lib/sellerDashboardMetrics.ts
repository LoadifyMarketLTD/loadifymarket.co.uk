export const RECOGNISED_SELLER_SALE_STATUSES = new Set([
  'paid',
  'packed',
  'shipped',
  'delivered',
  'completed',
]);

export interface SellerDashboardProductInput {
  id: string;
  title: string;
  views?: number | null;
  addToCartCount?: number | null;
}

export interface SellerDashboardOrderInput {
  id: string;
  status: string;
}

export interface SellerDashboardOrderItemInput {
  orderId: string;
  productId: string;
  quantity: number | string;
  subtotal: number | string;
}

export interface SellerProductMetric {
  id: string;
  title: string;
  views: number;
  cartAdds: number;
  orderCount: number;
  unitsSold: number;
  salesAmount: number;
  conversionRate: number;
}

/**
 * Build seller-facing product metrics from canonical order + order-item truth.
 *
 * Important semantics:
 * - cartAdds is engagement only; it is never an order count;
 * - orderCount is the number of distinct recognised commercial orders that
 *   contain the product;
 * - unitsSold is the quantity across those recognised orders;
 * - salesAmount is the sum of order_items.subtotal for those orders;
 * - refunded/cancelled/unpaid orders are excluded by status.
 *
 * This is deliberately pure and read-only so the UI can be tested without any
 * database mutation or service-role access.
 */
export function buildSellerProductMetrics(
  products: SellerDashboardProductInput[],
  orders: SellerDashboardOrderInput[],
  orderItems: SellerDashboardOrderItemInput[],
): SellerProductMetric[] {
  const recognisedOrderIds = new Set(
    orders
      .filter((order) => RECOGNISED_SELLER_SALE_STATUSES.has(order.status))
      .map((order) => order.id),
  );

  const aggregates = new Map<
    string,
    { orderIds: Set<string>; unitsSold: number; salesAmount: number }
  >();

  for (const item of orderItems) {
    if (!recognisedOrderIds.has(item.orderId)) continue;

    const current = aggregates.get(item.productId) ?? {
      orderIds: new Set<string>(),
      unitsSold: 0,
      salesAmount: 0,
    };

    current.orderIds.add(item.orderId);
    current.unitsSold += Math.max(0, Number(item.quantity) || 0);
    current.salesAmount += Math.max(0, Number(item.subtotal) || 0);
    aggregates.set(item.productId, current);
  }

  return products
    .map((product) => {
      const aggregate = aggregates.get(product.id);
      const views = Math.max(0, Number(product.views) || 0);
      const orderCount = aggregate?.orderIds.size ?? 0;

      return {
        id: product.id,
        title: product.title,
        views,
        cartAdds: Math.max(0, Number(product.addToCartCount) || 0),
        orderCount,
        unitsSold: aggregate?.unitsSold ?? 0,
        salesAmount: aggregate?.salesAmount ?? 0,
        conversionRate: views > 0 ? (orderCount / views) * 100 : 0,
      };
    })
    .sort((a, b) =>
      b.salesAmount - a.salesAmount
      || b.orderCount - a.orderCount
      || b.unitsSold - a.unitsSold
      || b.views - a.views
      || b.cartAdds - a.cartAdds,
    );
}
