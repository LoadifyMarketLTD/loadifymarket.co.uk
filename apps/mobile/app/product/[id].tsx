import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { MOCK_PRODUCTS } from '@/lib/api';
import { COLORS, RADIUS } from '@/constants/theme';

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [liked, setLiked] = useState(false);

  const product = MOCK_PRODUCTS.find((p) => p.id === id) ?? MOCK_PRODUCTS[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setLiked(!liked)} style={styles.iconBtn}>
            <Feather name="heart" size={22} color={liked ? COLORS.statusRed : COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Feather name="share-2" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Main Image */}
        <View style={[styles.mainImage, { backgroundColor: product.bg }]}>
          <Text style={styles.mainEmoji}>{product.emoji}</Text>
        </View>

        {/* Thumbnail strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbStrip}>
          {[0, 1, 2, 3].map((i) => (
            <TouchableOpacity key={i} style={[styles.thumb, i === 0 && styles.thumbActive, { backgroundColor: product.bg }]}>
              <Text style={styles.thumbEmoji}>{product.emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.details}>
          <Text style={styles.productTitle}>{product.title}</Text>
          <Text style={styles.location}>📍 0.2 km away · London, UK</Text>
          <Text style={styles.price}>£{product.price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>

          {/* Seller */}
          <View style={styles.sellerRow}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>{product.seller.charAt(0)}</Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{product.seller}</Text>
              <Text style={styles.sellerActive}>Active 30 min ago</Text>
            </View>
            <Text style={styles.sellerRating}>★{product.rating} (128)</Text>
          </View>

          {/* Description */}
          <Text style={styles.descHeader}>Description</Text>
          <Text style={styles.descBody}>
            Excellent condition {product.title}. Barely used, comes with original box and all accessories.
            No scratches or damage. Collection from London or can ship nationwide.
          </Text>
          <TouchableOpacity>
            <Text style={styles.readMore}>Read more</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.chatBtn} activeOpacity={0.85}>
          <Text style={styles.chatText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyBtn} onPress={() => router.push(`/checkout/${id}`)} activeOpacity={0.85}>
          <Text style={styles.buyText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6 },
  mainImage: { height: 280, alignItems: 'center', justifyContent: 'center' },
  mainEmoji: { fontSize: 80 },
  thumbStrip: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  thumb: { width: 60, height: 60, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  thumbActive: { borderWidth: 2, borderColor: COLORS.gold },
  thumbEmoji: { fontSize: 24 },
  details: { padding: 16, paddingBottom: 100 },
  productTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 6 },
  location: { color: COLORS.textSecondary, fontSize: 14, marginBottom: 10 },
  price: { color: COLORS.gold, fontSize: 28, fontWeight: '700', marginBottom: 16 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: RADIUS.card, padding: 12, marginBottom: 16, gap: 10 },
  sellerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  sellerAvatarText: { color: COLORS.gold, fontSize: 18, fontWeight: '700' },
  sellerInfo: { flex: 1 },
  sellerName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  sellerActive: { color: COLORS.textSecondary, fontSize: 13 },
  sellerRating: { color: COLORS.gold, fontSize: 14, fontWeight: '600' },
  descHeader: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  descBody: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 6 },
  readMore: { color: COLORS.gold, fontSize: 14, fontWeight: '600' },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, padding: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  chatBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.gold, borderRadius: RADIUS.input, paddingVertical: 14, alignItems: 'center' },
  chatText: { color: COLORS.gold, fontWeight: '700', fontSize: 15 },
  buyBtn: { flex: 1, backgroundColor: COLORS.gold, borderRadius: RADIUS.input, paddingVertical: 14, alignItems: 'center' },
  buyText: { color: '#000', fontWeight: '700', fontSize: 15 },
});
