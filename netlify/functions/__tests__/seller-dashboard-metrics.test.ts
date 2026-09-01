import { describe, expect, it } from 'vitest';
import { buildSellerProductMetrics } from '../../../src/lib/sellerDashboardMetrics';

describe('seller dashboard product metrics', () => {
  it('keeps cart adds separate from real orders and sales', () => {
    const metrics = buildSellerProductMetrics(
      [
        { id: 'p1', title: 'Product One', views: 20, addToCartCount: 7 },
        { id: 'p2', title: 'Product Two', views: 100, addToCartCount: 30 },
      ],
      [
        { id: 'o-paid', status: 'paid' },
        { id: 'o-delivered', status: 'delivered' },
        { id: 'o-cancelled', status: 'cancelled' },
        { id: 'o-refunded', status: 'refunded' },
      ],
      [
        { orderId: 'o-paid', productId: 'p1', quantity: 2, subtotal: 40 },
        { orderId: 'o-delivered', productId: 'p1', quantity: 1, subtotal: 20 },
        { orderId: 'o-cancelled', productId: 'p1', quantity: 9, subtotal: 180 },
        { orderId: 'o-refunded', productId: 'p1', quantity: 3, subtotal: 60 },
      ],
    );

    expect(metrics[0]).toMatchObject({
      id: 'p1',
      views: 20,
      cartAdds: 7,
      orderCount: 2,
      unitsSold: 3,
      salesAmount: 60,
    });
    expect(metrics[0].conversionRate).toBe(10);

    expect(metrics[1]).toMatchObject({
      id: 'p2',
      views: 100,
      cartAdds: 30,
      orderCount: 0,
      unitsSold: 0,
      salesAmount: 0,
    });
  });

  it('counts one order once when the same product has multiple item rows', () => {
    const [metric] = buildSellerProductMetrics(
      [{ id: 'p1', title: 'Product One', views: 10, addToCartCount: 4 }],
      [{ id: 'o1', status: 'shipped' }],
      [
        { orderId: 'o1', productId: 'p1', quantity: 1, subtotal: '12.50' },
        { orderId: 'o1', productId: 'p1', quantity: '2', subtotal: '25.00' },
      ],
    );

    expect(metric.orderCount).toBe(1);
    expect(metric.unitsSold).toBe(3);
    expect(metric.salesAmount).toBe(37.5);
    expect(metric.cartAdds).toBe(4);
  });

  it('sorts by actual commercial performance before engagement', () => {
    const metrics = buildSellerProductMetrics(
      [
        { id: 'high-views', title: 'High Views', views: 1000, addToCartCount: 100 },
        { id: 'seller', title: 'Seller', views: 10, addToCartCount: 2 },
      ],
      [{ id: 'o1', status: 'completed' }],
      [{ orderId: 'o1', productId: 'seller', quantity: 1, subtotal: 15 }],
    );

    expect(metrics.map((metric) => metric.id)).toEqual(['seller', 'high-views']);
  });
});
