/**
 * PaymentsListScreen - Lista completa dei pagamenti da effettuare
 * Con storico pagamenti scaduti
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Euro,
  Clock,
  ChevronRight,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Archive,
  ArrowLeft,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';

interface Payment {
  id: string;
  tax_model_name: string;
  amount_due: number;
  due_date: string;
  period: string;
  days_left: number;
  urgency: 'expired' | 'urgent' | 'warning' | 'normal';
  is_expired: boolean;
  notification_status: string;
}

export const PaymentsListScreen: React.FC = () => {
  const { token } = useAuth();
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useState<'upcoming' | 'expired'>('upcoming');
  const [upcomingPayments, setUpcomingPayments] = useState<Payment[]>([]);
  const [expiredPayments, setExpiredPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState({ upcoming_count: 0, expired_count: 0, total_upcoming_amount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadPayments();
    }
  }, [token]);

  const loadPayments = async () => {
    try {
      const [upcomingData, expiredData] = await Promise.all([
        apiService.getClientPayments('upcoming'),
        apiService.getClientPayments('expired'),
      ]);
      
      setUpcomingPayments(upcomingData.payments || []);
      setExpiredPayments(expiredData.payments || []);
      setStats({
        ...upcomingData.stats,
        expired_count: expiredData.stats?.expired_count || expiredData.payments?.length || 0,
      });
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  }, []);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'expired': return colors.textLight;
      case 'urgent': return colors.error;
      case 'warning': return colors.warning;
      default: return colors.primary;
    }
  };

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return date;
    }
  };

  const renderPaymentCard = (payment: Payment) => {
    const urgencyColor = getUrgencyColor(payment.urgency);
    
    return (
      <TouchableOpacity
        key={payment.id}
        style={[styles.paymentCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate('PaymentDetail', { paymentId: payment.id })}
        activeOpacity={0.7}
      >
        <View style={[styles.paymentIcon, { backgroundColor: urgencyColor + '15' }]}>
          <CreditCard size={22} color={urgencyColor} />
        </View>
        
        <View style={styles.paymentContent}>
          <Text style={[styles.paymentModel, { color: colors.text }]} numberOfLines={1}>
            {payment.tax_model_name}
          </Text>
          <Text style={[styles.paymentPeriod, { color: colors.textSecondary }]}>
            {payment.period}
          </Text>
          <View style={styles.paymentDateRow}>
            <Calendar size={12} color={colors.textSecondary} />
            <Text style={[styles.paymentDateText, { color: colors.textSecondary }]}>
              {formatDate(payment.due_date)}
            </Text>
          </View>
        </View>
        
        <View style={styles.paymentRight}>
          <Text style={[styles.paymentAmount, { color: urgencyColor }]}>
            €{payment.amount_due.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </Text>
          
          {!payment.is_expired && (
            <View style={[styles.daysLeftBadge, { backgroundColor: urgencyColor + '15' }]}>
              {payment.urgency === 'urgent' && <AlertTriangle size={10} color={urgencyColor} />}
              <Text style={[styles.daysLeftText, { color: urgencyColor }]}>
                {payment.days_left <= 0 ? 'Oggi' : payment.days_left === 1 ? 'Domani' : `${payment.days_left} gg`}
              </Text>
            </View>
          )}
          
          {payment.is_expired && (
            <View style={[styles.expiredBadge, { backgroundColor: colors.textLight + '20' }]}>
              <Text style={[styles.expiredText, { color: colors.textLight }]}>Scaduto</Text>
            </View>
          )}
        </View>
        
        <ChevronRight size={18} color={colors.textLight} />
      </TouchableOpacity>
    );
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

  const currentPayments = activeTab === 'upcoming' ? upcomingPayments : expiredPayments;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {language === 'en' ? 'Payments' : language === 'es' ? 'Pagos' : 'Importi da Pagare'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
        <View style={styles.summaryIcon}>
          <Euro size={28} color="#fff" />
        </View>
        <View style={styles.summaryContent}>
          <Text style={styles.summaryLabel}>Totale da pagare</Text>
          <Text style={styles.summaryAmount}>
            €{stats.total_upcoming_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.upcoming_count}</Text>
            <Text style={styles.statLabel}>Attivi</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.expired_count}</Text>
            <Text style={styles.statLabel}>Scaduti</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && [styles.tabActive, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Clock size={16} color={activeTab === 'upcoming' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            Prossimi ({stats.upcoming_count})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expired' && [styles.tabActive, { backgroundColor: colors.textLight }]]}
          onPress={() => setActiveTab('expired')}
        >
          <Archive size={16} color={activeTab === 'expired' ? '#fff' : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'expired' && styles.tabTextActive]}>
            Storico ({stats.expired_count})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payments List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {currentPayments.length > 0 ? (
          currentPayments.map(renderPaymentCard)
        ) : (
          <View style={styles.emptyState}>
            {activeTab === 'upcoming' ? (
              <CheckCircle size={48} color={colors.primary} />
            ) : (
              <Archive size={48} color={colors.textLight} />
            )}
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeTab === 'upcoming' ? 'Nessun pagamento in scadenza' : 'Nessun pagamento nello storico'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {activeTab === 'upcoming' 
                ? 'Non hai importi da pagare al momento'
                : 'I pagamenti scaduti appariranno qui'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  summaryCard: {
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContent: { flex: 1, marginLeft: SPACING.md },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  summaryAmount: { fontSize: 26, fontWeight: '700', color: '#fff', marginTop: 4 },
  summaryStats: { flexDirection: 'row', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 12 },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    padding: 4,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  tabActive: {},
  tabText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingTop: 0, gap: 10 },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 12,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentContent: { flex: 1 },
  paymentModel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  paymentPeriod: { fontSize: 13, marginBottom: 4 },
  paymentDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paymentDateText: { fontSize: 12 },
  paymentRight: { alignItems: 'flex-end', marginRight: 4 },
  paymentAmount: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  daysLeftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  daysLeftText: { fontSize: 11, fontWeight: '600' },
  expiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  expiredText: { fontSize: 11, fontWeight: '500' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginTop: SPACING.md },
  emptySubtitle: { fontSize: 14, marginTop: 6, textAlign: 'center' },
});

export default PaymentsListScreen;
