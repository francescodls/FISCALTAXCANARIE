import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FileText,
  Bell,
  MessageSquare,
  Calendar,
  Euro,
  ChevronRight,
  User,
  Shield,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Folder,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { Card } from '../components/Card';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DashboardStats {
  documentsCount: number;
  declarationsCount: number;
  declarationsInProgress: number;
  declarationsCompleted: number;
  ticketsCount: number;
  notificationsCount: number;
  deadlinesCount: number;
  pendingFees: number;
}

interface RecentActivity {
  id: string;
  type: 'declaration' | 'document' | 'notification' | 'message';
  title: string;
  description: string;
  date: string;
  status?: string;
}

export const HomeScreen: React.FC = () => {
  const { user, token } = useAuth();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    documentsCount: 0,
    declarationsCount: 0,
    declarationsInProgress: 0,
    declarationsCompleted: 0,
    ticketsCount: 0,
    notificationsCount: 0,
    deadlinesCount: 0,
    pendingFees: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      const notifications = await apiService.getNotifications();
      const unread = notifications.filter((n: any) => !n.read);
      setRecentNotifications(unread.slice(0, 3));

      const [documents, declarations, tickets, deadlines, fees] = await Promise.all([
        apiService.getDocuments().catch(() => []),
        apiService.getDeclarations().catch(() => []),
        apiService.getTickets().catch(() => []),
        apiService.getDeadlines().catch(() => []),
        apiService.getFees().catch(() => []),
      ]);

      const inProgress = declarations.filter((d: any) => 
        d.stato === 'in_lavorazione' || d.stato === 'in_attesa'
      ).length;
      const completed = declarations.filter((d: any) => 
        d.stato === 'completata' || d.stato === 'inviata'
      ).length;

      setStats({
        documentsCount: documents.length,
        declarationsCount: declarations.length,
        declarationsInProgress: inProgress,
        declarationsCompleted: completed,
        ticketsCount: tickets.filter((t: any) => t.status !== 'closed').length,
        notificationsCount: unread.length,
        deadlinesCount: deadlines.filter((d: any) => d.status !== 'completed').length,
        pendingFees: fees.filter((f: any) => f.status !== 'paid').length,
      });

      // Crea attività recenti
      const activities: RecentActivity[] = [];
      declarations.slice(0, 2).forEach((d: any) => {
        activities.push({
          id: d._id || d.id,
          type: 'declaration',
          title: `Dichiarazione ${d.tipo || 'IRPF'} ${d.anno || '2025'}`,
          description: getStatusText(d.stato),
          date: d.updated_at || d.created_at || new Date().toISOString(),
          status: d.stato,
        });
      });
      setRecentActivities(activities);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'bozza': 'In bozza',
      'in_attesa': 'In attesa di documenti',
      'in_lavorazione': 'In lavorazione',
      'completata': 'Completata',
      'inviata': 'Inviata',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'bozza': COLORS.textLight,
      'in_attesa': COLORS.warning,
      'in_lavorazione': COLORS.info,
      'completata': COLORS.success,
      'inviata': COLORS.success,
    };
    return colorMap[status] || COLORS.textLight;
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const QuickActionCard = ({
    icon: Icon,
    title,
    subtitle,
    count,
    color,
    onPress,
    gradient,
  }: {
    icon: any;
    title: string;
    subtitle?: string;
    count?: number;
    color: string;
    onPress: () => void;
    gradient?: string[];
  }) => (
    <TouchableOpacity
      style={styles.quickActionCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {gradient ? (
        <LinearGradient
          colors={gradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quickActionGradient}
        >
          <View style={styles.quickActionIconWhite}>
            <Icon size={24} color="#ffffff" />
          </View>
          <Text style={styles.quickActionTitleWhite}>{title}</Text>
          {subtitle && <Text style={styles.quickActionSubtitleWhite}>{subtitle}</Text>}
          {count !== undefined && count > 0 && (
            <View style={styles.quickActionCountBadge}>
              <Text style={styles.quickActionCountText}>{count}</Text>
            </View>
          )}
        </LinearGradient>
      ) : (
        <View style={styles.quickActionContent}>
          <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
            <Icon size={22} color={color} />
          </View>
          <Text style={styles.quickActionTitle}>{title}</Text>
          {subtitle && <Text style={styles.quickActionSubtitle}>{subtitle}</Text>}
          {count !== undefined && count > 0 && (
            <View style={[styles.quickActionBadge, { backgroundColor: color }]}>
              <Text style={styles.quickActionBadgeText}>{count}</Text>
            </View>
          )}
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
        {/* Header con Logo */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profilo')}
          >
            <User size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Welcome Card */}
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeCard}
        >
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeGreeting}>Benvenuto,</Text>
            <Text style={styles.welcomeName}>{user?.full_name || 'Cliente'}</Text>
            <Text style={styles.welcomeSubtitle}>
              Gestisci le tue pratiche fiscali in modo semplice
            </Text>
          </View>
          <View style={styles.welcomeStats}>
            <View style={styles.welcomeStat}>
              <Text style={styles.welcomeStatNumber}>{stats.declarationsInProgress}</Text>
              <Text style={styles.welcomeStatLabel}>In corso</Text>
            </View>
            <View style={styles.welcomeStatDivider} />
            <View style={styles.welcomeStat}>
              <Text style={styles.welcomeStatNumber}>{stats.declarationsCompleted}</Text>
              <Text style={styles.welcomeStatLabel}>Completate</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Accesso rapido</Text>
        <View style={styles.quickActionsGrid}>
          <QuickActionCard
            icon={FileText}
            title="Documenti"
            subtitle={`${stats.documentsCount} file`}
            color={COLORS.primary}
            onPress={() => navigation.navigate('Documenti')}
          />
          <QuickActionCard
            icon={Calendar}
            title="Dichiarazioni"
            subtitle={`${stats.declarationsCount} totali`}
            color={COLORS.accent}
            onPress={() => navigation.navigate('Dichiarazioni')}
          />
          <QuickActionCard
            icon={Bell}
            title="Notifiche"
            count={stats.notificationsCount}
            color={COLORS.warning}
            onPress={() => navigation.navigate('Notifiche')}
          />
          <QuickActionCard
            icon={MessageSquare}
            title="Messaggi"
            count={stats.ticketsCount}
            color={COLORS.info}
            onPress={() => navigation.navigate('Chat')}
          />
        </View>

        {/* Stato Pratiche */}
        <Text style={styles.sectionTitle}>Stato pratiche</Text>
        <View style={styles.statusCardsRow}>
          <TouchableOpacity
            style={styles.statusCard}
            onPress={() => navigation.navigate('Scadenze')}
          >
            <LinearGradient
              colors={['#3caca4', '#2d9a93']}
              style={styles.statusCardGradient}
            >
              <Clock size={24} color="#ffffff" />
              <Text style={styles.statusCardNumber}>{stats.deadlinesCount}</Text>
              <Text style={styles.statusCardLabel}>Scadenze</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statusCard}
            onPress={() => navigation.navigate('Onorari')}
          >
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              style={styles.statusCardGradient}
            >
              <Euro size={24} color="#ffffff" />
              <Text style={styles.statusCardNumber}>{stats.pendingFees}</Text>
              <Text style={styles.statusCardLabel}>Da pagare</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Attività Recenti */}
        {recentActivities.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Attività recenti</Text>
            <Card style={styles.activityCard}>
              {recentActivities.map((activity, index) => (
                <TouchableOpacity
                  key={activity.id}
                  style={[
                    styles.activityItem,
                    index < recentActivities.length - 1 && styles.activityBorder,
                  ]}
                  onPress={() => navigation.navigate('Dichiarazioni')}
                >
                  <View style={[styles.activityIcon, { backgroundColor: getStatusColor(activity.status || '') + '20' }]}>
                    {activity.status === 'completata' || activity.status === 'inviata' ? (
                      <CheckCircle size={20} color={COLORS.success} />
                    ) : activity.status === 'in_lavorazione' ? (
                      <TrendingUp size={20} color={COLORS.info} />
                    ) : (
                      <AlertCircle size={20} color={COLORS.warning} />
                    )}
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={[styles.activityStatus, { color: getStatusColor(activity.status || '') }]}>
                      {activity.description}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              ))}
            </Card>
          </>
        )}

        {/* Guida ai Modelli */}
        <Text style={styles.sectionTitle}>Risorse utili</Text>
        <TouchableOpacity
          style={styles.guideCard}
          onPress={() => navigation.navigate('GuidaModelli')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.guideGradient}
          >
            <View style={styles.guideIconContainer}>
              <BookOpen size={28} color={COLORS.primary} />
            </View>
            <View style={styles.guideContent}>
              <Text style={styles.guideTitle}>Guida ai Modelli Fiscali</Text>
              <Text style={styles.guideSubtitle}>
                Scopri IRPF, IVA, Modello 720 e altro
              </Text>
            </View>
            <ChevronRight size={24} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Privacy Banner */}
        <TouchableOpacity
          style={styles.privacyBanner}
          onPress={() => navigation.navigate('Privacy')}
        >
          <View style={styles.privacyIcon}>
            <Shield size={20} color={COLORS.primary} />
          </View>
          <View style={styles.privacyContent}>
            <Text style={styles.privacyTitle}>I tuoi dati sono protetti</Text>
            <Text style={styles.privacyText}>Gestisci privacy e consensi</Text>
          </View>
          <ChevronRight size={20} color={COLORS.textLight} />
        </TouchableOpacity>

        {/* Bottom Spacing */}
        <View style={{ height: 20 }} />
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 50,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  welcomeCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.lg,
  },
  welcomeContent: {
    marginBottom: SPACING.md,
  },
  welcomeGreeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  welcomeName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  welcomeStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  welcomeStat: {
    flex: 1,
    alignItems: 'center',
  },
  welcomeStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: SPACING.md,
  },
  welcomeStatNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  welcomeStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  quickActionCard: {
    width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.sm) / 2,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  quickActionContent: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  quickActionGradient: {
    padding: SPACING.md,
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  quickActionIconWhite: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  quickActionTitleWhite: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quickActionSubtitleWhite: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  quickActionBadge: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  quickActionBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  quickActionCountBadge: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  quickActionCountText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  statusCardsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statusCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  statusCardGradient: {
    padding: SPACING.md,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  statusCardNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: SPACING.xs,
  },
  statusCardLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  activityCard: {
    marginBottom: SPACING.md,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  activityBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  activityStatus: {
    fontSize: 13,
    marginTop: 2,
  },
  guideCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  guideGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  guideIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(60,172,164,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  guideContent: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  guideSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
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
  privacyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  privacyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
