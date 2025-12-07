/**
 * Admin Export Utilities
 * Functions for exporting data to CSV format
 */

import type { Order as OrderType, Product as ProductType, User as UserType } from '../types';

export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
}

export const exportToCSV = (data: ExportData, filename: string) => {
  // Convert data to CSV format
  const csvContent = [
    data.headers.join(','),
    ...data.rows.map(row => row.map(cell => {
      // Handle cells with commas by wrapping in quotes
      const cellStr = String(cell);
      return cellStr.includes(',') ? `"${cellStr}"` : cellStr;
    }).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const prepareOrdersExport = (orders: OrderType[]): ExportData => {
  return {
    headers: [
      'Order Number',
      'Date',
      'Customer',
      'Subtotal',
      'VAT',
      'Total',
      'Commission',
      'Status',
    ],
    rows: orders.map(order => [
      order.orderNumber,
      new Date(order.createdAt).toLocaleDateString(),
      order.buyerId,
      (order.subtotal || 0).toFixed(2),
      (order.vatAmount || 0).toFixed(2),
      order.total.toFixed(2),
      (order.commission || 0).toFixed(2),
      order.status,
    ]),
  };
};

export const prepareSalesExport = (orders: OrderType[]): ExportData => {
  interface SalesByDate {
    date: string;
    orderCount: number;
    subtotal: number;
    vat: number;
    total: number;
    commission: number;
  }

  // Group by seller
  const salesByDate = orders.reduce((acc, order) => {
    const date = new Date(order.createdAt).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = {
        date,
        orderCount: 0,
        subtotal: 0,
        vat: 0,
        total: 0,
        commission: 0,
      };
    }
    acc[date].orderCount++;
    acc[date].subtotal += order.subtotal || 0;
    acc[date].vat += order.vatAmount || 0;
    acc[date].total += order.total;
    acc[date].commission += order.commission || 0;
    return acc;
  }, {} as Record<string, SalesByDate>);

  const rows = Object.values(salesByDate).map((day) => [
    day.date,
    day.orderCount,
    day.subtotal.toFixed(2),
    day.vat.toFixed(2),
    day.total.toFixed(2),
    day.commission.toFixed(2),
  ]);

  return {
    headers: ['Date', 'Orders', 'Subtotal', 'VAT (20%)', 'Total', 'Commission (7%)'],
    rows,
  };
};

export const prepareCommissionExport = (orders: OrderType[]): ExportData => {
  return {
    headers: [
      'Order Number',
      'Date',
      'Seller',
      'Order Total',
      'Commission (7%)',
      'Status',
    ],
    rows: orders.map(order => [
      order.orderNumber,
      new Date(order.createdAt).toLocaleDateString(),
      order.sellerId || '',
      order.total.toFixed(2),
      (order.commission || 0).toFixed(2),
      order.status,
    ]),
  };
};

export const prepareVATExport = (orders: OrderType[]): ExportData => {
  interface VATByMonth {
    month: string;
    orderCount: number;
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
  }

  // Group by month
  const vatByMonth = orders.reduce((acc, order) => {
    const date = new Date(order.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        orderCount: 0,
        netAmount: 0,
        vatAmount: 0,
        grossAmount: 0,
      };
    }
    
    acc[monthKey].orderCount++;
    acc[monthKey].netAmount += order.subtotal || 0;
    acc[monthKey].vatAmount += order.vatAmount || 0;
    acc[monthKey].grossAmount += order.total;
    
    return acc;
  }, {} as Record<string, VATByMonth>);

  const rows = Object.values(vatByMonth).map((month) => [
    month.month,
    month.orderCount,
    month.netAmount.toFixed(2),
    month.vatAmount.toFixed(2),
    month.grossAmount.toFixed(2),
  ]);

  return {
    headers: ['Month', 'Orders', 'Net Amount', 'VAT (20%)', 'Gross Amount'],
    rows,
  };
};

export const prepareProductsExport = (products: ProductType[]): ExportData => {
  return {
    headers: [
      'Product ID',
      'Title',
      'Type',
      'Category',
      'Price',
      'Stock',
      'Status',
      'Approved',
      'Created',
    ],
    rows: products.map(product => [
      product.id.substring(0, 8),
      product.title,
      product.type,
      product.categoryId,
      product.price.toFixed(2),
      product.stockQuantity || 0,
      product.isActive ? 'Active' : 'Inactive',
      product.isApproved ? 'Yes' : 'No',
      new Date(product.createdAt).toLocaleDateString(),
    ]),
  };
};

export const prepareUsersExport = (users: UserType[]): ExportData => {
  return {
    headers: [
      'User ID',
      'Name',
      'Email',
      'Role',
      'Status',
      'Created',
    ],
    rows: users.map(user => [
      user.id.substring(0, 8),
      `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      user.email,
      user.role,
      user.isActive ? 'Active' : 'Inactive',
      new Date(user.createdAt).toLocaleDateString(),
    ]),
  };
};
