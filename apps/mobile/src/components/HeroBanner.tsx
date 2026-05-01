import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';

export const HeroBanner: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.commission}>0% COMMISSION</Text>
        <Text style={styles.keep}>KEEP 100% OF YOUR SALE</Text>
        <Text style={styles.sub}>Buy. Sell. Save more with Loadify.</Text>
        <TouchableOpacity style={styles.btn} activeOpacity={0.8}>
          <Text style={styles.btnText}>Start Selling</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.right}>
        <Text style={styles.bigZero}>0%</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>COMMISSION</Text>
        </View>
      </View>
      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  left: {
    flex: 1,
    gap: 6,
  },
  commission: {
    color: COLORS.gold,
    fontSize: 22,
    fontWeight: '700',
  },
  keep: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  sub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  btn: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  btnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 13,
  },
  right: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  bigZero: {
    color: COLORS.gold,
    fontSize: 64,
    fontWeight: '700',
    lineHeight: 68,
  },
  badge: {
    backgroundColor: 'rgba(245,185,66,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '700',
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#444',
  },
  dotActive: {
    backgroundColor: COLORS.textPrimary,
  },
});
