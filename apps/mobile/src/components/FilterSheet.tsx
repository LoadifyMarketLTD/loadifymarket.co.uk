import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

interface FilterSheetProps {
  onApply?: () => void;
}

const CONDITIONS = ['All', 'New', 'Like New', 'Used', 'Fair'];
const DELIVERY = ['All', 'Pickup', 'Shipping'];

export const FilterSheet: React.FC<FilterSheetProps> = ({ onApply }) => {
  const [condition, setCondition] = useState('All');
  const [delivery, setDelivery] = useState('All');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionLabel}>Condition</Text>
      <View style={styles.pillRow}>
        {CONDITIONS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.pill, condition === c && styles.pillActive]}
            onPress={() => setCondition(c)}
          >
            <Text style={[styles.pillText, condition === c && styles.pillTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.sectionLabel}>Delivery</Text>
      <View style={styles.pillRow}>
        {DELIVERY.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.pill, delivery === d && styles.pillActive]}
            onPress={() => setDelivery(d)}
          >
            <Text style={[styles.pillText, delivery === d && styles.pillTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.applyBtn} onPress={onApply} activeOpacity={0.85}>
        <Text style={styles.applyText}>Apply Filters</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  sectionLabel: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.goldDark,
  },
  pillText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  pillTextActive: {
    color: COLORS.gold,
  },
  applyBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.input,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  applyText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
});
