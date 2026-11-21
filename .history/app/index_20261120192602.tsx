
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { COLORS } from '../src/constants/colors';

export default function LoginScreen() {
  const { login, driver, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (!loading && driver) {
      router.replace('/(driver)/dashboard');
    }
  }, [driver, loading]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }

    try {
      setSubmitting(true);
      await login(email, password);
      router.replace('/(driver)/dashboard');
    } catch (error: any) {
      Alert.alert(
        'Login failed',
        error?.message || 'Please check your credentials.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>NOIDA<Text style={styles.accent}>DRIVE</Text></Text>
        <Text style={styles.subtitle}>DRIVER PARTNER</Text>

        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.description}>
          Sign in to manage your rides and start earning.
        </Text>

        <Text style={styles.label}>EMAIL ADDRESS</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#777"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="#777"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#050505" />
          ) : (
            <Text style={styles.buttonText}>SIGN IN</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>
          Driver access is provided by NoidaDrive Admin.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
  },
  loader: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 1,
  },
  accent: {
    color: COLORS.primary,
  },
  subtitle: {
    color: COLORS.textSecondary,
    letterSpacing: 4,
    marginTop: 5,
    marginBottom: 48,
    fontSize: 11,
  },
  heading: {
    color: COLORS.white,
    fontSize: 28,
    fontWeight: '800',
  },
  description: {
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 32,
    fontSize: 14,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 9,
    marginTop: 18,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    color: COLORS.white,
    paddingHorizontal: 16,
    height: 54,
    fontSize: 15,
  },
  button: {
    height: 54,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  buttonText: {
    color: '#050505',
    fontWeight: '900',
    letterSpacing: 1,
  },
  footer: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 28,
  },
});
