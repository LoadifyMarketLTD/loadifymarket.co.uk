import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  distance: string;
  seller: string;
  rating: number;
  emoji: string;
  bg: string;
  onPress?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  title,
  price,
  distance,
  seller,
  rating,
  emoji,
  bg,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.imageArea, { backgroundColor: bg }]}>
        <Text style={styles.emoji}>{emoji}</Text>
        <TouchableOpacity style={styles.heartBtn}>
          <Feather name="heart" size={16} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.locationBadge}>
          <Text style={styles.locationText}>📍 {distance}</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.price}>£{price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        <View style={styles.sellerRow}>
          <View style={styles.avatar} />
          <Text style={styles.sellerName} numberOfLines={1}>{seller}</Text>
          <Text style={styles.star}>★</Text>
          <Text style={styles.rating}>{rating}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    overflow: 'hidden',
    marginRight: 12,
  },
  imageArea: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emoji: {
    fontSize: 40,
  },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 5,
  },
  locationBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  locationText: {
    color: COLORS.textPrimary,
    fontSize: 11,
  },
  info: {
    padding: 10,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  price: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.border,
  },
  sellerName: {
    color: COLORS.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  star: {
    color: COLORS.gold,
    fontSize: 12,
  },
  rating: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});
