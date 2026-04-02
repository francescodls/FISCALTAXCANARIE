import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  FileText,
  Bell,
  MessageSquare,
  Calendar,
  Euro,
  ChevronRight,
  User,
  Shield,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';

interface DashboardStats {
  documentsCount: number;
  declarationsCount: number;
  ticketsCount: number;
  notificationsCount: number;
  deadlinesCount: number;
  pendingFees: number;
}

export const HomeScreen: React.FC = () => {
  const { user, token } = useAuth();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    documentsCount: 0,
    declarationsCount: 0,
    ticketsCount: 0,
    notificationsCount: 0,
    deadlinesCount: 0,
    pendingFees: 0,
  });
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      // Carica notifiche
      const notifications = await apiService.getNotifications();
      const unread = notifications.filter((n: any) => !n.read);
      setRecentNotifications(unread.slice(0, 3));
      
      // Carica statistiche
      const [documents, declarations, tickets, deadlines, fees] = await Promise.all([
        apiService.getDocuments().catch(() => []),
        apiService.getDeclarations().catch(() => []),
        apiService.getTickets().catch(() => []),
        apiService.getDeadlines().catch(() => []),
        apiService.getFees().catch(() => []),
      ]);

      setStats({
        documentsCount: documents.length,
        declarationsCount: declarations.length,
        ticketsCount: tickets.filter((t: any) => t.status !== 'closed').length,
        notificationsCount: unread.length,
        deadlinesCount: deadlines.filter((d: any) => d.status !== 'completed').length,
        pendingFees: fees.filter((f: any) => f.status !== 'paid').length,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const QuickAction = ({
    icon: Icon,
    title,
    count,
    color,
    onPress,
  }: {
    icon: any;
    title: string;
    count: number;
    color: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
      {count > 0 && (
        <View style={[styles.quickActionBadge, { backgroundColor: color }]}>
          <Text style={styles.quickActionBadgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Ciao,</Text>
            <Text style={styles.userName}>{user?.full_name || 'Cliente'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <User size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsGrid}>
          <QuickAction
            icon={FileText}
            title="Documenti"
            count={stats.documentsCount}
            color={COLORS.primary}
            onPress={() => navigation.navigate('Documenti')}
          />
          <QuickAction
            icon={Calendar}
            title="Dichiarazioni"
            count={stats.declarationsCount}
            color="#8b5cf6"
            onPress={() => navigation.navigate('Dichiarazioni')}
          />
          <QuickAction
            icon={Bell}
            title="Notifiche"
            count={stats.notificationsCount}
            color={COLORS.warning}
            onPress={() => navigation.navigate('Notifiche')}
          />
          <QuickAction
            icon={MessageSquare}
            title="Ticket"
            count={stats.ticketsCount}
            color={COLORS.info}
            onPress={() => navigation.navigate('Ticket')}
          />
        </View>

        {/* Notifiche Recenti */}
        {recentNotifications.length > 0 && (
          <Card
            title="Notifiche recenti"
            headerRight={
              <TouchableOpacity onPress={() => navigation.navigate('Notifiche')}>
                <Text style={styles.seeAll}>Vedi tutte</Text>
              </TouchableOpacity>
            }
            style={styles.card}
          >
            {recentNotifications.map((notification, index) => (
              <TouchableOpacity
                key={notification.id || index}
                style={[
                  styles.notificationItem,
                  index < recentNotifications.length - 1 && styles.notificationBorder,
                ]}
                onPress={() => navigation.navigate('Notifiche')}
              >
                <View style={styles.notificationDot} />
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle} numberOfLines={1}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationMessage} numberOfLines={2}>
                    {notification.message}
                  </Text>
                </View>
                <ChevronRight size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Info Cards */}
        <View style={styles.infoCardsRow}>
          <TouchableOpacity
            style={[styles.infoCard, { backgroundColor: COLORS.primary + '10' }]}
            onPress={() => navigation.navigate('Scadenze')}
          >
            <Calendar size={28} color={COLORS.primary} />
            <Text style={styles.infoCardNumber}>{stats.deadlinesCount}</Text>
            <Text style={styles.infoCardLabel}>Scadenze</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.infoCard, { backgroundColor: '#f59e0b10' }]}
            onPress={() => navigation.navigate('Onorari')}
          >
            <Euro size={28} color={COLORS.warning} />
            <Text style={styles.infoCardNumber}>{stats.pendingFees}</Text>
            <Text style={styles.infoCardLabel}>Da pagare</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Banner */}
        <TouchableOpacity
          style={styles.privacyBanner}
          onPress={() => navigation.navigate('Privacy')}
        >
          <View style={styles.privacyBannerIcon}>
            <Shield size={20} color={COLORS.primary} />
          </View>
          <View style={styles.privacyBannerContent}>
            <Text style={styles.privacyBannerTitle}>I tuoi dati sono protetti</Text>
            <Text style={styles.privacyBannerText}>
              Gestisci privacy e consensi
            </Text>
          </View>
          <ChevronRight size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  quickAction: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  quickActionBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  quickActionBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    marginBottom: SPACING.md,
  },
  seeAll: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  notificationBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm,
  },
  notificationContent: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  infoCardsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  infoCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  infoCardNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  infoCardLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    ...SHADOWS.sm,
  },
  privacyBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  privacyBannerContent: {
    flex: 1,
  },
  privacyBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  privacyBannerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
