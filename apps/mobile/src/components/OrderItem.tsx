import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

interface OrderItemProps {
  id: string;
  title: string;
  price: number;
  status: string;
  statusColor: string;
  emoji: string;
  bg: string;
  onPress?: () => void;
}

export const OrderItem: React.FC<OrderItemProps> = ({
  id,
  title,
  price,
  status,
  statusColor,
  emoji,
  bg,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.thumbnail, { backgroundColor: bg }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.price}>£{price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        <Text style={styles.orderId}>{id}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: statusColor + '22' }]}>
        <Text style={[styles.badgeText, { color: statusColor }]}>{status}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  price: {
    color: COLORS.gold,
    fontSize: 15,
    fontWeight: '700',
  },
  orderId: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
