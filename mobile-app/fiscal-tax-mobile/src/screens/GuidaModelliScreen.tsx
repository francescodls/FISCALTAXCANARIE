import React, { useState } from 'react';
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
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Euro,
  Globe,
  Building,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
} from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';

interface ModelGuide {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  description: string;
  whoMustFile: string[];
  deadline: string;
  penalties: string;
  documents: string[];
  link?: string;
}

const guides: ModelGuide[] = [
  {
    id: 'irpf',
    title: 'IRPF',
    subtitle: 'Imposta sul Reddito delle Persone Fisiche',
    icon: Euro,
    color: '#3caca4',
    description: "L'IRPF è l'imposta principale sui redditi percepiti da persone fisiche residenti in Spagna e Canarie. Si applica su salari, rendite, attività economiche e guadagni patrimoniali.",
    whoMustFile: [
      'Chi ha redditi da lavoro superiori a 22.000€ annui',
      'Chi ha più datori di lavoro con redditi > 14.000€',
      'Chi percepisce rendite da immobili',
      'Chi ha venduto immobili o azioni',
      'Autonomi e professionisti',
    ],
    deadline: 'Aprile - Giugno (anno successivo)',
    penalties: 'Sanzioni dal 50% al 150% della quota non dichiarata',
    documents: [
      'Certificato di ritenute (Certificado de Retenciones)',
      'Contratti di lavoro',
      'Ricevute di affitto',
      'Fatture spese deducibili',
    ],
    link: 'https://sede.agenciatributaria.gob.es',
  },
  {
    id: 'iva',
    title: 'IVA',
    subtitle: 'Imposta sul Valore Aggiunto',
    icon: Building,
    color: '#8b5cf6',
    description: "L'IGIC (equivalente dell'IVA in Canarie) è l'imposta sui consumi applicata alla vendita di beni e servizi. Le Canarie hanno un regime fiscale speciale con aliquote ridotte.",
    whoMustFile: [
      'Imprese e autonomi che vendono beni/servizi',
      'Importatori di beni',
      'Chi effettua operazioni intracomunitarie',
    ],
    deadline: 'Trimestrale (20 aprile, luglio, ottobre, gennaio)',
    penalties: 'Interessi di mora + sanzioni fino al 20%',
    documents: [
      'Registro fatture emesse',
      'Registro fatture ricevute',
      'Libro contabile',
    ],
    link: 'https://sede.agenciatributaria.gob.es',
  },
  {
    id: 'modelo720',
    title: 'Modello 720',
    subtitle: 'Dichiarazione Beni all\'Estero',
    icon: Globe,
    color: '#f59e0b',
    description: "Il Modello 720 è una dichiarazione informativa obbligatoria per i residenti fiscali in Spagna che possiedono beni all'estero superiori a 50.000€ per categoria.",
    whoMustFile: [
      "Chi ha conti bancari all'estero > 50.000€",
      "Chi possiede immobili all'estero > 50.000€",
      "Chi detiene titoli/assicurazioni all'estero > 50.000€",
    ],
    deadline: '31 Marzo',
    penalties: 'Sanzioni ridotte dopo sentenza UE (prima erano molto elevate)',
    documents: [
      'Estratti conto esteri',
      'Certificati proprietà immobili',
      'Documentazione titoli e fondi',
    ],
    link: 'https://sede.agenciatributaria.gob.es',
  },
  {
    id: 'sociedades',
    title: 'Imposta Società',
    subtitle: 'Impuesto sobre Sociedades',
    icon: Building,
    color: '#3b82f6',
    description: "L'Imposta sulle Società si applica ai profitti delle società e altre entità giuridiche. In Canarie esistono incentivi fiscali speciali (ZEC, RIC).",
    whoMustFile: [
      'Società di capitali (SL, SA)',
      'Cooperative',
      'Associazioni e fondazioni',
      'Enti pubblici',
    ],
    deadline: '25 Luglio (per esercizi che coincidono con anno solare)',
    penalties: 'Sanzioni dal 50% al 150% della quota non dichiarata',
    documents: [
      'Bilancio annuale',
      'Conto economico',
      'Memoria contabile',
      'Libri sociali',
    ],
    link: 'https://sede.agenciatributaria.gob.es',
  },
];

