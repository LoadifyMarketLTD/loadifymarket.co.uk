import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/useAuthStore';
import { COLORS } from '@/constants/theme';

export default function SplashScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.logoBox}>
        <Text style={styles.logoText}>LM</Text>
      </View>
      <Text style={styles.appName}>LOADIFY MARKET</Text>
      <Text style={styles.tagline}>0% COMMISSION</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.goldDark,
    borderWidth: 2,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoText: {
    color: COLORS.gold,
    fontSize: 48,
    fontWeight: '700',
  },
  appName: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 4,
  },
  tagline: {
    color: COLORS.gold,
    fontSize: 14,
    letterSpacing: 2,
  },
});
