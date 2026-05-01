import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/useAuthStore';
import { COLORS } from '@/constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
// Logo box scales between 72–96dp depending on screen width
const LOGO_SIZE = Math.min(96, Math.max(72, SCREEN_W * 0.2));

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

      {/* LM brand badge */}
      <View style={[styles.logoBox, { width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: LOGO_SIZE * 0.22 }]}>
        <Text style={[styles.logoText, { fontSize: LOGO_SIZE * 0.44 }]}>LM</Text>
      </View>

      <Text style={styles.appName}>LOADIFY MARKET</Text>
      <Text style={styles.tagline}>0% COMMISSION</Text>

      {/* Subtle animated loading indicator */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.dot} />
        ))}
      </View>
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
    backgroundColor: '#1E1A0E',
    borderWidth: 2.5,
    borderColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    // Subtle gold glow via shadow
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 16,
  },
  logoText: {
    color: COLORS.gold,
    fontWeight: '900',
    letterSpacing: 2,
  },
  appName: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 5,
  },
  tagline: {
    color: COLORS.gold,
    fontSize: 13,
    letterSpacing: 3,
    opacity: 0.85,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 32,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(242,184,75,0.45)',
  },
});
