import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  ChevronRight,
  LogOut,
  Fingerprint,
  Smartphone,
  Clock,
  Lock,
  HelpCircle,
  FileText,
  Check,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../config/constants';
import { Language } from '../i18n';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage, languages } = useLanguage();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [lastAccess, setLastAccess] = useState<string | null>(null);

  useEffect(() => {
    checkBiometricAvailability();
    const locale = language === 'en' ? 'en-GB' : language === 'es' ? 'es-ES' : 'it-IT';
    setLastAccess(new Date().toLocaleString(locale));
  }, [language]);

  const checkBiometricAvailability = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compatible && enrolled);
  };

  const getProfileName = () => {
    if (user?.full_name && user.full_name.trim()) return user.full_name;
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return t.profile.title;
  };

  const getClientType = () => {
    if (user?.role === 'admin') return 'Admin';
    const tipo = user?.tipo_cliente;
    if (tipo === 'autonomo') return t.profile.clientTypes.freelance;
    if (tipo === 'empresa' || tipo === 'azienda') return t.profile.clientTypes.company;
    return t.profile.clientTypes.individual;
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t.common.confirm,
        cancelLabel: t.common.cancel,
        disableDeviceFallback: false,
      });
      if (result.success) {
        setBiometricEnabled(true);
        Alert.alert(t.common.success, 'Biometric enabled');
      }
    } else {
      setBiometricEnabled(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      t.profile.logout,
      t.profile.logoutConfirm,
      [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.profile.logout, style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleLanguageChange = async (lang: Language) => {
    await setLanguage(lang);
  };

  const SettingItem = ({
    icon: Icon,
    title,
    subtitle,
    onPress,
    rightElement,
    color = COLORS.text,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    color?: string;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: color + '15' }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color }]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (onPress && <ChevronRight size={20} color={COLORS.textLight} />)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.profile.title}</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getProfileName().charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.profileName}>{getProfileName()}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>{getClientType()}</Text>
          </View>
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.profile.personalInfo}</Text>
          <View style={styles.sectionCard}>
            <SettingItem icon={Mail} title={t.profile.email} subtitle={user?.email} />
            {user?.phone && (
              <SettingItem icon={Phone} title={t.profile.phone} subtitle={user.phone} />
            )}
            {user?.fiscal_code && (
              <SettingItem icon={FileText} title={t.profile.fiscalCode} subtitle={user.fiscal_code} />
            )}
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.profile.settings}</Text>
          <View style={styles.sectionCard}>
            {biometricAvailable && (
              <SettingItem
                icon={Fingerprint}
                title={Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Biometric'}
                rightElement={
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleBiometricToggle}
                    trackColor={{ false: '#e2e8f0', true: COLORS.primary + '50' }}
                    thumbColor={biometricEnabled ? COLORS.primary : '#f4f4f5'}
                  />
                }
              />
            )}
            <SettingItem
              icon={Clock}
              title={language === 'en' ? 'Last access' : language === 'es' ? 'Último acceso' : 'Ultimo accesso'}
              subtitle={lastAccess || '-'}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.profile.notifications}</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={Bell}
              title={t.profile.notifications}
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#e2e8f0', true: COLORS.primary + '50' }}
                  thumbColor={notificationsEnabled ? COLORS.primary : '#f4f4f5'}
                />
              }
            />
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.profile.language}</Text>
          <View style={styles.sectionCard}>
            <View style={styles.languageOptions}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    language === lang.code && styles.languageOptionActive,
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageLabel,
                    language === lang.code && styles.languageLabelActive,
                  ]}>
                    {lang.name}
                  </Text>
                  {language === lang.code && (
                    <Check size={16} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.profile.help}</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={HelpCircle}
              title={t.profile.help}
              onPress={() => Alert.alert('Info', 'Coming soon')}
            />
            <SettingItem
              icon={Shield}
              title={t.profile.privacy}
              onPress={() => Alert.alert('Info', 'Coming soon')}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={LogOut}
              title={t.profile.logout}
              color={COLORS.error}
              onPress={handleLogout}
            />
          </View>
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Fiscal Tax Canarie v1.0.0</Text>
          <Text style={styles.copyrightText}>© 2026 Fiscal Tax Canarie S.L.</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  header: { paddingVertical: 16 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },
  profileCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#ffffff' },
  profileName: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  profileEmail: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 },
  profileBadge: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  profileBadgeText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  settingIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  settingSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  languageOptions: { padding: 12, gap: 10 },
  languageOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#f8f9fb', borderWidth: 2, borderColor: 'transparent', gap: 10 },
  languageOptionActive: { backgroundColor: COLORS.primary + '12', borderColor: COLORS.primary + '40' },
  languageFlag: { fontSize: 22 },
  languageLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: COLORS.textSecondary },
  languageLabelActive: { color: COLORS.primary, fontWeight: '600' },
  versionContainer: { alignItems: 'center', paddingVertical: 20 },
  versionText: { fontSize: 13, color: COLORS.textLight },
  copyrightText: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
});
