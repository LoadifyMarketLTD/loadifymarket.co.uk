import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { COLORS } from '../constants/theme';

const SCREEN_W = Dimensions.get('window').width;

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
    padding: Math.max(14, SCREEN_W * 0.04),
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  left: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  commission: {
    color: COLORS.gold,
    // Fluid font: scales with screen but never smaller than 16 or larger than 22
    fontSize: Math.min(22, Math.max(16, SCREEN_W * 0.055)),
    fontWeight: '700',
  },
  keep: {
    color: COLORS.textPrimary,
    fontSize: Math.min(15, Math.max(12, SCREEN_W * 0.038)),
    fontWeight: '700',
    flexWrap: 'wrap',
  },
  sub: {
    color: COLORS.textSecondary,
    fontSize: Math.min(13, Math.max(11, SCREEN_W * 0.033)),
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  btn: {
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: Math.max(12, SCREEN_W * 0.035),
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  btnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: Math.min(13, Math.max(11, SCREEN_W * 0.033)),
  },
  right: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  bigZero: {
    color: COLORS.gold,
    fontSize: Math.min(64, Math.max(48, SCREEN_W * 0.15)),
    fontWeight: '700',
    lineHeight: Math.min(68, Math.max(52, SCREEN_W * 0.16)),
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
