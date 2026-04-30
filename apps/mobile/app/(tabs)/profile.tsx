import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, RADIUS } from '@/constants/theme';

const MENU_ITEMS = [
  { id: 'listings', label: 'My Listings', icon: 'list' as const },
  { id: 'orders', label: 'My Orders', icon: 'shopping-bag' as const },
  { id: 'favorites', label: 'Favorites', icon: 'heart' as const },
  { id: 'saved', label: 'Saved Searches', icon: 'bookmark' as const },
  { id: 'address', label: 'Address Book', icon: 'map-pin' as const },
  { id: 'payment', label: 'Payment Methods', icon: 'credit-card' as const },
  { id: 'settings', label: 'Settings', icon: 'settings' as const },
  { id: 'help', label: 'Help & Support', icon: 'help-circle' as const },
];

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Avatar + info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>J</Text>
          </View>
          <Text style={styles.name}>John Doe</Text>
          <Text style={styles.email}>john@example.com</Text>
          <TouchableOpacity>
            <Text style={styles.editLink}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>23</Text>
            <Text style={styles.statLabel}>Items Listed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>45</Text>
            <Text style={styles.statLabel}>Items Sold</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>4.9</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuRow, index === MENU_ITEMS.length - 1 && styles.menuRowLast]}
              onPress={() => item.id === 'orders' && router.push('/orders')}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Feather name={item.icon} size={18} color={COLORS.gold} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  content: { paddingBottom: 32 },
  profileCard: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, gap: 6 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.gold },
  avatarText: { color: COLORS.gold, fontSize: 32, fontWeight: '700' },
  name: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  email: { color: COLORS.textSecondary, fontSize: 14 },
  editLink: { color: COLORS.gold, fontSize: 14, fontWeight: '600', marginTop: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: COLORS.card, marginHorizontal: 16, borderRadius: RADIUS.card, padding: 16, marginBottom: 20 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statNumber: { color: COLORS.gold, fontSize: 20, fontWeight: '700' },
  statLabel: { color: COLORS.textSecondary, fontSize: 12 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  menu: { backgroundColor: COLORS.card, marginHorizontal: 16, borderRadius: RADIUS.card, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12 },
  menuRowLast: { borderBottomWidth: 0 },
  menuIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.goldDark, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, color: COLORS.textPrimary, fontSize: 15 },
});
