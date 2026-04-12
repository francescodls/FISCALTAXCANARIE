import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FileText,
  Bell,
  MessageSquare,
  Calendar,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Search,
  Folder,
  X,
  Trash2,
  Eye,
  Sparkles,
  Bot,
  ArrowRight,
  BookOpen,
  Play,
  ExternalLink,
} from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS } from '../config/constants';
import { LanguageSelector } from '../components/LanguageSelector';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DashboardStats {
  practicesInProgress: number;
  practicesCompleted: number;
  ticketsOpen: number;
  unreadNotifications: number;
  upcomingDeadlines: number;
  newDocuments: number;
}

interface ActionItem {
  id: string;
  type: 'ticket' | 'message' | 'document';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  route: string;
  routeParams?: Record<string, any>;
}

interface Deadline {
  id: string;
  title: string;
  description: string;
  date: string;
  due_date: string;
  category: string;
  daysLeft: number;
  status: 'urgent' | 'warning' | 'normal';
  originalStatus: string;
  priority: string;
}

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  timestamp: string;
  isNew?: boolean;
}

interface ActivityState {
  dismissed: string[];
  viewed: string[];
}

interface TaxModel {
  id: string;
  codice: string;
  nome: string;
  descrizione: string;
  a_cosa_serve?: string;
  chi_deve_presentarlo?: string;
  periodicita?: string;
  scadenza_tipica?: string;
  documenti_necessari?: string[];
  note_operative?: string;
  video_youtube?: string;
  video_thumbnail?: string;
  link_approfondimento?: string;
}

// Generate storage key per user
const getStorageKey = (userId?: string) => `activity_state_${userId || 'anonymous'}`;

