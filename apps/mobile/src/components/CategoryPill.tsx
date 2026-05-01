import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/theme';

interface CategoryPillProps {
  label: string;
  icon: string;
  selected?: boolean;
  onPress?: () => void;
}

export const CategoryPill: React.FC<CategoryPillProps> = ({ label, icon, selected, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.pill, selected && styles.pillSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, selected && styles.iconCircleSelected]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    marginRight: 16,
    gap: 6,
  },
  pillSelected: {},
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconCircleSelected: {
    backgroundColor: COLORS.goldDark,
    borderColor: COLORS.gold,
  },
  iconText: {
    fontSize: 20,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  labelSelected: {
    color: COLORS.gold,
  },
});
