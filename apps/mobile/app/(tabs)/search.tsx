import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { SearchBar } from '@/components/SearchBar';
import { COLORS, RADIUS } from '@/constants/theme';

const RESULTS = [
  { id: '1', title: 'iPhone 15 Pro Max', price: 899, distance: '1.7 km', seller: 'John D.', rating: 4.9, emoji: '📱', bg: '#1a1a2e' },
  { id: '2', title: 'iPhone 15 Pro', price: 749, distance: '2.1 km', seller: 'Sarah M.', rating: 4.8, emoji: '📱', bg: '#1a1a2e' },
  { id: '3', title: 'iPhone 15', price: 599, distance: '1.8 km', seller: 'Mike T.', rating: 4.7, emoji: '📱', bg: '#1a1a2e' },
  { id: '4', title: 'iPhone 15 Plus', price: 699, distance: '2.3 km', seller: 'Emma L.', rating: 4.9, emoji: '📱', bg: '#1a1a2e' },
  { id: '5', title: 'iPhone 15 Pro Max', price: 929, distance: '3.1 km', seller: 'Alex R.', rating: 5.0, emoji: '📱', bg: '#1a1a2e' },
];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('iPhone 15');

  const renderItem = ({ item }: { item: typeof RESULTS[0] }) => (
    <TouchableOpacity style={styles.resultRow} onPress={() => router.push(`/product/${item.id}`)} activeOpacity={0.8}>
      <View style={[styles.thumb, { backgroundColor: item.bg }]}>
        <Text style={styles.thumbEmoji}>{item.emoji}</Text>
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultPrice}>£{item.price.toLocaleString()}</Text>
        <Text style={styles.resultMeta}>📍 {item.distance} · {item.seller}</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.searchRow}>
        <View style={styles.searchFlex}>
          <SearchBar value={query} onChangeText={setQuery} />
        </View>
        <TouchableOpacity style={styles.gridBtn}>
          <Feather name="grid" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.resultsBar}>
        <Text style={styles.resultsCount}>120 results found</Text>
        <TouchableOpacity style={styles.sortBtn}>
          <Text style={styles.sortText}>Sort ▾</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={RESULTS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 16 },
  searchFlex: { flex: 1 },
  gridBtn: { padding: 8 },
  resultsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  resultsCount: { color: COLORS.textSecondary, fontSize: 13 },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.goldDark, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.gold + '44' },
  sortText: { color: COLORS.gold, fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  resultRow: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  thumb: { width: 80, height: 80, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 32 },
  resultInfo: { flex: 1, gap: 3 },
  resultTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  resultPrice: { color: COLORS.gold, fontSize: 16, fontWeight: '700' },
  resultMeta: { color: COLORS.textSecondary, fontSize: 13 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  star: { color: COLORS.gold, fontSize: 13 },
  ratingText: { color: COLORS.textSecondary, fontSize: 12 },
  separator: { height: 1, backgroundColor: COLORS.border },
});
