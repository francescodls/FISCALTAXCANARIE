/**
 * PaymentDetailScreen - Dettaglio singolo pagamento
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Euro,
  Calendar,
  Clock,
  FileText,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Bell,
  Info,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS } from '../config/constants';

export const PaymentDetailScreen: React.FC = () => {
  const { token } = useAuth();
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const paymentId = route.params?.paymentId;

  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token && paymentId) {
      apiService.setToken(token);
      loadPayment();
    }
  }, [token, paymentId]);

  const loadPayment = async () => {
    try {
      const data = await apiService.getClientPaymentDetail(paymentId);
      setPayment(data);
    } catch (error) {
      console.error('Error loading payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('it-IT', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return date;
    }
  };

  const getUrgencyConfig = () => {
    if (!payment) return { color: colors.primary, label: 'In scadenza', icon: Clock };
    
    if (payment.is_expired) {
      return { color: colors.textLight, label: 'Scaduto', icon: AlertTriangle };
    }
    if (payment.days_left <= 3) {
      return { color: colors.error, label: 'Urgente', icon: AlertTriangle };
    }
    if (payment.days_left <= 7) {
      return { color: colors.warning, label: 'In scadenza', icon: Clock };
    }
    return { color: colors.primary, label: 'Da pagare', icon: Clock };
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!payment) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Dettaglio Pagamento</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <AlertTriangle size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>Pagamento non trovato</Text>
        </View>
      </SafeAreaView>
    );
  }

  const urgencyConfig = getUrgencyConfig();
  const UrgencyIcon = urgencyConfig.icon;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Dettaglio Pagamento</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Amount Card */}
        <View style={[styles.amountCard, { backgroundColor: urgencyConfig.color }]}>
          <View style={styles.amountHeader}>
            <View style={styles.amountIconContainer}>
              <Euro size={32} color="#fff" />
            </View>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <UrgencyIcon size={14} color="#fff" />
              <Text style={styles.statusText}>{urgencyConfig.label}</Text>
            </View>
          </View>
          
          <Text style={styles.amountLabel}>Importo da pagare</Text>
          <Text style={styles.amountValue}>
            €{payment.amount_due.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </Text>
          
          {!payment.is_expired && (
            <View style={styles.daysLeftContainer}>
              <Clock size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.daysLeftText}>
                {payment.days_left === 0 
                  ? 'Scade oggi'
                  : payment.days_left === 1 
                    ? 'Scade domani'
                    : `Mancano ${payment.days_left} giorni`}
              </Text>
            </View>
          )}
        </View>

        {/* Details Card */}
        <View style={[styles.detailsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Dettagli</Text>
          
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.primary + '15' }]}>
              <FileText size={18} color={colors.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Modello/Dichiarazione
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {payment.tax_model_name}
              </Text>
            </View>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.warning + '15' }]}>
              <Calendar size={18} color={colors.warning} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Periodo di riferimento
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {payment.period}
              </Text>
            </View>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: colors.error + '15' }]}>
              <Clock size={18} color={colors.error} />
            </View>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Data scadenza
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatDate(payment.due_date)}
              </Text>
            </View>
          </View>
          
          {payment.notification_status && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: '#10b981' + '15' }]}>
                  <Bell size={18} color="#10b981" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Stato notifica
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {payment.notification_status === 'inviata' ? 'Comunicazione ricevuta' :
                     payment.notification_status === 'pagata' ? 'Pagato' : 'In attesa'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Info Card */}
        {payment.internal_notes && (
          <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <Info size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {payment.internal_notes}
            </Text>
          </View>
        )}

        {/* Contact Card */}
        <View style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.contactTitle, { color: colors.text }]}>
            Hai domande su questo pagamento?
          </Text>
          <Text style={[styles.contactText, { color: colors.textSecondary }]}>
            Contatta il tuo consulente per qualsiasi chiarimento
          </Text>
          <TouchableOpacity 
            style={[styles.contactButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Tickets')}
          >
            <Text style={styles.contactButtonText}>Apri un ticket</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { fontSize: 16, fontWeight: '500' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.md, gap: SPACING.md },
  amountCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
  },
  amountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  amountIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  amountLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  amountValue: { fontSize: 36, fontWeight: '700', color: '#fff' },
  daysLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  daysLeftText: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  detailsCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: SPACING.md },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, marginBottom: 2 },
  detailValue: { fontSize: 15, fontWeight: '500' },
  divider: { height: 1, marginVertical: SPACING.md },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 10,
  },
  infoText: { flex: 1, fontSize: 14, lineHeight: 20 },
  contactCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  contactTitle: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  contactText: { fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: SPACING.md },
  contactButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
  },
  contactButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});

export default PaymentDetailScreen;
