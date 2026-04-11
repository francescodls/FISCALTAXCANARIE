import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { COLORS, SPACING, RADIUS } from '../config/constants';
import { LanguageSelector } from '../components/LanguageSelector';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t.login.invalidCredentials);
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(email.trim(), password);

    if (!result.success) {
      setError(result.error || t.login.loginError);
    }

    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Language Selector */}
          <View style={styles.languageContainer}>
            <LanguageSelector />
          </View>

          {/* Logo e Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.subtitle}>{t.login.subtitle}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label={t.login.email}
              placeholder={t.login.emailPlaceholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Mail size={20} color={COLORS.textSecondary} />}
            />

            <TextInput
              label={t.login.password}
              placeholder={t.login.passwordPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              leftIcon={<Lock size={20} color={COLORS.textSecondary} />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={20} color={COLORS.textSecondary} />
                  ) : (
                    <Eye size={20} color={COLORS.textSecondary} />
                  )}
                </TouchableOpacity>
              }
            />

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button
              title={t.login.loginButton}
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
              size="lg"
            />

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => Linking.openURL('https://fiscaltaxcanarie.com')}
            >
              <Text style={styles.forgotPasswordText}>
                {t.login.forgotPassword}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {t.login.noAccount}{' '}
              <Text
                style={styles.footerLink}
                onPress={() => Linking.openURL('https://fiscaltaxcanarie.com')}
              >
                {t.login.register}
              </Text>
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://fiscaltaxcanarie.com/privacy-policy/')}
            >
              <Text style={styles.privacyLink}>{t.profile.privacy}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  languageContainer: {
    position: 'absolute',
    top: 16,
    right: 0,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl + SPACING.md,
  },
  logoContainer: {
    marginBottom: SPACING.md,
  },
  logo: {
    width: 220,
    height: 80,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  form: {
    marginBottom: SPACING.xl,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: SPACING.sm,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  privacyLink: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
