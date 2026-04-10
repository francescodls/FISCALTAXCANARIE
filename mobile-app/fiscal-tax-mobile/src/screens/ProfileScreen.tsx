import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Bell,
  Globe,
  ChevronRight,
  LogOut,
  Fingerprint,
  Smartphone,
  Clock,
  Lock,
  HelpCircle,
  FileText,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS } from '../config/constants';

interface UserProfile {
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  fiscal_code?: string;
  client_type?: string;
}

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({});
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [language, setLanguage] = useState('it');
  const [lastAccess, setLastAccess] = useState<string | null>(null);

  useEffect(() => {
    checkBiometricAvailability();
    loadProfile();
  }, []);

  const checkBiometricAvailability = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(compatible && enrolled);
  };

  const loadProfile = () => {
    if (user) {
      setProfile({
        full_name: user.full_name || user.email?.split('@')[0],
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        fiscal_code: user.fiscal_code || '',
        client_type: user.role === 'admin' ? 'Amministratore' : 'Cliente',
      });
      setLastAccess(new Date().toLocaleString('it-IT'));
    }
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Conferma la tua identità',
        cancelLabel: 'Annulla',
        disableDeviceFallback: false,
      });
      
      if (result.success) {
        setBiometricEnabled(true);
        Alert.alert('Successo', 'Accesso biometrico attivato');
      }
    } else {
      setBiometricEnabled(false);
      Alert.alert('Info', 'Accesso biometrico disattivato');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Esci',
      'Sei sicuro di voler uscire?',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Esci', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleLogoutAllDevices = () => {
    Alert.alert(
      'Disconnetti tutti i dispositivi',
      'Verrai disconnesso da tutti i dispositivi. Dovrai effettuare nuovamente il login.',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Conferma', 
          style: 'destructive', 
          onPress: () => {
            Alert.alert('Successo', 'Disconnesso da tutti i dispositivi');
            logout();
          },
        },
      ]
    );
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profilo</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          </View>
          <Text style={styles.profileName}>{profile.full_name || 'Utente'}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>{profile.client_type}</Text>
          </View>
        </View>

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informazioni Account</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={Mail}
              title="Email"
              subtitle={profile.email}
            />
            {profile.phone && (
              <SettingItem
                icon={Phone}
                title="Telefono"
                subtitle={profile.phone}
              />
            )}
            {profile.fiscal_code && (
              <SettingItem
                icon={FileText}
                title="Codice Fiscale"
                subtitle={profile.fiscal_code}
              />
            )}
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sicurezza</Text>
          <View style={styles.sectionCard}>
            {biometricAvailable && (
              <SettingItem
                icon={Fingerprint}
                title={Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Impronta digitale'}
                subtitle="Accedi rapidamente con la biometria"
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
              icon={Lock}
              title="Cambia password"
              onPress={() => Alert.alert('Info', 'Funzionalità in arrivo')}
            />
            <SettingItem
              icon={Clock}
              title="Ultimo accesso"
              subtitle={lastAccess || 'Non disponibile'}
            />
            <SettingItem
              icon={Smartphone}
              title="Gestisci dispositivi"
              subtitle="Visualizza i dispositivi connessi"
              onPress={() => Alert.alert('Info', 'Funzionalità in arrivo')}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifiche</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={Bell}
              title="Notifiche push"
              subtitle="Ricevi avvisi su scadenze e aggiornamenti"
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#e2e8f0', true: COLORS.primary + '50' }}
                  thumbColor={notificationsEnabled ? COLORS.primary : '#f4f4f5'}
                />
              }
            />
            <SettingItem
              icon={Mail}
              title="Email di notifica"
              subtitle="Scadenze, documenti, comunicazioni"
              onPress={() => Alert.alert('Info', 'Funzionalità in arrivo')}
            />
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lingua</Text>
          <View style={styles.sectionCard}>
            <View style={styles.languageOptions}>
              {[
                { code: 'it', label: 'Italiano', flag: '🇮🇹' },
                { code: 'es', label: 'Español', flag: '🇪🇸' },
                { code: 'en', label: 'English', flag: '🇬🇧' },
              ].map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    language === lang.code && styles.languageOptionActive,
                  ]}
                  onPress={() => setLanguage(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text
                    style={[
                      styles.languageLabel,
                      language === lang.code && styles.languageLabelActive,
                    ]}
                  >
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supporto</Text>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={HelpCircle}
              title="Centro assistenza"
              onPress={() => Alert.alert('Info', 'Apri centro assistenza')}
            />
            <SettingItem
              icon={Shield}
              title="Privacy e consensi"
              onPress={() => Alert.alert('Info', 'Gestisci privacy')}
            />
            <SettingItem
              icon={FileText}
              title="Termini e condizioni"
              onPress={() => Alert.alert('Info', 'Visualizza termini')}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <SettingItem
              icon={Smartphone}
              title="Disconnetti tutti i dispositivi"
              color={COLORS.warning}
              onPress={handleLogoutAllDevices}
            />
            <SettingItem
              icon={LogOut}
              title="Esci"
              color={COLORS.error}
              onPress={handleLogout}
            />
          </View>
        </View>

        {/* App Version */}
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
  container: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  profileBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  profileBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  settingSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  languageOptions: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
  },
  languageOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8f9fb',
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 6,
  },
  languageOptionActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  languageFlag: {
    fontSize: 18,
  },
  languageLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  languageLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  copyrightText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
});
