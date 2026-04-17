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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, User, Phone, ArrowLeft, CheckCircle } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { COLORS, SPACING, RADIUS, API_URL } from '../config/constants';
import { LanguageSelector } from '../components/LanguageSelector';

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.fullName.trim()) {
      setError('Inserisci il tuo nome e cognome');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Inserisci la tua email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Inserisci un indirizzo email valido');
      return false;
    }
    if (!formData.password) {
      setError('Inserisci una password');
      return false;
    }
    if (formData.password.length < 8) {
      setError('La password deve avere almeno 8 caratteri');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Le password non corrispondono');
      return false;
    }
    if (!acceptTerms) {
      setError('Devi accettare i termini e le condizioni');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          full_name: formData.fullName.trim(),
          phone: formData.phone.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Show success message
        Alert.alert(
          'Registrazione completata!',
          'Il tuo account è stato creato con successo. Ora puoi accedere con le tue credenziali.',
          [
            {
              text: 'Accedi',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        setError(data.detail || 'Errore durante la registrazione. Riprova.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Errore di connessione. Verifica la tua connessione internet.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.successContainer}>
          <CheckCircle size={80} color={COLORS.success} />
          <Text style={[styles.successTitle, { color: colors.text }]}>
            Registrazione completata!
          </Text>
          <Text style={[styles.successText, { color: colors.textSecondary }]}>
            Il tuo account è stato creato con successo.{'\n'}
            Ora puoi accedere con le tue credenziali.
          </Text>
          <Button
            title="Vai al Login"
            onPress={() => navigation.goBack()}
            style={styles.successButton}
            size="lg"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header with back button */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.languageContainer}>
              <LanguageSelector />
            </View>
          </View>

          {/* Logo e Header */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: colors.surface }]}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Crea il tuo account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Registrati per accedere ai servizi di Fiscal Tax Canarie
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label="Nome e Cognome"
              placeholder="Il tuo nome completo"
              value={formData.fullName}
              onChangeText={(val) => updateField('fullName', val)}
              autoCapitalize="words"
              leftIcon={<User size={20} color={COLORS.textSecondary} />}
            />

            <TextInput
              label="Email"
              placeholder="La tua email"
              value={formData.email}
              onChangeText={(val) => updateField('email', val)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon={<Mail size={20} color={COLORS.textSecondary} />}
            />

            <TextInput
              label="Telefono (opzionale)"
              placeholder="+39 123 456 7890"
              value={formData.phone}
              onChangeText={(val) => updateField('phone', val)}
              keyboardType="phone-pad"
              leftIcon={<Phone size={20} color={COLORS.textSecondary} />}
            />

            <TextInput
              label="Password"
              placeholder="Minimo 8 caratteri"
              value={formData.password}
              onChangeText={(val) => updateField('password', val)}
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

            <TextInput
              label="Conferma Password"
              placeholder="Ripeti la password"
              value={formData.confirmPassword}
              onChangeText={(val) => updateField('confirmPassword', val)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              leftIcon={<Lock size={20} color={COLORS.textSecondary} />}
              rightIcon={
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={COLORS.textSecondary} />
                  ) : (
                    <Eye size={20} color={COLORS.textSecondary} />
                  )}
                </TouchableOpacity>
              }
            />

            {/* Terms checkbox */}
            <TouchableOpacity
              style={styles.termsContainer}
              onPress={() => setAcceptTerms(!acceptTerms)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                acceptTerms && styles.checkboxChecked
              ]}>
                {acceptTerms && <CheckCircle size={16} color="#fff" />}
              </View>
              <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                Accetto i{' '}
                <Text style={styles.termsLink}>termini e condizioni</Text>
                {' '}e la{' '}
                <Text style={styles.termsLink}>privacy policy</Text>
              </Text>
            </TouchableOpacity>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Button
              title="Registrati"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerButton}
              size="lg"
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Hai già un account?{' '}
              <Text
                style={styles.footerLink}
                onPress={() => navigation.goBack()}
              >
                Accedi
              </Text>
            </Text>
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
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  languageContainer: {
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
    width: 180,
    height: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: SPACING.lg,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '600',
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
  registerButton: {
    marginTop: SPACING.sm,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: SPACING.xl,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  successText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  successButton: {
    width: '100%',
  },
});

export default RegisterScreen;
