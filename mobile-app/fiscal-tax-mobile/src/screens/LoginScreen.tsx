import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, Fingerprint, ScanFace } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { COLORS, SPACING, RADIUS } from '../config/constants';
import { LanguageSelector } from '../components/LanguageSelector';
import { biometricService, BiometricConfig } from '../services/biometric';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricConfig, setBiometricConfig] = useState<BiometricConfig | null>(null);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  
  // Animation for biometric button
  const biometricScale = useState(new Animated.Value(1))[0];

  // Check biometric availability on mount
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    const config = await biometricService.checkAvailability();
    setBiometricConfig(config);
    
    // Auto-trigger biometric if enabled and has credentials
    if (config.isAvailable && config.isEnabled) {
      const hasCredentials = await biometricService.hasStoredCredentials();
      if (hasCredentials) {
        setShowBiometricPrompt(true);
        // Small delay for UX
        setTimeout(() => handleBiometricLogin(), 500);
      }
    }
  };

  const handleBiometricLogin = async () => {
    if (!biometricConfig?.isAvailable) return;
    
    setBiometricLoading(true);
    setError('');
    
    // Animate button press
    Animated.sequence([
      Animated.timing(biometricScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(biometricScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    const biometricName = biometricService.getBiometricName(biometricConfig.biometricType);
    const result = await biometricService.authenticateAndGetCredentials(
      `Accedi con ${biometricName}`
    );

    if (result.success && result.credentials) {
      // Login with stored credentials
      const loginResult = await login(result.credentials.email, result.credentials.password);
      
      if (!loginResult.success) {
        setError(loginResult.error || 'Errore di autenticazione. Prova con email e password.');
        // If credentials are invalid, disable biometric
        await biometricService.disable();
        setBiometricConfig(prev => prev ? { ...prev, isEnabled: false } : null);
      }
    } else if (result.error && result.error !== 'Autenticazione annullata') {
      setError(result.error);
    }

    setBiometricLoading(false);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t.login.invalidCredentials);
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(email.trim(), password);

    if (result.success) {
      // After successful login, offer to enable biometric
      if (biometricConfig?.isAvailable && !biometricConfig.isEnabled) {
        const biometricName = biometricService.getBiometricName(biometricConfig.biometricType);
        Alert.alert(
          `Attiva ${biometricName}`,
          `Vuoi attivare l'accesso rapido con ${biometricName} per i prossimi login?`,
          [
            { text: 'Non ora', style: 'cancel' },
            {
              text: 'Attiva',
              onPress: async () => {
                await biometricService.enable(email.trim(), password);
              },
            },
          ]
        );
      }
    } else {
      setError(result.error || t.login.loginError);
    }

    setLoading(false);
  };

  const getBiometricIcon = () => {
    if (!biometricConfig) return null;
    
    const iconSize = 28;
    const iconColor = COLORS.primary;
    
    switch (biometricConfig.biometricType) {
      case 'facial':
        return <ScanFace size={iconSize} color={iconColor} />;
      case 'fingerprint':
      default:
        return <Fingerprint size={iconSize} color={iconColor} />;
    }
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

          {/* Biometric Quick Login */}
          {biometricConfig?.isAvailable && biometricConfig.isEnabled && (
            <Animated.View style={[styles.biometricContainer, { transform: [{ scale: biometricScale }] }]}>
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={biometricLoading}
                activeOpacity={0.8}
              >
                {getBiometricIcon()}
                <Text style={styles.biometricText}>
                  {biometricLoading ? 'Verifica in corso...' : `Accedi con ${biometricService.getBiometricName(biometricConfig.biometricType)}`}
                </Text>
              </TouchableOpacity>
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>oppure</Text>
                <View style={styles.dividerLine} />
              </View>
            </Animated.View>
          )}

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
    marginBottom: SPACING.xl,
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
  biometricContainer: {
    marginBottom: SPACING.lg,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '10',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: 12,
  },
  biometricText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    paddingHorizontal: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 13,
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