export const GuidaModelliScreen: React.FC = () => {
  const navigation = useNavigation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const GuideCard = ({ guide }: { guide: ModelGuide }) => {
    const isExpanded = expandedId === guide.id;
    const Icon = guide.icon;

    return (
      <View style={styles.guideCard}>
        <TouchableOpacity
          style={styles.guideHeader}
          onPress={() => toggleExpand(guide.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.guideIcon, { backgroundColor: guide.color + '20' }]}>
            <Icon size={24} color={guide.color} />
          </View>
          <View style={styles.guideHeaderContent}>
            <Text style={styles.guideTitle}>{guide.title}</Text>
            <Text style={styles.guideSubtitle}>{guide.subtitle}</Text>
          </View>
          {isExpanded ? (
            <ChevronUp size={24} color={COLORS.textSecondary} />
          ) : (
            <ChevronDown size={24} color={COLORS.textSecondary} />
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.guideContent}>
            <Text style={styles.guideDescription}>{guide.description}</Text>

            <View style={styles.guideSection}>
              <Text style={styles.guideSectionTitle}>Chi deve presentarlo?</Text>
              {guide.whoMustFile.map((item, index) => (
                <View key={index} style={styles.bulletItem}>
                  <View style={[styles.bullet, { backgroundColor: guide.color }]} />
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
              ))}
            </View>

            <View style={styles.guideSection}>
              <View style={styles.infoRow}>
                <Calendar size={18} color={guide.color} />
                <Text style={styles.infoLabel}>Scadenza:</Text>
                <Text style={styles.infoValue}>{guide.deadline}</Text>
              </View>
            </View>

            <View style={styles.guideSection}>
              <View style={styles.warningBox}>
                <AlertCircle size={18} color={COLORS.warning} />
                <Text style={styles.warningText}>{guide.penalties}</Text>
              </View>
            </View>

            <View style={styles.guideSection}>
              <Text style={styles.guideSectionTitle}>Documenti necessari</Text>
              {guide.documents.map((doc, index) => (
                <View key={index} style={styles.bulletItem}>
                  <View style={[styles.bullet, { backgroundColor: COLORS.textLight }]} />
                  <Text style={styles.bulletText}>{doc}</Text>
                </View>
              ))}
            </View>

            {guide.link && (
              <TouchableOpacity
                style={[styles.linkButton, { backgroundColor: guide.color + '15' }]}
                onPress={() => openLink(guide.link!)}
              >
                <ExternalLink size={18} color={guide.color} />
                <Text style={[styles.linkButtonText, { color: guide.color }]}>
                  Maggiori informazioni
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Guida ai Modelli</Text>
          <Text style={styles.headerSubtitle}>Tutto quello che devi sapere</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Card */}
        <View style={styles.introCard}>
          <BookOpen size={32} color={COLORS.primary} />
          <Text style={styles.introTitle}>Modelli Fiscali Spagnoli</Text>
          <Text style={styles.introText}>
            Scopri i principali adempimenti fiscali per residenti alle Isole Canarie.
            Tocca ogni modello per approfondire.
          </Text>
        </View>

        {/* Guide Cards */}
        {guides.map((guide) => (
          <GuideCard key={guide.id} guide={guide} />
        ))}

        {/* Help Card */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Hai bisogno di assistenza?</Text>
          <Text style={styles.helpText}>
            Il nostro team di commercialisti è a tua disposizione per qualsiasi
            chiarimento sui tuoi obblighi fiscali.
          </Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => navigation.navigate('Chat' as never)}
          >
            <Text style={styles.helpButtonText}>Contattaci</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  introCard: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  introText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  guideCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  guideIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  guideHeaderContent: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  guideSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  guideContent: {
    padding: SPACING.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  guideDescription: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  guideSection: {
    marginBottom: SPACING.md,
  },
  guideSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: SPACING.sm,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.warning + '15',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning,
    lineHeight: 18,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  helpCard: {
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  helpButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  helpButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
