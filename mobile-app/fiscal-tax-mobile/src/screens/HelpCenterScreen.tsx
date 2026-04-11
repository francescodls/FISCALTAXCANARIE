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
import { ArrowLeft, HelpCircle, MessageSquare, BookOpen, Bot, Phone, Mail, ExternalLink, ChevronRight } from 'lucide-react-native';
import { useLanguage } from '../context/LanguageContext';
import { COLORS } from '../config/constants';

export const HelpCenterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { t } = useLanguage();

  const helpItems = [
    {
      icon: HelpCircle,
      title: t.profile.faq,
      description: 'Risposte alle domande più comuni',
      onPress: () => Linking.openURL('https://fiscaltaxcanarie.com/faq'),
    },
    {
      icon: BookOpen,
      title: t.profile.userGuide,
      description: "Come utilizzare l'app",
      onPress: () => Linking.openURL('https://fiscaltaxcanarie.com/guida'),
    },
    {
      icon: Bot,
      title: t.ai.title,
      description: 'Chiedi aiuto al nostro assistente AI',
      onPress: () => navigation.navigate('Ricerca'),
    },
    {
      icon: MessageSquare,
      title: t.profile.contactSupport,
      description: 'Apri un ticket di assistenza',
      onPress: () => navigation.navigate('Comunicazioni'),
    },
  ];

  const contactMethods = [
    {
      icon: Phone,
      title: 'Telefono',
      value: '+34 928 123 456',
      onPress: () => Linking.openURL('tel:+34928123456'),
    },
    {
      icon: Mail,
      title: 'Email',
      value: 'info@fiscaltaxcanarie.com',
      onPress: () => Linking.openURL('mailto:info@fiscaltaxcanarie.com'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.profile.helpCenter}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Help Options */}
        <Text style={styles.sectionTitle}>{t.profile.help}</Text>
        <View style={styles.card}>
          {helpItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.helpItem, index < helpItems.length - 1 && styles.helpItemBorder]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.helpIconContainer}>
                <item.icon size={22} color={COLORS.primary} />
              </View>
              <View style={styles.helpContent}>
                <Text style={styles.helpTitle}>{item.title}</Text>
                <Text style={styles.helpDescription}>{item.description}</Text>
              </View>
              <ChevronRight size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact */}
        <Text style={styles.sectionTitle}>{t.profile.contactSupport}</Text>
        <View style={styles.card}>
          {contactMethods.map((method, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.contactItem, index < contactMethods.length - 1 && styles.helpItemBorder]}
              onPress={method.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.helpIconContainer, { backgroundColor: COLORS.info + '15' }]}>
                <method.icon size={20} color={COLORS.info} />
              </View>
              <View style={styles.helpContent}>
                <Text style={styles.contactLabel}>{method.title}</Text>
                <Text style={styles.contactValue}>{method.value}</Text>
              </View>
              <ExternalLink size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Office Hours */}
        <View style={styles.hoursCard}>
          <Text style={styles.hoursTitle}>Orari ufficio</Text>
          <Text style={styles.hoursText}>Lunedì - Venerdì: 9:00 - 18:00</Text>
          <Text style={styles.hoursText}>Sabato: 9:00 - 13:00</Text>
          <Text style={styles.hoursNote}>Fuso orario: Canarie (GMT+0/+1)</Text>
        </View>

        {/* Website Link */}
        <TouchableOpacity 
          style={styles.websiteButton}
          onPress={() => Linking.openURL('https://fiscaltaxcanarie.com')}
        >
          <Text style={styles.websiteButtonText}>Visita il nostro sito web</Text>
          <ExternalLink size={16} color={COLORS.primary} />
        </TouchableOpacity>
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
  sectionTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden', marginBottom: 24 },
  helpItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  helpItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  helpIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  helpContent: { flex: 1 },
  helpTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  helpDescription: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  contactLabel: { fontSize: 13, color: COLORS.textSecondary },
  contactValue: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  hoursCard: { backgroundColor: COLORS.primary + '10', borderRadius: 16, padding: 20, marginBottom: 24 },
  hoursTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  hoursText: { fontSize: 14, color: COLORS.text, marginBottom: 4 },
  hoursNote: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, fontStyle: 'italic' },
  websiteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary, padding: 16, gap: 8 },
  websiteButtonText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
});
