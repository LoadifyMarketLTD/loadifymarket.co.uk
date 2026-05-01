import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/useAuthStore';
import { COLORS, RADIUS } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await login(email, password);
    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>LM</Text>
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your Loadify account</Text>
        </View>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.loginText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.guestBtn}>
            <Text style={styles.guestText}>Continue as Guest</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 32 },
  header: { alignItems: 'center', gap: 12 },
  logoBox: { width: 64, height: 64, borderRadius: 16, backgroundColor: COLORS.goldDark, borderWidth: 2, borderColor: COLORS.gold, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: COLORS.gold, fontSize: 32, fontWeight: '700' },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: '700' },
  subtitle: { color: COLORS.textSecondary, fontSize: 14 },
  form: { gap: 12 },
  input: { backgroundColor: COLORS.inputBg, borderRadius: RADIUS.input, paddingHorizontal: 16, paddingVertical: 14, color: COLORS.textPrimary, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },
  loginBtn: { backgroundColor: COLORS.gold, borderRadius: RADIUS.input, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  loginText: { color: '#000', fontWeight: '700', fontSize: 16 },
  guestBtn: { alignItems: 'center', paddingVertical: 10 },
  guestText: { color: COLORS.textSecondary, fontSize: 14 },
});
