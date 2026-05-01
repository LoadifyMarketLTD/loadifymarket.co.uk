import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { MOCK_PRODUCTS } from '@/lib/api';
import { COLORS, RADIUS } from '@/constants/theme';

const DELIVERY_METHODS = [
  { id: 'pickup', label: 'Pickup', price: 'Free', sub: 'Collect from seller' },
  { id: 'shipping', label: 'Shipping', price: '£5.99', sub: '3-5 business days' },
];

export default function CheckoutScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const [selectedDelivery, setSelectedDelivery] = useState('pickup');

  const product = MOCK_PRODUCTS.find((p) => p.id === orderId) ?? MOCK_PRODUCTS[0];
  const deliveryFee = selectedDelivery === 'shipping' ? 5.99 : 0;
  const total = product.price + deliveryFee;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Order Summary */}
        <Text style={styles.sectionLabel}>Order Summary</Text>
        <View style={styles.summaryCard}>
          <View style={[styles.productThumb, { backgroundColor: product.bg }]}>
            <Text style={styles.productEmoji}>{product.emoji}</Text>
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productTitle}>{product.title}</Text>
            <Text style={styles.productPrice}>£{product.price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            <View style={styles.sellerRow}>
              <View style={styles.sellerDot} />
              <Text style={styles.sellerName}>{product.seller}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Method */}
        <Text style={styles.sectionLabel}>Delivery Method</Text>
        {DELIVERY_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[styles.deliveryRow, selectedDelivery === method.id && styles.deliveryRowActive]}
            onPress={() => setSelectedDelivery(method.id)}
          >
            <View style={[styles.radio, selectedDelivery === method.id && styles.radioActive]}>
              {selectedDelivery === method.id && <View style={styles.radioInner} />}
            </View>
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLabel}>{method.label}</Text>
              <Text style={styles.deliverySub}>{method.sub}</Text>
            </View>
            <Text style={[styles.deliveryPrice, method.price === 'Free' && styles.deliveryFree]}>{method.price}</Text>
          </TouchableOpacity>
        ))}

        {/* Payment Method */}
        <Text style={styles.sectionLabel}>Payment Method</Text>
        <View style={styles.paymentRow}>
          <View style={styles.cardIcon}>
            <Feather name="credit-card" size={20} color={COLORS.gold} />
          </View>
          <Text style={styles.cardNumber}>•••• •••• •••• 4242</Text>
          <TouchableOpacity>
            <Text style={styles.changeLink}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>£{total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmBtn} onPress={() => router.replace('/(tabs)')} activeOpacity={0.85}>
          <Text style={styles.confirmText}>Confirm Order</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  title: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  placeholder: { width: 30 },
  content: { padding: 16, paddingBottom: 100 },
  sectionLabel: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 8 },
  summaryCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: RADIUS.card, padding: 12, marginBottom: 20, gap: 12 },
  productThumb: { width: 64, height: 64, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  productEmoji: { fontSize: 28 },
  productInfo: { flex: 1, gap: 4 },
  productTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  productPrice: { color: COLORS.gold, fontSize: 16, fontWeight: '700' },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sellerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.statusGreen },
  sellerName: { color: COLORS.textSecondary, fontSize: 12 },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.card, padding: 14, marginBottom: 10, gap: 12, borderWidth: 1.5, borderColor: 'transparent' },
  deliveryRowActive: { borderColor: COLORS.gold },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: COLORS.gold },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.gold },
  deliveryInfo: { flex: 1 },
  deliveryLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  deliverySub: { color: COLORS.textSecondary, fontSize: 12 },
  deliveryPrice: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  deliveryFree: { color: COLORS.statusGreen },
  paymentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.card, padding: 14, marginBottom: 20, gap: 12 },
  cardIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.goldDark, alignItems: 'center', justifyContent: 'center' },
  cardNumber: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  changeLink: { color: COLORS.gold, fontSize: 13, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalLabel: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  totalAmount: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  confirmBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.input, paddingVertical: 16, alignItems: 'center' },
  confirmText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
