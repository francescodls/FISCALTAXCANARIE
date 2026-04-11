import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, FileText, ExternalLink } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../config/constants';

export const TermsConditionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t, language } = useLanguage();

  const sections = [
    {
      title: '1. Oggetto del servizio',
      content: "Fiscal Tax Canarie S.L. fornisce servizi di consulenza fiscale, contabile e amministrativa per privati e aziende che operano nelle Isole Canarie e in Spagna. L'app mobile consente l'accesso ai servizi digitali dello studio."
    },
    {
      title: '2. Registrazione e account',
      content: "L'accesso all'app richiede la creazione di un account. L'utente è responsabile della riservatezza delle proprie credenziali e di tutte le attività svolte con il proprio account."
    },
    {
      title: '3. Utilizzo del servizio',
      content: "L'utente si impegna a utilizzare il servizio in conformità con la legge vigente e le presenti condizioni. È vietato qualsiasi uso fraudolento o illegale della piattaforma."
    },
    {
      title: '4. Proprietà intellettuale',
      content: "Tutti i contenuti dell'app, inclusi testi, grafica, logo e software, sono di proprietà di Fiscal Tax Canarie S.L. o dei suoi licenzianti e sono protetti dalle leggi sul copyright."
    },
    {
      title: '5. Limitazione di responsabilità',
      content: "Le informazioni fornite attraverso l'app e l'assistente AI hanno carattere puramente informativo e non costituiscono consulenza professionale specifica. Per decisioni importanti, consultare sempre un professionista."
    },
    {
      title: '6. Modifiche ai termini',
      content: "Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. Le modifiche saranno comunicate tramite l'app o via email. L'uso continuato del servizio implica l'accettazione dei nuovi termini."
    },
    {
      title: '7. Legge applicabile',
      content: "Questi termini sono regolati dalla legge spagnola. Per qualsiasi controversia sarà competente il foro di Las Palmas de Gran Canaria."
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.profile.termsConditions}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Info */}
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <FileText size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.introTitle}>{t.profile.termsOfService}</Text>
          <Text style={styles.introSubtitle}>Fiscal Tax Canarie S.L.</Text>
          <Text style={styles.lastUpdate}>{t.profile.lastUpdated}: 1 Gennaio 2026</Text>
        </View>

        {/* Sections */}
        {sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        {/* Contact */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Contatti</Text>
          <Text style={styles.contactText}>Fiscal Tax Canarie S.L.</Text>
          <Text style={styles.contactText}>C/ Principal 123, 35001 Las Palmas</Text>
          <Text style={styles.contactText}>CIF: B12345678</Text>
          <Text style={styles.contactText}>Email: legal@fiscaltaxcanarie.com</Text>
        </View>

        {/* Full Terms Link */}
        <TouchableOpacity 
          style={styles.fullTermsButton}
          onPress={() => Linking.openURL('https://fiscaltaxcanarie.com/terms/')}
        >
          <Text style={styles.fullTermsText}>Versione completa online</Text>
          <ExternalLink size={16} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={{ height: 50 }} />
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
  introCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24 },
  introIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  introTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  introSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  lastUpdate: { fontSize: 12, color: COLORS.textLight },
  section: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  sectionContent: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  contactCard: { backgroundColor: COLORS.primary + '10', borderRadius: 16, padding: 20, marginBottom: 24 },
  contactTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  contactText: { fontSize: 13, color: COLORS.text, marginBottom: 4 },
  fullTermsButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary, padding: 16, gap: 8 },
  fullTermsText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
});
