import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '@/constants/theme';

const CATEGORIES = [
  { id: 'all', label: 'All Categories', icon: 'apps' as const },
  { id: 'phones', label: 'Phones & Tablets', icon: 'cellphone' as const },
  { id: 'laptops', label: 'Laptops', icon: 'laptop' as const },
  { id: 'watches', label: 'Watches', icon: 'watch' as const },
  { id: 'vehicles', label: 'Vehicles', icon: 'car' as const },
  { id: 'fashion', label: 'Fashion', icon: 'tshirt-crew' as const },
  { id: 'electronics', label: 'Electronics', icon: 'television' as const },
  { id: 'home', label: 'Home & Living', icon: 'sofa' as const },
  { id: 'sports', label: 'Sports & Outdoors', icon: 'soccer' as const },
  { id: 'more', label: 'More Categories', icon: 'dots-grid' as const },
];

export default function CategoriesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Categories</Text>
        <View style={styles.placeholder} />
      </View>
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} activeOpacity={0.7}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name={item.icon} size={22} color={COLORS.gold} />
            </View>
            <Text style={styles.label}>{item.label}</Text>
            <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  title: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  placeholder: { width: 30 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: RADIUS.card, backgroundColor: COLORS.goldDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.gold + '44' },
  label: { flex: 1, color: COLORS.textPrimary, fontSize: 16 },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 68 },
});
