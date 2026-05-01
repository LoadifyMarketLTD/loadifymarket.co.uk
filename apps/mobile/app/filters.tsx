import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, RADIUS } from '@/constants/theme';

const CONDITIONS = ['All', 'New', 'Like New', 'Used', 'Fair'];
const DELIVERY = ['All', 'Pickup', 'Shipping'];

export default function FiltersScreen() {
  const router = useRouter();
  const [condition, setCondition] = useState('All');
  const [delivery, setDelivery] = useState('All');
  const [category] = useState('All Categories');
  const [sortBy] = useState('Newest First');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Filters</Text>
        <TouchableOpacity onPress={() => { setCondition('All'); setDelivery('All'); }}>
          <Text style={styles.reset}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Category */}
        <Text style={styles.sectionLabel}>Category</Text>
        <TouchableOpacity style={styles.selectRow}>
          <Text style={styles.selectText}>{category}</Text>
          <Feather name="chevron-down" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Price Range */}
        <Text style={styles.sectionLabel}>Price Range</Text>
        <View style={styles.priceRange}>
          <Text style={styles.priceText}>£0</Text>
          <View style={styles.sliderTrack}>
            <View style={styles.sliderFill} />
            <View style={[styles.sliderThumb, { left: 0 }]} />
            <View style={[styles.sliderThumb, { right: 0 }]} />
          </View>
          <Text style={styles.priceText}>£10,000+</Text>
        </View>

        {/* Condition */}
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

        {/* Delivery */}
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

        {/* Sort By */}
        <Text style={styles.sectionLabel}>Sort By</Text>
        <TouchableOpacity style={styles.selectRow}>
          <Text style={styles.selectText}>{sortBy}</Text>
          <Feather name="chevron-down" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.applyBtn} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.applyText}>Apply Filters</Text>
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
  reset: { color: COLORS.gold, fontSize: 14, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 100 },
  sectionLabel: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 16 },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.inputBg, borderRadius: RADIUS.input, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border },
  selectText: { color: COLORS.textPrimary, fontSize: 14 },
  priceRange: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  priceText: { color: COLORS.textSecondary, fontSize: 13 },
  sliderTrack: { flex: 1, height: 4, backgroundColor: COLORS.border, borderRadius: 2, position: 'relative', justifyContent: 'center' },
  sliderFill: { position: 'absolute', left: 0, right: 0, height: 4, backgroundColor: COLORS.gold, borderRadius: 2 },
  sliderThumb: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.gold, borderWidth: 3, borderColor: COLORS.background, top: -8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  pillActive: { borderColor: COLORS.gold, backgroundColor: COLORS.goldDark },
  pillText: { color: COLORS.textSecondary, fontSize: 13 },
  pillTextActive: { color: COLORS.gold },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  applyBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.input, paddingVertical: 16, alignItems: 'center' },
  applyText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
