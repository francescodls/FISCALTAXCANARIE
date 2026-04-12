import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
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
  Globe,
  Settings,
  Key,
  BellRing,
  AlertCircle,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../config/constants';
import { Language } from '../i18n';

const BIOMETRIC_KEY = 'biometric_enabled';
const PUSH_ENABLED_KEY = 'push_notifications_enabled';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { t, language, setLanguage, languages } = useLanguage();
  const { mode, setMode, isDark } = useTheme();
  const navigation = useNavigation<any>();
  
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('Biometric');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pushPermission, setPushPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [refreshing, setRefreshing] = useState(false);
  const [lastAccess, setLastAccess] = useState<string>('');

  useEffect(() => {
    checkBiometricAvailability();
    loadBiometricSetting();
    checkPushPermission();
    loadPushSetting();
    updateLastAccess();
  }, []);

  const updateLastAccess = () => {
    const locale = language === 'en' ? 'en-GB' : language === 'es' ? 'es-ES' : 'it-IT';
    setLastAccess(new Date().toLocaleString(locale, { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    }));
  };

  const checkBiometricAvailability = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    setBiometricAvailable(compatible && enrolled);
    
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      setBiometricType('Face ID');
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      setBiometricType('Touch ID');
    }
  };

  const loadBiometricSetting = async () => {
    try {
      const stored = await SecureStore.getItemAsync(BIOMETRIC_KEY);
      if (stored === 'true') {
        setBiometricEnabled(true);
      }
    } catch (error) {
      console.error('Error loading biometric setting:', error);
    }
  };

  const checkPushPermission = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPushPermission(status);
  };

  const loadPushSetting = async () => {
    try {
      const stored = await SecureStore.getItemAsync(PUSH_ENABLED_KEY);
      setPushEnabled(stored !== 'false');
    } catch (error) {
      console.error('Error loading push setting:', error);
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      // Verify biometric before enabling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t.common.confirm,
        cancelLabel: t.common.cancel,
        disableDeviceFallback: false,
      });
      
      if (result.success) {
        await SecureStore.setItemAsync(BIOMETRIC_KEY, 'true');
        setBiometricEnabled(true);
        Alert.alert(t.common.success, t.profile.biometricEnabled);
      }
    } else {
      await SecureStore.setItemAsync(BIOMETRIC_KEY, 'false');
      setBiometricEnabled(false);
      Alert.alert(t.common.success, t.profile.biometricDisabled);
    }
  };

  const handlePushToggle = async (value: boolean) => {
    if (value) {
      if (pushPermission === 'denied') {
        Alert.alert(
          t.profile.pushNotifications,
          t.profile.pushDenied,
          [
            { text: t.common.cancel, style: 'cancel' },
            { text: t.profile.openSettings, onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        await SecureStore.setItemAsync(PUSH_ENABLED_KEY, 'true');
        setPushEnabled(true);
        setPushPermission('granted');
        Alert.alert(t.common.success, t.profile.pushEnabled);
      } else {
        setPushPermission('denied');
        Alert.alert(t.common.error, t.profile.pushDenied);
      }
    } else {
      await SecureStore.setItemAsync(PUSH_ENABLED_KEY, 'false');
      setPushEnabled(false);
      Alert.alert(t.common.success, t.profile.pushDisabled);
    }
  };

  const handleLanguageChange = async (lang: Language) => {
    await setLanguage(lang);
    updateLastAccess();
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

  const handleDisconnectAll = () => {
    Alert.alert(
      t.profile.disconnectAll,
      t.profile.disconnectAllConfirm,
      [
        { text: t.common.cancel, style: 'cancel' },
        { 
          text: t.profile.disconnectAll, 
          style: 'destructive', 
          onPress: async () => {
            try {
              // In production, call API to invalidate all sessions
              // await apiService.disconnectAllSessions();
              logout();
            } catch (error) {
              logout();
            }
          }
        },
      ]
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await checkBiometricAvailability();
    await checkPushPermission();
    updateLastAccess();
    setRefreshing(false);
  }, []);

  const getProfileName = () => {
    if (user?.full_name && user.full_name.trim()) return user.full_name;
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      const cleanName = emailName.replace(/[._]/g, ' ');
      return cleanName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
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

  // Colori dinamici dal tema
  const { colors } = useTheme();

  const SettingItem = ({
    icon: Icon,
    title,
    subtitle,
    onPress,
    rightElement,
    color = colors.text,
    showArrow = true,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    color?: string;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: color + '15' }]}>
        <Icon size={20} color={color} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {rightElement || (onPress && showArrow && <ChevronRight size={20} color={colors.textLight} />)}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t.profile.title}</Text>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {getProfileName().charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>{getProfileName()}</Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
          <View style={[styles.profileBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.profileBadgeText, { color: colors.primary }]}>{getClientType()}</Text>
          </View>
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.profile.personalInfo}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingItem icon={Mail} title={t.profile.email} subtitle={user?.email} showArrow={false} />
            {user?.phone && (
              <SettingItem icon={Phone} title={t.profile.phone} subtitle={user.phone} showArrow={false} />
            )}
            {user?.fiscal_code && (
              <SettingItem icon={FileText} title={t.profile.fiscalCode} subtitle={user.fiscal_code} showArrow={false} />
            )}
            <SettingItem icon={Clock} title={t.profile.lastActive} subtitle={lastAccess} showArrow={false} />
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.profile.security}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {biometricAvailable ? (
              <SettingItem
                icon={Fingerprint}
                title={biometricType}
                subtitle={t.profile.biometricDesc}
                rightElement={
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleBiometricToggle}
                    trackColor={{ false: colors.border, true: colors.primary + '50' }}
                    thumbColor={biometricEnabled ? colors.primary : '#f4f4f5'}
                  />
                }
              />
            ) : (
              <SettingItem
                icon={Fingerprint}
                title={t.profile.biometric}
                subtitle={t.profile.biometricNotAvailable}
                color={colors.textLight}
                showArrow={false}
              />
            )}
            <SettingItem
              icon={Lock}
              title={t.profile.changePassword}
              onPress={() => navigation.navigate('ChangePassword')}
            />
            <SettingItem
              icon={Smartphone}
              title={t.profile.manageDevices}
              onPress={() => navigation.navigate('ManageDevices')}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.profile.notifications}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingItem
              icon={BellRing}
              title={t.profile.pushNotifications}
              subtitle={pushPermission === 'denied' ? t.profile.pushDenied : undefined}
              rightElement={
                <Switch
                  value={pushEnabled && pushPermission !== 'denied'}
                  onValueChange={handlePushToggle}
                  trackColor={{ false: colors.border, true: colors.primary + '50' }}
                  thumbColor={pushEnabled && pushPermission !== 'denied' ? colors.primary : '#f4f4f5'}
                />
              }
            />
            <SettingItem
              icon={Mail}
              title={t.profile.emailNotifications}
              onPress={() => navigation.navigate('EmailNotifications')}
            />
          </View>
        </View>

        {/* Theme / Appearance */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.profile.appearance || 'Aspetto'}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.themeOptions}>
              <TouchableOpacity
                style={[styles.themeOption, { backgroundColor: colors.surfaceAlt }, mode === 'light' && { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40' }]}
                onPress={() => setMode('light')}
              >
                <Sun size={22} color={mode === 'light' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.themeLabel, { color: colors.textSecondary }, mode === 'light' && { color: colors.primary }]}>
                  {t.profile.themeLight || 'Chiaro'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeOption, { backgroundColor: colors.surfaceAlt }, mode === 'dark' && { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40' }]}
                onPress={() => setMode('dark')}
              >
                <Moon size={22} color={mode === 'dark' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.themeLabel, { color: colors.textSecondary }, mode === 'dark' && { color: colors.primary }]}>
                  {t.profile.themeDark || 'Scuro'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeOption, { backgroundColor: colors.surfaceAlt }, mode === 'system' && { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40' }]}
                onPress={() => setMode('system')}
              >
                <Monitor size={22} color={mode === 'system' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.themeLabel, { color: colors.textSecondary }, mode === 'system' && { color: colors.primary }]}>
                  {t.profile.themeAuto || 'Auto'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.profile.language}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.languageOptions}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    { backgroundColor: colors.surfaceAlt },
                    language === lang.code && { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40' },
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageLabel,
                    { color: colors.textSecondary },
                    language === lang.code && { color: colors.primary },
                  ]}>
                    {lang.name}
                  </Text>
                  {language === lang.code && (
                    <Check size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t.profile.help}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingItem
              icon={HelpCircle}
              title={t.profile.helpCenter}
              onPress={() => navigation.navigate('HelpCenter')}
            />
            <SettingItem
              icon={Shield}
              title={t.profile.privacyConsent}
              onPress={() => navigation.navigate('PrivacyConsent')}
            />
            <SettingItem
              icon={FileText}
              title={t.profile.termsConditions}
              onPress={() => navigation.navigate('TermsConditions')}
            />
          </View>
        </View>

        {/* Logout & Disconnect */}
        <View style={styles.section}>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SettingItem
              icon={AlertCircle}
              title={t.profile.disconnectAll}
              color={colors.warning}
              onPress={handleDisconnectAll}
            />
            <SettingItem
              icon={LogOut}
              title={t.profile.logout}
              color={colors.error}
              onPress={handleLogout}
            />
          </View>
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.textLight }]}>Fiscal Tax Canarie v1.0.0</Text>
          <Text style={[styles.copyrightText, { color: colors.textLight }]}>© 2026 Fiscal Tax Canarie S.L.</Text>
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
  themeOptions: { flexDirection: 'row', padding: 12, gap: 10 },
  themeOption: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#f8f9fb', borderWidth: 2, borderColor: 'transparent', gap: 8 },
  themeOptionActive: { backgroundColor: COLORS.primary + '12', borderColor: COLORS.primary + '40' },
  themeLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  themeLabelActive: { color: COLORS.primary, fontWeight: '600' },
  versionContainer: { alignItems: 'center', paddingVertical: 20 },
  versionText: { fontSize: 13, color: COLORS.textLight },
  copyrightText: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
});
