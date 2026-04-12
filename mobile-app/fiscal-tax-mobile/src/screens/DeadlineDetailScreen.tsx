import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  Home,
  Calendar,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  Bell,
  FileText,
  Mail,
  Phone,
  X,
} from 'lucide-react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';

// Contatti studio
const STUDIO_EMAIL = 'info@fiscaltaxcanary.com';
const STUDIO_PHONE = '+34658071848'; // Formato per tel:
const STUDIO_PHONE_DISPLAY = '+34 658 071 848'; // Formato per visualizzazione

interface DeadlineParams {
  id: string;
  title: string;
  description: string;
  due_date: string;
  category: string;
  status: string;
  priority: string;
  daysLeft?: number;
}

export const DeadlineDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = route.params as DeadlineParams;
  const [showContactSheet, setShowContactSheet] = useState(false);

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'HomeTab' });
    }
  };

  const handleGoHome = () => {
    navigation.navigate('Main', { screen: 'HomeTab' });
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bgColor: string; icon: any; text: string }> = {
      'da_fare': {
        color: COLORS.warning,
        bgColor: COLORS.warning + '20',
        icon: Clock,
        text: 'Da completare',
      },
      'in_corso': {
        color: COLORS.primary,
        bgColor: COLORS.primary + '20',
        icon: Clock,
        text: 'In corso',
      },
      'completata': {
        color: COLORS.success,
        bgColor: COLORS.success + '20',
        icon: CheckCircle,
        text: 'Completata',
      },
      'scaduta': {
        color: COLORS.error,
        bgColor: COLORS.error + '20',
        icon: AlertCircle,
        text: 'Scaduta',
      },
    };
    return configs[status] || configs['da_fare'];
  };

  const getPriorityConfig = (priority: string) => {
    const configs: Record<string, { color: string; text: string; icon: any }> = {
      'alta': {
        color: COLORS.error,
        text: 'Priorità Alta',
        icon: AlertTriangle,
      },
      'normale': {
        color: COLORS.warning,
        text: 'Priorità Normale',
        icon: Info,
      },
      'bassa': {
        color: COLORS.textSecondary,
        text: 'Priorità Bassa',
        icon: Info,
      },
    };
    return configs[priority] || configs['normale'];
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'fiscale': 'Scadenza Fiscale',
      'tributaria': 'Scadenza Tributaria',
      'amministrativa': 'Scadenza Amministrativa',
      'societaria': 'Scadenza Societaria',
      'altro': 'Altra Scadenza',
    };
    return labels[category] || category || 'Scadenza';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const calculateDaysLeft = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const diffTime = date.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  };

  const daysLeft = params.daysLeft ?? calculateDaysLeft(params.due_date);
  const statusConfig = getStatusConfig(params.status);
  const priorityConfig = getPriorityConfig(params.priority);
  const StatusIcon = statusConfig.icon;
  const PriorityIcon = priorityConfig.icon;

  const getUrgencyMessage = () => {
    if (daysLeft < 0) {
      return {
        text: `Scaduta da ${Math.abs(daysLeft)} giorni`,
        color: COLORS.error,
        bgColor: COLORS.error + '15',
      };
    } else if (daysLeft === 0) {
      return {
        text: 'Scade OGGI!',
        color: COLORS.error,
        bgColor: COLORS.error + '15',
      };
    } else if (daysLeft <= 3) {
      return {
        text: `Scade tra ${daysLeft} giorni - URGENTE`,
        color: COLORS.error,
        bgColor: COLORS.error + '15',
      };
    } else if (daysLeft <= 7) {
      return {
        text: `Scade tra ${daysLeft} giorni`,
        color: COLORS.warning,
        bgColor: COLORS.warning + '15',
      };
    } else {
      return {
        text: `Scade tra ${daysLeft} giorni`,
        color: COLORS.success,
        bgColor: COLORS.success + '15',
      };
    }
  };

  const urgency = getUrgencyMessage();

  // Formatta data per email
  const formatDateForEmail = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Gestione contatto studio
  const handleContactStudio = () => {
    setShowContactSheet(true);
  };

  // Invia email
  const handleSendEmail = async () => {
    setShowContactSheet(false);
    
    const subject = encodeURIComponent(`Richiesta assistenza su scadenza: ${params.title}`);
    const body = encodeURIComponent(
      `Gentile Studio Fiscal Tax Canarie,\n\n` +
      `Vi contatto in merito alla seguente scadenza:\n\n` +
      `📋 Scadenza: ${params.title}\n` +
      `📅 Data: ${formatDateForEmail(params.due_date)}\n` +
      `📁 Categoria: ${getCategoryLabel(params.category)}\n` +
      `⚡ Stato: ${getStatusConfig(params.status).text}\n\n` +
      `Descrizione: ${params.description || 'N/A'}\n\n` +
      `---\n` +
      `Richiesta:\n\n\n\n` +
      `Cordiali saluti`
    );
    
    const mailtoUrl = `mailto:${STUDIO_EMAIL}?subject=${subject}&body=${body}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        console.log('[DeadlineDetail] Email client opened successfully');
      } else {
        Alert.alert(
          'Email non disponibile',
          `Non è possibile aprire il client email. Puoi scrivere manualmente a:\n\n${STUDIO_EMAIL}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[DeadlineDetail] Error opening email:', error);
      Alert.alert(
        'Errore',
        `Impossibile aprire il client email. Contatta lo studio a:\n\n${STUDIO_EMAIL}`,
        [{ text: 'OK' }]
      );
    }
  };

  // Avvia chiamata
  const handleCall = async () => {
    setShowContactSheet(false);
    
    const phoneUrl = `tel:${STUDIO_PHONE}`;
    
    try {
      const canOpen = await Linking.canOpenURL(phoneUrl);
      if (canOpen) {
        await Linking.openURL(phoneUrl);
        console.log('[DeadlineDetail] Phone dialer opened successfully');
      } else {
        Alert.alert(
          'Chiamata non disponibile',
          `Non è possibile avviare la chiamata. Puoi chiamare manualmente:\n\n${STUDIO_PHONE_DISPLAY}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[DeadlineDetail] Error opening phone:', error);
      Alert.alert(
        'Errore',
        `Impossibile avviare la chiamata. Contatta lo studio al:\n\n${STUDIO_PHONE_DISPLAY}`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Dettaglio Scadenza</Text>
        </View>
        <TouchableOpacity onPress={handleGoHome} style={styles.homeButton}>
          <Home size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Urgency Banner */}
        <View style={[styles.urgencyBanner, { backgroundColor: urgency.bgColor }]}>
          <AlertTriangle size={24} color={urgency.color} />
          <Text style={[styles.urgencyText, { color: urgency.color }]}>
            {urgency.text}
          </Text>
        </View>

        {/* Main Card */}
        <View style={styles.mainCard}>
          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <FileText size={16} color={COLORS.primary} />
            <Text style={styles.categoryText}>{getCategoryLabel(params.category)}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{params.title}</Text>

          {/* Status and Priority */}
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <StatusIcon size={16} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.text}
              </Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.color + '15' }]}>
              <PriorityIcon size={16} color={priorityConfig.color} />
              <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                {priorityConfig.text}
              </Text>
            </View>
          </View>

          {/* Date */}
          <View style={styles.dateSection}>
            <Calendar size={20} color={COLORS.primary} />
            <View style={styles.dateInfo}>
              <Text style={styles.dateLabel}>Data scadenza</Text>
              <Text style={styles.dateValue}>{formatDate(params.due_date)}</Text>
            </View>
          </View>
        </View>

        {/* Description Card */}
        {params.description ? (
          <View style={styles.descriptionCard}>
            <View style={styles.descriptionHeader}>
              <Info size={20} color={COLORS.primary} />
              <Text style={styles.descriptionTitle}>Descrizione</Text>
            </View>
            <Text style={styles.descriptionText}>{params.description}</Text>
          </View>
        ) : null}

        {/* What to do section */}
        <View style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <Bell size={20} color={COLORS.warning} />
            <Text style={styles.actionTitle}>Cosa devi fare?</Text>
          </View>
          <View style={styles.actionContent}>
            {daysLeft < 0 ? (
              <View style={styles.actionItem}>
                <AlertCircle size={18} color={COLORS.error} />
                <Text style={styles.actionText}>
                  Questa scadenza è già passata. Contatta lo studio per verificare eventuali sanzioni o proroghe.
                </Text>
              </View>
            ) : daysLeft === 0 ? (
              <View style={styles.actionItem}>
                <AlertTriangle size={18} color={COLORS.error} />
                <Text style={styles.actionText}>
                  La scadenza è OGGI! Completa urgentemente l'adempimento richiesto o contatta lo studio.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.actionItem}>
                  <CheckCircle size={18} color={COLORS.success} />
                  <Text style={styles.actionText}>
                    Verifica di avere tutti i documenti necessari
                  </Text>
                </View>
                <View style={styles.actionItem}>
                  <CheckCircle size={18} color={COLORS.success} />
                  <Text style={styles.actionText}>
                    Prepara le informazioni richieste per l'adempimento
                  </Text>
                </View>
                <View style={styles.actionItem}>
                  <CheckCircle size={18} color={COLORS.success} />
                  <Text style={styles.actionText}>
                    Contatta lo studio se hai bisogno di assistenza
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Help Card */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Hai bisogno di assistenza?</Text>
          <Text style={styles.helpText}>
            Il nostro team di commercialisti è a tua disposizione per qualsiasi chiarimento su questa scadenza.
          </Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={handleContactStudio}
            activeOpacity={0.8}
          >
            <Phone size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.helpButtonText}>Contatta lo studio</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Contact Action Sheet Modal */}
      <Modal
        visible={showContactSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContactSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowContactSheet(false)}
        >
          <View style={styles.actionSheet}>
            {/* Header */}
            <View style={styles.actionSheetHeader}>
              <View style={styles.actionSheetHandle} />
              <Text style={styles.actionSheetTitle}>Contatta lo studio</Text>
              <Text style={styles.actionSheetSubtitle}>
                Scegli come vuoi contattarci
              </Text>
            </View>

            {/* Email Option */}
            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={handleSendEmail}
              activeOpacity={0.7}
            >
              <View style={[styles.actionSheetIcon, { backgroundColor: COLORS.info + '15' }]}>
                <Mail size={24} color={COLORS.info} />
              </View>
              <View style={styles.actionSheetOptionInfo}>
                <Text style={styles.actionSheetOptionTitle}>Invia email</Text>
                <Text style={styles.actionSheetOptionSubtitle}>{STUDIO_EMAIL}</Text>
              </View>
            </TouchableOpacity>

            {/* Phone Option */}
            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={handleCall}
              activeOpacity={0.7}
            >
              <View style={[styles.actionSheetIcon, { backgroundColor: COLORS.success + '15' }]}>
                <Phone size={24} color={COLORS.success} />
              </View>
              <View style={styles.actionSheetOptionInfo}>
                <Text style={styles.actionSheetOptionTitle}>Chiama ora</Text>
                <Text style={styles.actionSheetOptionSubtitle}>{STUDIO_PHONE_DISPLAY}</Text>
              </View>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.actionSheetCancel}
              onPress={() => setShowContactSheet(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionSheetCancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  homeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.primary + '15',
    borderRadius: RADIUS.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  urgencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  urgencyText: {
    fontSize: 16,
    fontWeight: '700',
  },
  mainCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    lineHeight: 32,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  descriptionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  descriptionText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  actionCard: {
    backgroundColor: COLORS.warning + '10',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionContent: {
    gap: SPACING.sm,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  helpCard: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  helpText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  helpButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Modal / Action Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: SPACING.md,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  actionSheetSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionSheetIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  actionSheetOptionInfo: {
    flex: 1,
  },
  actionSheetOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  actionSheetOptionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  actionSheetCancel: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
