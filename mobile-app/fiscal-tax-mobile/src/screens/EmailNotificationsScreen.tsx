import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Mail, Calendar, FileText, MessageSquare, Bell, Newspaper } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { COLORS } from '../config/constants';
import * as SecureStore from 'expo-secure-store';

const EMAIL_PREFS_KEY = 'email_notification_prefs';

interface EmailPrefs {
  deadlines: boolean;
  documents: boolean;
  tickets: boolean;
  practices: boolean;
  news: boolean;
}

export const EmailNotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<EmailPrefs>({
    deadlines: true,
    documents: true,
    tickets: true,
    practices: true,
    news: false,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await SecureStore.getItemAsync(EMAIL_PREFS_KEY);
      if (stored) {
        setPrefs(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading email prefs:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPrefs: EmailPrefs) => {
    setSaving(true);
    try {
      await SecureStore.setItemAsync(EMAIL_PREFS_KEY, JSON.stringify(newPrefs));
      setPrefs(newPrefs);
      // Sync with backend if available
      try {
        await apiService.updateEmailPreferences(newPrefs as unknown as Record<string, boolean>);
      } catch {}
      Alert.alert(t.common.success, t.profile.preferencesUpdated);
    } catch (error) {
      Alert.alert(t.common.error, t.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  const togglePref = (key: keyof EmailPrefs) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    savePreferences(newPrefs);
  };

  const PreferenceItem = ({
    icon: Icon,
    title,
    description,
    value,
    onToggle,
  }: {
    icon: any;
    title: string;
    description: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <View style={styles.prefItem}>
      <View style={[styles.prefIcon, { backgroundColor: COLORS.primary + '15' }]}>
        <Icon size={20} color={COLORS.primary} />
      </View>
      <View style={styles.prefContent}>
        <Text style={styles.prefTitle}>{title}</Text>
        <Text style={styles.prefDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#e2e8f0', true: COLORS.primary + '50' }}
        thumbColor={value ? COLORS.primary : '#f4f4f5'}
        disabled={saving}
      />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.profile.emailNotifications}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBox}>
          <Mail size={20} color={COLORS.info} />
          <Text style={styles.infoText}>
            {t.profile.emailNotifications}: {prefs.deadlines || prefs.documents || prefs.tickets || prefs.practices ? '✓' : '✗'}
          </Text>
        </View>

        <View style={styles.prefsCard}>
          <PreferenceItem
            icon={Calendar}
            title={t.profile.emailNotifDeadlines}
            description="Ricevi promemoria sulle scadenze fiscali"
            value={prefs.deadlines}
            onToggle={() => togglePref('deadlines')}
          />
          <PreferenceItem
            icon={FileText}
            title={t.profile.emailNotifDocuments}
            description="Notifiche quando vengono caricati nuovi documenti"
            value={prefs.documents}
            onToggle={() => togglePref('documents')}
          />
          <PreferenceItem
            icon={MessageSquare}
            title={t.profile.emailNotifTickets}
            description="Aggiornamenti sui tuoi ticket di assistenza"
            value={prefs.tickets}
            onToggle={() => togglePref('tickets')}
          />
          <PreferenceItem
            icon={Bell}
            title={t.profile.emailNotifPractices}
            description="Stato e progressi delle tue pratiche"
            value={prefs.practices}
            onToggle={() => togglePref('practices')}
          />
          <PreferenceItem
            icon={Newspaper}
            title={t.profile.emailNotifNews}
            description="Newsletter con novità fiscali e aggiornamenti"
            value={prefs.news}
            onToggle={() => togglePref('news')}
          />
        </View>

        {saving && (
          <View style={styles.savingOverlay}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.savingText}>{t.common.loading}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  headerRight: { width: 40 },
  content: { flex: 1 },
  contentContainer: { padding: 24 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.info + '15', borderRadius: 12, padding: 16, marginBottom: 24, gap: 12 },
  infoText: { flex: 1, fontSize: 14, color: COLORS.info, fontWeight: '500' },
  prefsCard: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  prefItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  prefIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  prefContent: { flex: 1 },
  prefTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  prefDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  savingOverlay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 8 },
  savingText: { fontSize: 14, color: COLORS.textSecondary },
});
