import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Shield, FileText, Cookie, Database, Mail, ExternalLink, ChevronRight } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../config/constants';
import * as SecureStore from 'expo-secure-store';

const CONSENT_KEY = 'privacy_consents';

export const PrivacyConsentScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useLanguage();
  const [marketingConsent, setMarketingConsent] = useState(false);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    try {
      const stored = await SecureStore.getItemAsync(CONSENT_KEY);
      if (stored) {
        const consents = JSON.parse(stored);
        setMarketingConsent(consents.marketing || false);
      }
    } catch (error) {
      console.error('Error loading consents:', error);
    }
  };

  const saveConsents = async (marketing: boolean) => {
    try {
      await SecureStore.setItemAsync(CONSENT_KEY, JSON.stringify({ marketing }));
      setMarketingConsent(marketing);
    } catch (error) {
      console.error('Error saving consents:', error);
    }
  };

  const policyItems = [
    {
      icon: Shield,
      title: t.profile.privacyPolicy,
      description: 'Come trattiamo i tuoi dati personali',
      url: 'https://fiscaltaxcanarie.com/privacy-policy/',
    },
    {
      icon: Cookie,
      title: t.profile.cookiePolicy,
      description: "Utilizzo dei cookie nell'app e sul sito",
      url: 'https://fiscaltaxcanarie.com/cookie-policy/',
    },
    {
      icon: FileText,
      title: t.profile.termsConditions,
      description: 'Termini di utilizzo del servizio',
      url: 'https://fiscaltaxcanarie.com/terms/',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.profile.privacyConsent}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Shield size={20} color={COLORS.primary} />
          <Text style={styles.infoText}>
            La tua privacy è importante per noi. Qui puoi consultare le nostre policy e gestire i tuoi consensi.
          </Text>
        </View>

        {/* Policy Links */}
        <Text style={styles.sectionTitle}>Documentazione</Text>
        <View style={styles.card}>
          {policyItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.policyItem, index < policyItems.length - 1 && styles.itemBorder]}
              onPress={() => Linking.openURL(item.url)}
              activeOpacity={0.7}
            >
              <View style={styles.policyIconContainer}>
                <item.icon size={20} color={COLORS.primary} />
              </View>
              <View style={styles.policyContent}>
                <Text style={styles.policyTitle}>{item.title}</Text>
                <Text style={styles.policyDescription}>{item.description}</Text>
              </View>
              <ExternalLink size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Data Processing Info */}
        <Text style={styles.sectionTitle}>{t.profile.dataProcessing}</Text>
        <View style={styles.card}>
          <View style={styles.dataItem}>
            <View style={[styles.policyIconContainer, { backgroundColor: COLORS.info + '15' }]}>
              <Database size={20} color={COLORS.info} />
            </View>
            <View style={styles.policyContent}>
              <Text style={styles.policyTitle}>Titolare del trattamento</Text>
              <Text style={styles.policyDescription}>Fiscal Tax Canarie S.L.</Text>
              <Text style={styles.dataDetail}>CIF: B12345678</Text>
              <Text style={styles.dataDetail}>C/ Principal 123, Las Palmas</Text>
            </View>
          </View>
        </View>

        {/* Consent Management */}
        <Text style={styles.sectionTitle}>Gestione consensi</Text>
        <View style={styles.card}>
          <View style={styles.consentItem}>
            <View style={[styles.policyIconContainer, { backgroundColor: COLORS.warning + '15' }]}>
              <Mail size={20} color={COLORS.warning} />
            </View>
            <View style={styles.policyContent}>
              <Text style={styles.policyTitle}>{t.profile.marketingConsent}</Text>
              <Text style={styles.policyDescription}>
                Acconsento a ricevere comunicazioni commerciali e promozionali
              </Text>
            </View>
            <Switch
              value={marketingConsent}
              onValueChange={saveConsents}
              trackColor={{ false: '#e2e8f0', true: COLORS.primary + '50' }}
              thumbColor={marketingConsent ? COLORS.primary : '#f4f4f5'}
            />
          </View>
        </View>

        {/* Rights Info */}
        <View style={styles.rightsCard}>
          <Text style={styles.rightsTitle}>I tuoi diritti</Text>
          <Text style={styles.rightsText}>
            Hai diritto di accedere, rettificare, cancellare i tuoi dati personali, 
            limitarne il trattamento e portabilità. Per esercitare questi diritti, 
            contattaci all'indirizzo privacy@fiscaltaxcanarie.com
          </Text>
        </View>

        {/* Last Updated */}
        <Text style={styles.lastUpdated}>
          {t.profile.lastUpdated}: 1 Gennaio 2026
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  headerRight: { width: 40 },
  content: { flex: 1 },
  contentContainer: { padding: 24 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.primary + '10', borderRadius: 12, padding: 16, marginBottom: 24, gap: 12 },
  infoText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', marginBottom: 24 },
  policyItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  policyIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  policyContent: { flex: 1 },
  policyTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  policyDescription: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  dataItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 16 },
  dataDetail: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  consentItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rightsCard: { backgroundColor: COLORS.info + '10', borderRadius: 16, padding: 20, marginBottom: 24 },
  rightsTitle: { fontSize: 15, fontWeight: '700', color: COLORS.info, marginBottom: 8 },
  rightsText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },
  lastUpdated: { fontSize: 12, color: COLORS.textLight, textAlign: 'center' },
});
