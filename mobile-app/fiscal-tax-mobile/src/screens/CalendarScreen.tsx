import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  List,
  Grid,
  Filter,
  Bell,
  ChevronDown,
  Info,
  ArrowRight,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';
import { CardSkeleton, Skeleton } from '../components/UIStates';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_WIDTH = (SCREEN_WIDTH - 48 - 6 * 4) / 7;

interface Deadline {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  date: string;
  due_date?: string;
  category?: string;
  status: string;
  priority: string;
}

const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarScreen: React.FC = () => {
  const { token } = useAuth();
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  
  const MONTHS = language === 'en' ? MONTHS_EN : language === 'es' ? MONTHS_ES : MONTHS_IT;
  const DAYS = language === 'en' ? DAYS_EN : language === 'es' ? DAYS_ES : DAYS_IT;
  
  const FILTERS = [
    { key: 'all', label: t.common.all },
    { key: 'urgent', label: t.deadlines.priorityHigh },
    { key: 'pending', label: t.deadlines.statusInProgress },
    { key: 'completed', label: t.deadlines.statusCompleted },
  ];
  
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadDeadlines();
    }
  }, [token]);

  const loadDeadlines = async () => {
    try {
      const data = await apiService.getDeadlines();
      setDeadlines(data.map((d: any) => ({
        ...d,
        status: d.status || 'pending',
        priority: d.priority || 'medium',
      })));
    } catch (error) {
      console.error('Error loading deadlines:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDeadlines();
    setRefreshing(false);
  }, []);

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    const days: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getDeadlinesForDay = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return deadlines.filter(d => {
      const deadlineDate = new Date(d.date || d.due_date || '');
      return deadlineDate.getDate() === day &&
             deadlineDate.getMonth() === month &&
             deadlineDate.getFullYear() === year;
    });
  };

  const getSelectedDateDeadlines = () => {
    if (!selectedDate) return [];
    return deadlines.filter(d => {
      const deadlineDate = new Date(d.date || d.due_date || '');
      return deadlineDate.getDate() === selectedDate.getDate() &&
             deadlineDate.getMonth() === selectedDate.getMonth() &&
             deadlineDate.getFullYear() === selectedDate.getFullYear();
    });
  };

  const getFilteredDeadlines = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let filtered = deadlines;
    
    if (filter === 'urgent') {
      filtered = deadlines.filter(d => {
        const deadlineDate = new Date(d.date || d.due_date || '');
        const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 3 && d.status !== 'completed';
      });
    } else if (filter === 'pending') {
      filtered = deadlines.filter(d => d.status !== 'completed');
    } else if (filter === 'completed') {
      filtered = deadlines.filter(d => d.status === 'completed');
    }
    
    return filtered.sort((a, b) => new Date(a.date || a.due_date || '').getTime() - new Date(b.date || b.due_date || '').getTime());
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const formatShortDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return '';
    }
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(dateString);
    deadlineDate.setHours(0, 0, 0, 0);
    return Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatusConfig = (deadline: Deadline) => {
    const daysUntil = getDaysUntil(deadline.date || deadline.due_date || '');

    if (deadline.status === 'completed' || deadline.status === 'completata') {
      return { color: COLORS.success, bgColor: COLORS.success + '15', icon: CheckCircle, text: 'Completata', badge: 'completata' };
    }
    if (daysUntil < 0) {
      return { color: COLORS.error, bgColor: COLORS.error + '15', icon: AlertCircle, text: 'Scaduta', badge: 'scaduta' };
    }
    if (daysUntil === 0) {
      return { color: COLORS.error, bgColor: COLORS.error + '15', icon: AlertTriangle, text: 'Oggi!', badge: 'oggi' };
    }
    if (daysUntil <= 3) {
      return { color: COLORS.error, bgColor: COLORS.error + '15', icon: AlertTriangle, text: `${daysUntil} giorni`, badge: 'urgente' };
    }
    if (daysUntil <= 7) {
      return { color: COLORS.warning, bgColor: COLORS.warning + '15', icon: Clock, text: `${daysUntil} giorni`, badge: 'imminente' };
    }
    return { color: COLORS.primary, bgColor: COLORS.primary + '15', icon: Clock, text: `${daysUntil} giorni`, badge: 'programmata' };
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
           currentMonth.getMonth() === today.getMonth() &&
           currentMonth.getFullYear() === today.getFullYear();
  };

  const navigateToDetail = (deadline: Deadline) => {
    const daysUntil = getDaysUntil(deadline.date || deadline.due_date || '');
    navigation.navigate('DeadlineDetail', {
      id: deadline._id || deadline.id,
      title: deadline.title,
      description: deadline.description || '',
      due_date: deadline.date || deadline.due_date,
      category: deadline.category || 'fiscale',
      status: deadline.status,
      priority: deadline.priority,
      daysLeft: daysUntil,
    });
  };

  // Render Deadline Card (used in list view)
  const renderDeadlineCard = (deadline: Deadline, showDate: boolean = true) => {
    const config = getStatusConfig(deadline);
    const StatusIcon = config.icon;

    return (
      <TouchableOpacity
        key={deadline._id || deadline.id}
        style={styles.deadlineCard}
        onPress={() => navigateToDetail(deadline)}
        activeOpacity={0.7}
      >
        <View style={[styles.deadlineCardIcon, { backgroundColor: config.bgColor }]}>
          <StatusIcon size={20} color={config.color} />
        </View>
        <View style={styles.deadlineCardContent}>
          <Text style={styles.deadlineCardTitle} numberOfLines={1}>{deadline.title}</Text>
          {showDate && (
            <Text style={styles.deadlineCardDate}>
              {formatShortDate(deadline.date || deadline.due_date || '')}
            </Text>
          )}
          {deadline.description && (
            <Text style={styles.deadlineCardDescription} numberOfLines={1}>
              {deadline.description}
            </Text>
          )}
        </View>
        <View style={styles.deadlineCardRight}>
          <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
            <Text style={[styles.statusBadgeText, { color: config.color }]}>
              {config.badge}
            </Text>
          </View>
          <ChevronRight size={18} color={COLORS.textLight} />
        </View>
      </TouchableOpacity>
    );
  };

  // Render Calendar View
  const renderCalendarView = () => {
    const days = getDaysInMonth();
    const selectedDateDeadlines = getSelectedDateDeadlines();
    
    // LOGICA DI DEDUPLICAZIONE: 
    // Se l'utente ha selezionato un giorno specifico, mostriamo SOLO le scadenze di quel giorno
    // Altrimenti, mostriamo una lista unificata delle scadenze imminenti (senza duplicazioni)
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Crea lista unificata delle scadenze attive (non completate, non scadute da più di 30 giorni)
    const getUnifiedDeadlinesList = () => {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      return deadlines
        .filter(d => {
          const deadlineDate = new Date(d.date || d.due_date || '');
          deadlineDate.setHours(0, 0, 0, 0);
          // Mostra scadenze future e quelle scadute negli ultimi 30 giorni
          return deadlineDate >= thirtyDaysAgo;
        })
        .sort((a, b) => {
          // Prima le urgenti, poi per data
          const dateA = new Date(a.date || a.due_date || '');
          const dateB = new Date(b.date || b.due_date || '');
          const daysA = Math.ceil((dateA.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const daysB = Math.ceil((dateB.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          // Priorità: scadute/oggi/urgenti prima
          const urgencyA = daysA <= 0 ? 0 : daysA <= 3 ? 1 : daysA <= 7 ? 2 : 3;
          const urgencyB = daysB <= 0 ? 0 : daysB <= 3 ? 1 : daysB <= 7 ? 2 : 3;
          
          if (urgencyA !== urgencyB) return urgencyA - urgencyB;
          return dateA.getTime() - dateB.getTime();
        });
    };
    
    const unifiedDeadlines = getUnifiedDeadlinesList();
    
    // Determina se mostrare le scadenze del giorno selezionato o la lista unificata
    const isSelectedDateToday = selectedDate && 
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear();
    
    // Se il giorno selezionato è oggi, mostriamo la lista unificata
    // Se è un altro giorno, mostriamo solo le scadenze di quel giorno
    const showUnifiedList = !selectedDate || isSelectedDateToday;
    const deadlinesToShow = showUnifiedList ? unifiedDeadlines : selectedDateDeadlines;
    
    // Conta scadenze per categoria (per statistiche)
    const urgentCount = unifiedDeadlines.filter(d => {
      const daysUntil = getDaysUntil(d.date || d.due_date || '');
      return daysUntil <= 3 && daysUntil >= 0 && d.status !== 'completed';
    }).length;
    
    const overdueCount = unifiedDeadlines.filter(d => {
      const daysUntil = getDaysUntil(d.date || d.due_date || '');
      return daysUntil < 0 && d.status !== 'completed';
    }).length;

    return (
      <>
        {/* Stats Banner */}
        {unifiedDeadlines.length > 0 && (
          <View style={[styles.statsBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{unifiedDeadlines.filter(d => d.status !== 'completed').length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Attive</Text>
            </View>
            {urgentCount > 0 && (
              <View style={[styles.statItem, styles.statItemUrgent]}>
                <Text style={[styles.statNumber, { color: colors.error }]}>{urgentCount}</Text>
                <Text style={[styles.statLabel, { color: colors.error }]}>Urgenti</Text>
              </View>
            )}
            {overdueCount > 0 && (
              <View style={[styles.statItem, styles.statItemOverdue]}>
                <Text style={[styles.statNumber, { color: colors.error }]}>{overdueCount}</Text>
                <Text style={[styles.statLabel, { color: colors.error }]}>Scadute</Text>
              </View>
            )}
          </View>
        )}

        {/* Calendar */}
        <View style={[styles.calendarContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
              <ChevronLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.text }]}>
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
              <ChevronRight size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {DAYS.map((day) => (
              <View key={day} style={styles.dayHeader}>
                <Text style={[styles.dayHeaderText, { color: colors.textSecondary }]}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {days.map((day, index) => {
              const dayDeadlines = day ? getDeadlinesForDay(day) : [];
              const hasUrgent = dayDeadlines.some(d => {
                const config = getStatusConfig(d);
                return config.color === COLORS.error;
              });
              const hasWarning = dayDeadlines.some(d => {
                const config = getStatusConfig(d);
                return config.color === COLORS.warning;
              });
              const isSelected = selectedDate && day === selectedDate.getDate() &&
                currentMonth.getMonth() === selectedDate.getMonth() &&
                currentMonth.getFullYear() === selectedDate.getFullYear();

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    day && isToday(day) ? styles.dayCellToday : undefined,
                    isSelected ? styles.dayCellSelected : undefined,
                  ]}
                  onPress={() => day && setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
                  disabled={!day}
                >
                  {day && (
                    <>
                      <Text style={[
                        styles.dayNumber,
                        isToday(day) && styles.dayNumberToday,
                        isSelected && styles.dayNumberSelected,
                      ]}>
                        {day}
                      </Text>
                      {dayDeadlines.length > 0 && (
                        <View style={styles.deadlineIndicators}>
                          <View style={[
                            styles.indicator, 
                            { backgroundColor: hasUrgent ? COLORS.error : hasWarning ? COLORS.warning : COLORS.primary }
                          ]} />
                          {dayDeadlines.length > 1 && (
                            <Text style={styles.indicatorCount}>+{dayDeadlines.length - 1}</Text>
                          )}
                        </View>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          
          {/* Reset to today button */}
          {selectedDate && !isSelectedDateToday && (
            <TouchableOpacity 
              style={styles.resetDateButton}
              onPress={() => setSelectedDate(new Date())}
            >
              <Text style={styles.resetDateText}>Torna a oggi</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Unified Deadlines Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            {showUnifiedList ? (
              <>
                <CalendarIcon size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Le tue scadenze</Text>
              </>
            ) : (
              <>
                <CalendarIcon size={18} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>
                  {selectedDate?.getDate()} {MONTHS[selectedDate?.getMonth() || 0]}
                </Text>
              </>
            )}
            <Text style={styles.sectionCount}>
              {deadlinesToShow.length} scadenz{deadlinesToShow.length !== 1 ? 'e' : 'a'}
            </Text>
          </View>
          
          {deadlinesToShow.length > 0 ? (
            deadlinesToShow.map(deadline => renderDeadlineCardEnhanced(deadline))
          ) : (
            <View style={styles.emptyState}>
              <CalendarIcon size={32} color={COLORS.textLight} />
              <Text style={styles.emptyStateText}>
                {showUnifiedList ? 'Nessuna scadenza programmata' : 'Nessuna scadenza per questo giorno'}
              </Text>
            </View>
          )}
        </View>

        {/* Empty State for no deadlines at all */}
        {deadlines.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <CalendarIcon size={64} color={COLORS.textLight} />
            <Text style={styles.emptyStateTitle}>Nessuna scadenza</Text>
            <Text style={styles.emptyStateSubtitle}>
              Non ci sono scadenze fiscali programmate per il momento
            </Text>
          </View>
        )}
      </>
    );
  };

  // Render Enhanced Deadline Card with multiple badges
  const renderDeadlineCardEnhanced = (deadline: Deadline) => {
    const config = getStatusConfig(deadline);
    const StatusIcon = config.icon;
    const daysUntil = getDaysUntil(deadline.date || deadline.due_date || '');
    
    // Calcola i badge da mostrare
    const badges: { text: string; color: string; bgColor: string }[] = [];
    
    // Badge principale (stato)
    badges.push({
      text: config.badge,
      color: config.color,
      bgColor: config.bgColor,
    });
    
    // Badge aggiuntivo "entro 7gg" se non è già urgente/scaduta/oggi
    if (daysUntil > 3 && daysUntil <= 7 && deadline.status !== 'completed') {
      badges.push({
        text: 'entro 7gg',
        color: COLORS.warning,
        bgColor: COLORS.warning + '15',
      });
    }

    return (
      <TouchableOpacity
        key={deadline._id || deadline.id}
        style={styles.deadlineCardEnhanced}
        onPress={() => navigateToDetail(deadline)}
        activeOpacity={0.7}
      >
        <View style={[styles.deadlineCardIcon, { backgroundColor: config.bgColor }]}>
          <StatusIcon size={20} color={config.color} />
        </View>
        <View style={styles.deadlineCardContent}>
          <Text style={styles.deadlineCardTitle} numberOfLines={1}>{deadline.title}</Text>
          <Text style={styles.deadlineCardDate}>
            {formatDate(deadline.date || deadline.due_date || '')}
          </Text>
          {deadline.description && (
            <Text style={styles.deadlineCardDescription} numberOfLines={1}>
              {deadline.description}
            </Text>
          )}
        </View>
        <View style={styles.deadlineCardRight}>
          <View style={styles.badgesContainer}>
            {badges.map((badge, index) => (
              <View 
                key={index}
                style={[styles.statusBadge, { backgroundColor: badge.bgColor }]}
              >
                <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                  {badge.text}
                </Text>
              </View>
            ))}
          </View>
          <ChevronRight size={18} color={COLORS.textLight} />
        </View>
      </TouchableOpacity>
    );
  };

  // Render List View
  const renderListView = () => {
    const filteredDeadlines = getFilteredDeadlines();

    return (
      <>
        {/* Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersContainer}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Results Count */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {filteredDeadlines.length} {language === 'en' ? (filteredDeadlines.length !== 1 ? 'deadlines' : 'deadline') : 
              language === 'es' ? (filteredDeadlines.length !== 1 ? 'vencimientos' : 'vencimiento') :
              (filteredDeadlines.length !== 1 ? 'scadenze' : 'scadenza')}
          </Text>
        </View>

        {/* Deadlines List */}
        {filteredDeadlines.length > 0 ? (
          <View style={styles.listContent}>
            {filteredDeadlines.map(deadline => renderDeadlineCard(deadline))}
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <Filter size={48} color={COLORS.textLight} />
            <Text style={styles.emptyStateTitle}>{t.deadlines.noDeadlines}</Text>
            <Text style={styles.emptyStateSubtitle}>
              {t.deadlines.noDeadlinesDesc}
            </Text>
          </View>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.deadlines.title}</Text>
        </View>
        <View style={{ padding: SPACING.md }}>
          {/* Calendar skeleton */}
          <View style={{ backgroundColor: '#fff', borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md }}>
            <Skeleton width="50%" height={24} style={{ alignSelf: 'center', marginBottom: SPACING.md }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.sm }}>
              {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} width={30} height={14} />)}
            </View>
            <View style={{ gap: 8 }}>
              {[1,2,3,4,5].map(row => (
                <View key={row} style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  {[1,2,3,4,5,6,7].map(d => <Skeleton key={d} width={30} height={30} borderRadius={8} />)}
                </View>
              ))}
            </View>
          </View>
          {/* Deadline cards skeleton */}
          <CardSkeleton count={4} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.deadlines.title}</Text>
        <View style={[styles.viewToggle, { backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'calendar' && styles.toggleButtonActive]}
            onPress={() => setViewMode('calendar')}
          >
            <Grid size={18} color={viewMode === 'calendar' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <List size={18} color={viewMode === 'list' ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
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
        {viewMode === 'calendar' ? renderCalendarView() : renderListView()}
        <View style={{ height: 100 }} />
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Next Deadline Card
  // Calendar
  calendarContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  navButton: {
    padding: SPACING.xs,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  dayHeader: {
    width: DAY_WIDTH,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: DAY_WIDTH,
    height: DAY_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    marginVertical: 2,
    borderRadius: RADIUS.md,
  },
  dayCellToday: {
    backgroundColor: COLORS.primary + '15',
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  dayNumberToday: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  dayNumberSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  deadlineIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  indicatorCount: {
    fontSize: 8,
    color: COLORS.textSecondary,
    marginLeft: 2,
  },
  // Sections
  section: {
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  // Deadline Card
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  deadlineCardEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  deadlineCardIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  deadlineCardContent: {
    flex: 1,
  },
  deadlineCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  deadlineCardDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  deadlineCardDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  deadlineCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badgesContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    justifyContent: 'space-around',
    ...SHADOWS.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statItemUrgent: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    paddingLeft: SPACING.md,
  },
  statItemOverdue: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    paddingLeft: SPACING.md,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  resetDateButton: {
    alignSelf: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary + '15',
    borderRadius: RADIUS.full,
  },
  resetDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Filters
  filtersScroll: {
    marginBottom: SPACING.sm,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  resultsHeader: {
    marginBottom: SPACING.sm,
  },
  resultsCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  listContent: {
    gap: 0,
  },
  // Empty States
  emptyState: {
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xl,
  },
});