export const HomeScreen: React.FC = () => {
  const { user, token } = useAuth();
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    practicesInProgress: 0,
    practicesCompleted: 0,
    ticketsOpen: 0,
    unreadNotifications: 0,
    upcomingDeadlines: 0,
    newDocuments: 0,
  });
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [taxModels, setTaxModels] = useState<TaxModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<TaxModel | null>(null);
  
  // Use refs to always have current values in callbacks
  const dismissedRef = useRef<Set<string>>(new Set());
  const viewedRef = useRef<Set<string>>(new Set());
  const [, forceUpdate] = useState(0);
  
  const storageKey = getStorageKey(user?.id || user?.email);

  // Load activity state from storage
  const loadActivityState = useCallback(async (): Promise<ActivityState> => {
    try {
      const stored = await SecureStore.getItemAsync(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          dismissed: parsed.dismissed || [],
          viewed: parsed.viewed || [],
        };
      }
    } catch (error) {
      console.error('Error loading activity state:', error);
    }
    return { dismissed: [], viewed: [] };
  }, [storageKey]);

  // Save activity state to storage
  const saveActivityState = useCallback(async (dismissed: string[], viewed: string[]) => {
    try {
      await SecureStore.setItemAsync(
        storageKey,
        JSON.stringify({ dismissed, viewed })
      );
    } catch (error) {
      console.error('Error saving activity state:', error);
    }
  }, [storageKey]);

  // Initialize on mount and user change
  useEffect(() => {
    const init = async () => {
      const state = await loadActivityState();
      dismissedRef.current = new Set(state.dismissed);
      viewedRef.current = new Set(state.viewed);
      forceUpdate(n => n + 1);
    };
    init();
  }, [storageKey, loadActivityState]);

  // Dismiss activity (hide with X)
  const dismissActivity = useCallback(async (activityId: string) => {
    // Update ref immediately
    dismissedRef.current.add(activityId);
    
    // Update UI
    setRecentActivity(prev => prev.filter(a => a.id !== activityId));
    
    // Persist to storage
    await saveActivityState(
      Array.from(dismissedRef.current),
      Array.from(viewedRef.current)
    );
  }, [saveActivityState]);

  // Mark single activity as viewed
  const markAsViewed = useCallback(async (activityId: string) => {
    // Update ref immediately
    viewedRef.current.add(activityId);
    
    // Update UI - change isNew to false
    setRecentActivity(prev => 
      prev.map(a => a.id === activityId ? { ...a, isNew: false } : a)
    );
    
    // Persist to storage
    await saveActivityState(
      Array.from(dismissedRef.current),
      Array.from(viewedRef.current)
    );
  }, [saveActivityState]);

  // Mark all visible as viewed
  const markAllAsViewed = useCallback(async () => {
    // Get all current activity IDs
    const allIds = recentActivity.map(a => a.id);
    
    // Update ref
    allIds.forEach(id => viewedRef.current.add(id));
    
    // Update UI
    setRecentActivity(prev => prev.map(a => ({ ...a, isNew: false })));
    
    // Persist to storage
    await saveActivityState(
      Array.from(dismissedRef.current),
      Array.from(viewedRef.current)
    );
  }, [recentActivity, saveActivityState]);

  // Clear all viewed activities (hide them all)
  const clearAllViewed = useCallback(() => {
    Alert.alert(
      t.home.clearActivityTitle,
      t.home.clearActivityMessage,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.home.clear,
          style: 'destructive',
          onPress: async () => {
            // Get IDs of viewed activities
            const viewedActivityIds = recentActivity
              .filter(a => viewedRef.current.has(a.id))
              .map(a => a.id);
            
            // Add to dismissed
            viewedActivityIds.forEach(id => dismissedRef.current.add(id));
            
            // Update UI
            setRecentActivity(prev => 
              prev.filter(a => !viewedRef.current.has(a.id))
            );
            
            // Persist to storage
            await saveActivityState(
              Array.from(dismissedRef.current),
              Array.from(viewedRef.current)
            );
          },
        },
      ]
    );
  }, [recentActivity, t, saveActivityState]);

  const getClientName = (): string => {
    if (user?.full_name && user.full_name.trim()) {
      return user.full_name;
    }
    if (user?.email) {
      const emailName = user.email.split('@')[0];
      const cleanName = emailName.replace(/[._]/g, ' ');
      return cleanName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return t.profile.title;
  };

  // Load data using current refs for dismissed/viewed state
  const loadData = useCallback(async () => {
    try {
      setError(null);
      
      // First ensure we have latest state from storage
      const state = await loadActivityState();
      dismissedRef.current = new Set(state.dismissed);
      viewedRef.current = new Set(state.viewed);
      
      const [notifications, documents, declarations, tickets, deadlinesData, modelsData] = await Promise.all([
        apiService.getNotifications().catch(() => []),
        apiService.getDocuments().catch(() => []),
        apiService.getDeclarations().catch(() => []),
        apiService.getTickets().catch(() => []),
        apiService.getDeadlines().catch(() => []),
        apiService.getTaxModels().catch(() => []),
      ]);
      
      // Set tax models
      setTaxModels(modelsData || []);

      const unread = notifications.filter((n: any) => !n.read);
      const openTickets = tickets.filter((t: any) => t.status !== 'closed');
      const inProgress = declarations.filter((d: any) => 
        d.stato === 'in_lavorazione' || d.stato === 'in_attesa'
      ).length;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureDeadlines = deadlinesData.filter((d: any) => {
        const deadlineDate = new Date(d.date || d.due_date);
        deadlineDate.setHours(0, 0, 0, 0);
        return deadlineDate >= today;
      });

      setStats({
        practicesInProgress: inProgress,
        practicesCompleted: declarations.filter((d: any) => 
          d.stato === 'completata' || d.stato === 'inviata'
        ).length,
        ticketsOpen: openTickets.length,
        unreadNotifications: unread.length,
        upcomingDeadlines: futureDeadlines.length,
        newDocuments: documents.filter((d: any) => {
          const created = new Date(d.created_at);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return created > weekAgo;
        }).length,
      });

      // Action items
      const actions: ActionItem[] = [];

      if (openTickets.length > 0) {
        actions.push({
          id: 'ticket-1',
          type: 'ticket',
          title: t.home.openTickets.replace('{count}', openTickets.length.toString()),
          description: t.home.checkTickets,
          priority: 'medium',
          action: t.home.manage,
          route: 'Comunicazioni',
        });
      }

      if (unread.length > 0) {
        actions.push({
          id: 'notification-1',
          type: 'message',
          title: t.home.unreadNotifications.replace('{count}', unread.length.toString()),
          description: t.home.newUpdates,
          priority: 'medium',
          action: t.home.read,
          route: 'Notifiche',
        });
      }

      setActionItems(actions.slice(0, 3));

      const processedDeadlines: Deadline[] = futureDeadlines.slice(0, 4).map((d: any, index: number) => {
        const deadlineDate = new Date(d.date || d.due_date);
        const diffTime = deadlineDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const status: 'urgent' | 'warning' | 'normal' = daysLeft <= 3 ? 'urgent' : daysLeft <= 7 ? 'warning' : 'normal';
        
        return {
          id: d.id || d._id || `deadline-${index}`,
          title: d.title || d.name || t.deadlines.title,
          description: d.description || '',
          date: deadlineDate.toLocaleDateString(language === 'en' ? 'en-GB' : language === 'es' ? 'es-ES' : 'it-IT', { day: '2-digit', month: 'short' }),
          due_date: d.due_date || d.date,
          category: d.category || 'fiscale',
          daysLeft,
          status,
          originalStatus: d.status || 'da_fare',
          priority: d.priority || 'normale',
        };
      });
      setDeadlines(processedDeadlines);

      // Build activity list - use refs for current dismissed/viewed state
      const currentDismissed = dismissedRef.current;
      const currentViewed = viewedRef.current;
      
      const activity: ActivityItem[] = [];
      
      // Add declarations activities
      declarations.slice(0, 3).forEach((d: any) => {
        // Use stable ID based on _id, not random
        const actId = d._id || d.id || `decl-${d.tipo}-${d.anno}`;
        
        // Skip if dismissed
        if (currentDismissed.has(actId)) {
          return;
        }
        
        activity.push({
          id: actId,
          type: 'declaration',
          title: t.home.practiceUpdated.replace('{type}', d.tipo?.toUpperCase() || 'IRPF'),
          timestamp: d.updated_at || d.created_at,
          isNew: !currentViewed.has(actId),
        });
      });
      
      // Add document activities
      documents.slice(0, 3).forEach((d: any) => {
        // Use stable ID based on _id, not random
        const actId = d._id || d.id || `doc-${d.file_name}`;
        
        // Skip if dismissed
        if (currentDismissed.has(actId)) {
          return;
        }
        
        activity.push({
          id: actId,
          type: 'document',
          title: t.home.newDocument.replace('{name}', d.file_name || t.documents.title),
          timestamp: d.created_at,
          isNew: !currentViewed.has(actId),
        });
      });
      
      // Sort by timestamp and take top 5
      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activity.slice(0, 5));

    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [t, language, loadActivityState]);

  // Initial load when token is available
  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }
  }, [token, loadData]);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (token) {
        loadData();
      }
    }, [token, loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `${diffMins} ${t.common.minutesAgo}`;
      if (diffHours < 24) return `${diffHours} ${t.common.hoursAgo}`;
      if (diffDays === 1) return t.common.yesterday;
      return `${diffDays} ${t.common.daysAgo}`;
    } catch {
      return '';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'ticket': return MessageSquare;
      case 'message': return Bell;
      case 'document': return FileText;
      default: return AlertCircle;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return COLORS.error;
      case 'medium': return COLORS.warning;
      default: return COLORS.info;
    }
  };

  const getDeadlineColor = (status: string) => {
    switch (status) {
      case 'urgent': return COLORS.error;
      case 'warning': return COLORS.warning;
      default: return COLORS.primary;
    }
  };

  const getDeadlineDaysText = (daysLeft: number) => {
    if (daysLeft === 0) return t.common.today + '!';
    if (daysLeft === 1) return t.common.tomorrow;
    return t.home.inDays.replace('{days}', daysLeft.toString());
  };

  // Check if there are any new activities
  const hasNewActivities = recentActivity.some(a => a.isNew);
  // Check if there are any viewed activities
  const hasViewedActivities = recentActivity.some(a => viewedRef.current.has(a.id));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Language Selector */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.brandName, { color: colors.text }]}>{t.home.brandName}</Text>
          </View>
          <View style={styles.headerRight}>
            <LanguageSelector />
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('Ricerca')}
            >
              <Search size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>{t.home.welcome}</Text>
          <Text style={[styles.userName, { color: colors.text }]}>{getClientName()}</Text>
        </View>

        {/* AI Assistant Card */}
        <TouchableOpacity 
          style={styles.aiCard}
          onPress={() => navigation.navigate('Ricerca')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#0d9488', '#0f766e', '#115e59']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiCardGradient}
          >
            <View style={styles.aiCardContent}>
              <View style={styles.aiIconContainer}>
                <Bot size={28} color="#ffffff" />
                <View style={styles.aiSparkle}>
                  <Sparkles size={14} color="#fcd34d" />
                </View>
              </View>
              <View style={styles.aiTextContainer}>
                <Text style={styles.aiTitle}>{t.ai.title}</Text>
                <Text style={styles.aiSubtitle}>{t.ai.subtitle}</Text>
              </View>
              <View style={styles.aiArrow}>
                <ArrowRight size={20} color="rgba(255,255,255,0.8)" />
              </View>
            </View>
            <View style={styles.aiHints}>
              <View style={styles.aiHint}><Text style={styles.aiHintText}>IGIC</Text></View>
              <View style={styles.aiHint}><Text style={styles.aiHintText}>IRPF</Text></View>
              <View style={styles.aiHint}><Text style={styles.aiHintText}>720</Text></View>
              <View style={styles.aiHint}><Text style={styles.aiHintText}>ZEC</Text></View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* What to do now */}
        {actionItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.home.whatToDo}</Text>
            </View>
            <View style={styles.actionCards}>
              {actionItems.map((item) => {
                const Icon = getActionIcon(item.type);
                const priorityColor = getPriorityColor(item.priority);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.actionCard}
                    onPress={() => navigation.navigate(item.route, item.routeParams)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionPriorityBar, { backgroundColor: priorityColor }]} />
                    <View style={styles.actionCardContent}>
                      <View style={[styles.actionIconContainer, { backgroundColor: priorityColor + '15' }]}>
                        <Icon size={20} color={priorityColor} />
                      </View>
                      <View style={styles.actionTextContainer}>
                        <Text style={styles.actionTitle}>{item.title}</Text>
                        <Text style={styles.actionDescription} numberOfLines={1}>{item.description}</Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: priorityColor }]}
                        onPress={() => navigation.navigate(item.route, item.routeParams)}
                      >
                        <Text style={styles.actionButtonText}>{item.action}</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Deadlines */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.home.upcomingDeadlines}</Text>
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => navigation.navigate('Scadenze')}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>{t.home.calendar}</Text>
              <ChevronRight size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
          
          {deadlines.length > 0 ? (
            <View style={styles.deadlinesContainer}>
              {deadlines.map((deadline) => (
                <TouchableOpacity
                  key={deadline.id}
                  style={[styles.deadlineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('DeadlineDetail', {
                    id: deadline.id,
                    title: deadline.title,
                    description: deadline.description,
                    due_date: deadline.due_date,
                    category: deadline.category,
                    status: deadline.originalStatus,
                    priority: deadline.priority,
                    daysLeft: deadline.daysLeft,
                  })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.deadlineDateBox, { backgroundColor: getDeadlineColor(deadline.status) + '15' }]}>
                    <Text style={[styles.deadlineDate, { color: getDeadlineColor(deadline.status) }]}>
                      {deadline.date}
                    </Text>
                  </View>
                  <View style={styles.deadlineInfo}>
                    <Text style={[styles.deadlineTitle, { color: colors.text }]} numberOfLines={1}>{deadline.title}</Text>
                    <Text style={[styles.deadlineDays, { color: getDeadlineColor(deadline.status) }]}>
                      {getDeadlineDaysText(deadline.daysLeft)}
                    </Text>
                  </View>
                  {deadline.status === 'urgent' && (
                    <AlertTriangle size={20} color={colors.error} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyDeadlines, { backgroundColor: colors.surface }]}>
              <Calendar size={32} color={colors.textLight} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.home.noUpcomingDeadlines}</Text>
              <Text style={[styles.emptySubtext, { color: colors.textLight }]}>{t.home.allCaughtUp}</Text>
            </View>
          )}
        </View>

        {/* Quick Access */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.home.quickAccess}</Text>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity style={[styles.quickAccessCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('Dichiarazioni')}>
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary + '15' }]}>
                <FileText size={24} color={colors.primary} />
              </View>
              <Text style={[styles.quickAccessTitle, { color: colors.text }]}>{t.practices.title}</Text>
              <Text style={[styles.quickAccessCount, { color: colors.textSecondary }]}>{stats.practicesInProgress} {t.home.inProgress}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickAccessCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('Documenti')}>
              <View style={[styles.quickAccessIcon, { backgroundColor: '#8b5cf6' + '15' }]}>
                <Folder size={24} color="#8b5cf6" />
              </View>
              <Text style={[styles.quickAccessTitle, { color: colors.text }]}>{t.documents.title}</Text>
              {stats.newDocuments > 0 && (
                <Text style={[styles.quickAccessCount, { color: '#8b5cf6' }]}>{stats.newDocuments} {t.home.newDocs}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickAccessCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('Comunicazioni')}>
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.info + '15' }]}>
                <MessageSquare size={24} color={colors.info} />
              </View>
              <Text style={[styles.quickAccessTitle, { color: colors.text }]}>{t.tickets.tickets}</Text>
              {stats.ticketsOpen > 0 && (
                <View style={[styles.quickAccessBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.quickAccessBadgeText}>{stats.ticketsOpen}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickAccessCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('Notifiche')}>
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.warning + '15' }]}>
                <Bell size={24} color={colors.warning} />
              </View>
              <Text style={[styles.quickAccessTitle, { color: colors.text }]}>{t.notifications.title}</Text>
              {stats.unreadNotifications > 0 && (
                <View style={[styles.quickAccessBadge, { backgroundColor: colors.warning }]}>
                  <Text style={styles.quickAccessBadgeText}>{stats.unreadNotifications}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <View style={styles.section}>
            <View style={styles.activityHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.home.recentActivity}</Text>
              <View style={styles.activityActions}>
                {hasNewActivities && (
                  <TouchableOpacity style={styles.activityActionButton} onPress={markAllAsViewed}>
                    <Eye size={14} color={colors.primary} />
                    <Text style={[styles.activityActionText, { color: colors.primary }]}>{t.home.markAsRead}</Text>
                  </TouchableOpacity>
                )}
                {hasViewedActivities && (
                  <TouchableOpacity style={styles.activityActionButton} onPress={clearAllViewed}>
                    <Trash2 size={14} color={colors.textSecondary} />
                    <Text style={[styles.activityActionText, { color: colors.textSecondary }]}>{t.home.clear}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={[styles.activityContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {recentActivity.map((activity, index) => (
                <View key={activity.id} style={[styles.activityItem, index < recentActivity.length - 1 && { borderBottomColor: colors.border }, index < recentActivity.length - 1 && styles.activityItemBorder]}>
                  <View style={[styles.activityDot, activity.isNew ? { backgroundColor: colors.primary } : { backgroundColor: colors.textLight }]} />
                  <TouchableOpacity 
                    style={styles.activityContent} 
                    onPress={() => markAsViewed(activity.id)} 
                    activeOpacity={0.7}
                  >
                    <View style={styles.activityTextContainer}>
                      <Text style={[styles.activityTitle, { color: colors.text }, !activity.isNew && { color: colors.textSecondary }]}>{activity.title}</Text>
                      <Text style={[styles.activityTime, { color: colors.textLight }]}>{formatTimeAgo(activity.timestamp)}</Text>
                    </View>
                    {activity.isNew && (
                      <View style={[styles.newBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.newBadgeText, { color: colors.primary }]}>{t.home.new}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.dismissButton} 
                    onPress={() => dismissActivity(activity.id)} 
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={16} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <Text style={styles.activityHint}>{t.home.activityHint}</Text>
          </View>
        )}

        {/* Tax Models Section */}
        {taxModels.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t.taxModels?.title || 'Guida ai Modelli Fiscali'}</Text>
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => navigation.navigate('GuidaModelli')}
              >
                <Text style={styles.seeAllText}>{t.home.seeAll}</Text>
                <ChevronRight size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modelsSubtitle}>
              {t.taxModels?.subtitle || 'Scopri cosa sono e come funzionano i modelli tributari'}
            </Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.modelsScroll}
            >
              {taxModels.slice(0, 6).map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={styles.modelCard}
                  onPress={() => setSelectedModel(model)}
                  activeOpacity={0.8}
                >
                  <View style={styles.modelHeader}>
                    <View style={styles.modelCodeBadge}>
                      <Text style={styles.modelCode}>{model.codice}</Text>
                    </View>
                    {model.video_youtube && (
                      <View style={styles.modelVideoBadge}>
                        <Play size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.modelName} numberOfLines={2}>{model.nome}</Text>
                  <Text style={styles.modelDesc} numberOfLines={2}>{model.descrizione}</Text>
                  {model.periodicita && (
                    <View style={styles.modelPeriod}>
                      <Calendar size={12} color={COLORS.textSecondary} />
                      <Text style={styles.modelPeriodText}>{model.periodicita}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Model Detail Modal */}
        {selectedModel && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              activeOpacity={1} 
              onPress={() => setSelectedModel(null)} 
            />
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalCodeBadge}>
                    <Text style={styles.modalCodeText}>{selectedModel.codice}</Text>
                  </View>
                  <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedModel(null)}>
                    <X size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.modalTitle}>{selectedModel.nome}</Text>
                <Text style={styles.modalDescription}>{selectedModel.descrizione}</Text>
                
                {/* Video Button */}
                {selectedModel.video_youtube && (
                  <TouchableOpacity 
                    style={styles.videoButton}
                    onPress={() => Linking.openURL(selectedModel.video_youtube!)}
                  >
                    <LinearGradient
                      colors={['#dc2626', '#b91c1c']}
                      style={styles.videoButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Play size={20} color="#fff" />
                      <Text style={styles.videoButtonText}>Guarda Video Esplicativo</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                
                {/* Info Sections */}
                {selectedModel.a_cosa_serve && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>A cosa serve</Text>
                    <Text style={styles.infoText}>{selectedModel.a_cosa_serve}</Text>
                  </View>
                )}
                
                {selectedModel.chi_deve_presentarlo && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>Chi deve presentarlo</Text>
                    <Text style={styles.infoText}>{selectedModel.chi_deve_presentarlo}</Text>
                  </View>
                )}
                
                {selectedModel.periodicita && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>Periodicità</Text>
                    <View style={styles.infoBadgeRow}>
                      <View style={styles.infoBadge}>
                        <Calendar size={14} color={COLORS.primary} />
                        <Text style={styles.infoBadgeText}>{selectedModel.periodicita}</Text>
                      </View>
                      {selectedModel.scadenza_tipica && (
                        <View style={[styles.infoBadge, { backgroundColor: COLORS.warning + '15' }]}>
                          <AlertCircle size={14} color={COLORS.warning} />
                          <Text style={[styles.infoBadgeText, { color: COLORS.warning }]}>
                            Scadenza: {selectedModel.scadenza_tipica}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                
                {selectedModel.documenti_necessari && selectedModel.documenti_necessari.length > 0 && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>Documenti necessari</Text>
                    {selectedModel.documenti_necessari.map((doc, idx) => (
                      <View key={idx} style={styles.docItem}>
                        <View style={styles.docBullet} />
                        <Text style={styles.docText}>{doc}</Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {selectedModel.note_operative && (
                  <View style={[styles.infoSection, styles.noteSection]}>
                    <Text style={styles.infoLabel}>Note operative</Text>
                    <Text style={styles.noteText}>{selectedModel.note_operative}</Text>
                  </View>
                )}
                
                {selectedModel.link_approfondimento && (
                  <TouchableOpacity 
                    style={styles.linkButton}
                    onPress={() => Linking.openURL(selectedModel.link_approfondimento!)}
                  >
                    <ExternalLink size={16} color={COLORS.primary} />
                    <Text style={styles.linkButtonText}>Approfondisci sul sito ufficiale</Text>
                  </TouchableOpacity>
                )}
                
                <View style={{ height: 40 }} />
              </ScrollView>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fb' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36 },
  brandName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  searchButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  welcomeSection: { marginBottom: 24 },
  welcomeText: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 4 },
  userName: { fontSize: 28, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 },
  aiCard: { marginBottom: 28, borderRadius: 20, overflow: 'hidden', shadowColor: '#0d9488', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  aiCardGradient: { padding: 20 },
  aiCardContent: { flexDirection: 'row', alignItems: 'center' },
  aiIconContainer: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  aiSparkle: { position: 'absolute', top: -4, right: -4, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: 3 },
  aiTextContainer: { flex: 1, marginLeft: 16 },
  aiTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  aiSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  aiArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  aiHints: { flexDirection: 'row', marginTop: 16, gap: 8 },
  aiHint: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  aiHintText: { fontSize: 12, fontWeight: '600', color: '#ffffff' },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, letterSpacing: -0.3 },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  actionCards: { gap: 12 },
  actionCard: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  actionPriorityBar: { height: 3, width: '100%' },
  actionCardContent: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  actionIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  actionDescription: { fontSize: 13, color: COLORS.textSecondary },
  actionButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  deadlinesContainer: { gap: 10 },
  deadlineCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 12 },
  deadlineDateBox: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  deadlineDate: { fontSize: 13, fontWeight: '700' },
  deadlineInfo: { flex: 1 },
  deadlineTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  deadlineDays: { fontSize: 12, fontWeight: '500' },
  emptyDeadlines: { backgroundColor: '#ffffff', borderRadius: 14, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', gap: 8 },
  emptyText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  emptySubtext: { fontSize: 13, color: COLORS.textSecondary },
  quickAccessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  quickAccessCard: { width: (SCREEN_WIDTH - 48 - 12) / 2, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', position: 'relative' },
  quickAccessIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  quickAccessTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  quickAccessCount: { fontSize: 13, color: COLORS.textSecondary },
  quickAccessBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  quickAccessBadgeText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  activityActions: { flexDirection: 'row', gap: 8 },
  activityActionButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.primary + '10', borderRadius: 20 },
  activityActionText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  activityContainer: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  activityItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  activityItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  activityDot: { width: 10, height: 10, borderRadius: 5 },
  activityDotNew: { backgroundColor: COLORS.primary },
  activityDotViewed: { backgroundColor: COLORS.textLight, opacity: 0.5 },
  activityContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  activityTextContainer: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  activityTitleViewed: { color: COLORS.textSecondary },
  activityTime: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  newBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 8 },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: '#ffffff' },
  dismissButton: { padding: 8, borderRadius: 20, backgroundColor: COLORS.background },
  activityHint: { fontSize: 11, color: COLORS.textLight, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  // Tax Models Section Styles
  modelsSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 18 },
  modelsScroll: { paddingRight: 24 },
  modelCard: { width: 180, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginRight: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  modelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  modelCodeBadge: { backgroundColor: COLORS.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  modelCode: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  modelVideoBadge: { backgroundColor: '#dc2626', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modelName: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 6, lineHeight: 18 },
  modelDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16, marginBottom: 10 },
  modelPeriod: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modelPeriodText: { fontSize: 11, color: COLORS.textSecondary, textTransform: 'capitalize' },
  // Modal Styles
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingTop: 12 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalScroll: { paddingHorizontal: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalCodeBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  modalCodeText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8, letterSpacing: -0.3 },
  modalDescription: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 20 },
  videoButton: { marginBottom: 24, borderRadius: 14, overflow: 'hidden' },
  videoButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 10 },
  videoButtonText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  infoSection: { marginBottom: 20 },
  infoLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  infoBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 6 },
  infoBadgeText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  docItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  docBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  docText: { fontSize: 14, color: COLORS.textSecondary, flex: 1 },
  noteSection: { backgroundColor: COLORS.warning + '10', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  noteText: { fontSize: 14, color: COLORS.text, lineHeight: 20, fontStyle: 'italic' },
  linkButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.primary, gap: 8 },
  linkButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
});
