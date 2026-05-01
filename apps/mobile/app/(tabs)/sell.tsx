import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useDraftListingStore } from '@/store/useDraftListingStore';
import { COLORS, RADIUS } from '@/constants/theme';

function StepIndicator({ current }: { current: number }) {
  return (
    <View style={stepStyles.row}>
      {[1, 2, 3].map((n) => (
        <React.Fragment key={n}>
          <View style={[stepStyles.circle, current === n && stepStyles.circleActive]}>
            <Text style={[stepStyles.num, current === n && stepStyles.numActive]}>{n}</Text>
          </View>
          {n < 3 && <View style={stepStyles.line} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  circle: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  circleActive: { backgroundColor: COLORS.gold },
  num: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  numActive: { color: '#000' },
  line: { width: 20, height: 1, backgroundColor: COLORS.border },
});

export default function SellScreen() {
  const router = useRouter();
  const { step, title, category, condition, acceptOffers, price, description, location, deliveryOption, setStep, setField } = useDraftListingStore();

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sell an Item</Text>
        <StepIndicator current={step} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {step === 1 && (
          <>
            {/* Photos */}
            <Text style={styles.sectionLabel}>Item Photos</Text>
            <Text style={styles.sectionHint}>Add up to 10 photos</Text>
            <View style={styles.photoGrid}>
              {[0, 1, 2, 3].map((i) => (
                <TouchableOpacity key={i} style={styles.photoBox}>
                  <Feather name="plus" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Title */}
            <Text style={styles.fieldLabel}>Item Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. iPhone 15 Pro Max"
              placeholderTextColor={COLORS.textSecondary}
              value={title}
              onChangeText={(v) => setField('title', v)}
            />

            {/* Category */}
            <Text style={styles.fieldLabel}>Category</Text>
            <TouchableOpacity style={styles.selectRow}>
              <Text style={[styles.selectText, !category && styles.placeholder]}>{category || 'Select a category'}</Text>
              <Feather name="chevron-down" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* Condition */}
            <Text style={styles.fieldLabel}>Condition</Text>
            <TouchableOpacity style={styles.selectRow}>
              <Text style={[styles.selectText, !condition && styles.placeholder]}>{condition || 'Select condition'}</Text>
              <Feather name="chevron-down" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* Accept Offers */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Accept Offers</Text>
              <Switch
                value={acceptOffers}
                onValueChange={(v) => setField('acceptOffers', v)}
                trackColor={{ false: COLORS.border, true: COLORS.gold }}
                thumbColor="#fff"
              />
            </View>
          </>
        )}

        {step === 2 && (
          <>
            {/* Price */}
            <Text style={styles.fieldLabel}>Price</Text>
            <View style={styles.priceRow}>
              <View style={styles.pricePrefix}>
                <Text style={styles.pricePrefixText}>£</Text>
              </View>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textSecondary}
                value={price}
                onChangeText={(v) => setField('price', v)}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Description */}
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Describe your item..."
              placeholderTextColor={COLORS.textSecondary}
              value={description}
              onChangeText={(v) => setField('description', v)}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            {/* Location */}
            <Text style={styles.fieldLabel}>Location</Text>
            <TouchableOpacity style={styles.selectRow}>
              <Text style={styles.selectText}>{location}</Text>
              <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* Delivery Option */}
            <Text style={styles.fieldLabel}>Delivery Option</Text>
            <TouchableOpacity style={styles.selectRow} onPress={() => setField('deliveryOption', 'Shipping')}>
              <Text style={[styles.selectText, !deliveryOption && styles.placeholder]}>{deliveryOption || 'Select delivery option'}</Text>
              <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Next Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 100 },
  sectionLabel: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionHint: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 12 },
  photoGrid: { flexDirection: 'row', gap: 10, marginBottom: 24, flexWrap: 'wrap' },
  photoBox: { width: 76, height: 76, borderRadius: 10, backgroundColor: COLORS.inputBg, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: RADIUS.input, paddingHorizontal: 14, paddingVertical: 13, color: COLORS.textPrimary, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  textarea: { minHeight: 120, paddingTop: 13 },
  selectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.inputBg, borderRadius: RADIUS.input, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  selectText: { color: COLORS.textPrimary, fontSize: 15 },
  placeholder: { color: COLORS.textSecondary, fontSize: 15 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  toggleLabel: { color: COLORS.textPrimary, fontSize: 15 },
  priceRow: { flexDirection: 'row', marginBottom: 16 },
  pricePrefix: { backgroundColor: COLORS.border, borderTopLeftRadius: RADIUS.input, borderBottomLeftRadius: RADIUS.input, paddingHorizontal: 14, paddingVertical: 13, justifyContent: 'center' },
  pricePrefixText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  priceInput: { flex: 1, backgroundColor: COLORS.inputBg, borderTopRightRadius: RADIUS.input, borderBottomRightRadius: RADIUS.input, paddingHorizontal: 14, paddingVertical: 13, color: COLORS.textPrimary, fontSize: 15, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 0 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: COLORS.background, borderTopWidth: 1, borderTopColor: COLORS.border },
  nextBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.input, paddingVertical: 16, alignItems: 'center' },
  nextText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
