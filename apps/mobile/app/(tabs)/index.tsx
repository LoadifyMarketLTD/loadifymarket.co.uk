import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SearchBar } from '@/components/SearchBar';
import { CategoryPill } from '@/components/CategoryPill';
import { HeroBanner } from '@/components/HeroBanner';
import { ProductCard } from '@/components/ProductCard';
import { COLORS } from '@/constants/theme';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🔲' },
  { id: 'phones', label: 'Phones', icon: '📱' },
  { id: 'laptops', label: 'Laptops', icon: '💻' },
  { id: 'watches', label: 'Watches', icon: '⌚' },
  { id: 'vehicles', label: 'Vehicles', icon: '🚗' },
  { id: 'more', label: 'More', icon: '➕' },
];

const TRENDING = [
  { id: '1', title: 'iPhone 15 Pro Max', price: 899, distance: '1.2 km', seller: 'John D.', rating: 4.9, emoji: '📱', bg: '#1a1a2e' },
  { id: '2', title: 'MacBook Air M2', price: 749, distance: '2.4 km', seller: 'Sarah M.', rating: 4.8, emoji: '💻', bg: '#0d1b2a' },
  { id: '3', title: 'Rolex Submariner', price: 7250, distance: '1.8 km', seller: 'Alex R.', rating: 5.0, emoji: '⌚', bg: '#1a0a00' },
];

const NEW_ARRIVALS = [
  { id: '4', title: "Nike Air Force 1 '07", price: 89.99, distance: '1.5 km', seller: 'James K.', rating: 4.7, emoji: '👟', bg: '#1a1a1a' },
  { id: '5', title: 'Sony A7 IV', price: 1499, distance: '2.1 km', seller: 'Emma L.', rating: 4.8, emoji: '📷', bg: '#1a0a1a' },
  { id: '6', title: 'BMW M2 Competition', price: 38500, distance: '3.7 km', seller: 'Mike T.', rating: 4.9, emoji: '🚗', bg: '#0a1a0a' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [selectedCat, setSelectedCat] = useState('all');
  const [search, setSearch] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>LM</Text>
          </View>
          <View style={styles.logoTextCol}>
            <Text style={styles.appName}>LOADIFY MARKET</Text>
            <Text style={styles.commission}>0% COMMISSION</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.bellBtn}>
            <Feather name="bell" size={20} color={COLORS.textPrimary} />
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tuneBtn}>
            <MaterialCommunityIcons name="tune" size={20} color={COLORS.gold} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          onSubmit={() => router.push('/(tabs)/search')}
        />

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScroll}
          contentContainerStyle={styles.catContent}
        >
          {CATEGORIES.map((cat) => (
            <CategoryPill
              key={cat.id}
              label={cat.label}
              icon={cat.icon}
              selected={selectedCat === cat.id}
              onPress={() => setSelectedCat(cat.id)}
            />
          ))}
        </ScrollView>

        {/* Hero Banner */}
        <HeroBanner />

        {/* Trending Now */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📈 Trending Now</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardScroll}
        >
          {TRENDING.map((item) => (
            <ProductCard
              key={item.id}
              {...item}
              onPress={() => router.push(`/product/${item.id}`)}
            />
          ))}
        </ScrollView>

        {/* New Arrivals */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🆕 New Arrivals</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.cardScroll, styles.cardScrollBottom]}
        >
          {NEW_ARRIVALS.map((item) => (
            <ProductCard
              key={item.id}
              {...item}
              onPress={() => router.push(`/product/${item.id}`)}
            />
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.goldDark, borderWidth: 1.5, borderColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: COLORS.gold, fontSize: 16, fontWeight: '700' },
  logoTextCol: { gap: 1 },
  appName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  commission: { color: COLORS.textSecondary, fontSize: 11 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bellBtn: { padding: 6, position: 'relative' },
  bellBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: COLORS.statusRed, borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  bellBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  tuneBtn: { backgroundColor: '#1A1200', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: COLORS.gold + '66' },
  catScroll: { marginBottom: 16 },
  catContent: { paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  seeAll: { color: COLORS.gold, fontSize: 14 },
  cardScroll: { paddingHorizontal: 16, paddingBottom: 8 },
  cardScrollBottom: { paddingBottom: 24 },
});
