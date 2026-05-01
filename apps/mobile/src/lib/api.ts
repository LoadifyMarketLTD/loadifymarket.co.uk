import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://api.loadifymarket.co.uk',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Mock data
export const MOCK_PRODUCTS = [
  { id: '1', title: 'iPhone 15 Pro Max', price: 899, distance: '1.2 km', seller: 'John D.', rating: 4.9, category: 'phones', emoji: '📱', bg: '#1a1a2e' },
  { id: '2', title: 'MacBook Air M2', price: 749, distance: '2.4 km', seller: 'Sarah M.', rating: 4.8, category: 'laptops', emoji: '💻', bg: '#0d1b2a' },
  { id: '3', title: 'Rolex Submariner', price: 7250, distance: '1.8 km', seller: 'Alex R.', rating: 5.0, category: 'watches', emoji: '⌚', bg: '#1a0a00' },
  { id: '4', title: "Nike Air Force 1 '07", price: 89.99, distance: '1.5 km', seller: 'James K.', rating: 4.7, category: 'fashion', emoji: '👟', bg: '#1a1a1a' },
  { id: '5', title: 'Sony A7 IV', price: 1499, distance: '2.1 km', seller: 'Emma L.', rating: 4.8, category: 'cameras', emoji: '📷', bg: '#1a0a1a' },
  { id: '6', title: 'BMW M2 Competition', price: 38500, distance: '3.7 km', seller: 'Mike T.', rating: 4.9, category: 'vehicles', emoji: '🚗', bg: '#0a1a0a' },
];

export const MOCK_ORDERS = [
  { id: '#12345', title: 'iPhone 15 Pro Max', price: 899, status: 'Awaiting Payment', statusColor: '#F59E0B', emoji: '📱', bg: '#1a1a2e' },
  { id: '#12346', title: 'MacBook Air M2', price: 749, status: 'Shipped', statusColor: '#3B82F6', emoji: '💻', bg: '#0d1b2a' },
  { id: '#12347', title: 'Rolex Submariner', price: 7250, status: 'Delivered', statusColor: '#22C55E', emoji: '⌚', bg: '#1a0a00' },
  { id: '#12348', title: "Nike Air Force 1 '07", price: 88.99, status: 'Cancelled', statusColor: '#EF4444', emoji: '👟', bg: '#1a1a1a' },
  { id: '#12349', title: 'Sony A7 IV', price: 1499, status: 'Completed', statusColor: '#888888', emoji: '📷', bg: '#1a0a1a' },
];

export const MOCK_CONVERSATIONS = [
  { id: '1', name: 'John D.', preview: 'Hi, is this still available?', time: '2m', unread: true },
  { id: '2', name: 'Sarah M.', preview: 'Can you do £700?', time: '15m', unread: true },
  { id: '3', name: 'Mike T.', preview: "I'll take it", time: '1h', unread: false },
  { id: '4', name: 'Emma L.', preview: 'Thanks!', time: '2h', unread: false },
  { id: '5', name: 'Alex R.', preview: 'When can we meet?', time: '3h', unread: false },
  { id: '6', name: 'James K.', preview: 'Message...', time: '1d', unread: false },
];
