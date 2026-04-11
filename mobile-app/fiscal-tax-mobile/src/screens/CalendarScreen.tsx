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
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';

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

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const FILTERS = [
  { key: 'all', label: 'Tutte' },
  { key: 'urgent', label: 'Urgenti' },
  { key: 'pending', label: 'In corso' },
  { key: 'completed', label: 'Completate' },
];

export const CalendarScreen: React.FC = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
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

  const getUpcomingDeadlines = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return deadlines
      .filter(d => {
        const deadlineDate = new Date(d.date || d.due_date || '');
        deadlineDate.setHours(0, 0, 0, 0);
        return deadlineDate >= today && deadlineDate <= nextWeek && d.status !== 'completed';
      })
      .sort((a, b) => new Date(a.date || a.due_date || '').getTime() - new Date(b.date || b.due_date || '').getTime());
  };

  const getUrgentDeadlines = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return deadlines
      .filter(d => {
        const deadlineDate = new Date(d.date || d.due_date || '');
        deadlineDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 3 && diffDays >= 0 && d.status !== 'completed';
      })
      .sort((a, b) => new Date(a.date || a.due_date || '').getTime() - new Date(b.date || b.due_date || '').getTime());
  };

  const getNextImportantDeadline = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcoming = deadlines
      .filter(d => {
        const deadlineDate = new Date(d.date || d.due_date || '');
        deadlineDate.setHours(0, 0, 0, 0);
        return deadlineDate >= today && d.status !== 'completed';
      })
      .sort((a, b) => new Date(a.date || a.due_date || '').getTime() - new Date(b.date || b.due_date || '').getTime());
    
    return upcoming[0] || null;
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

  // Render Next Important Deadline Card
  const renderNextDeadlineCard = () => {
    const nextDeadline = getNextImportantDeadline();
    if (!nextDeadline) return null;

    const config = getStatusConfig(nextDeadline);
    const StatusIcon = config.icon;
    const daysUntil = getDaysUntil(nextDeadline.date || nextDeadline.due_date || '');

    return (
      <TouchableOpacity 
        style={[styles.nextDeadlineCard, { borderLeftColor: config.color }]}
        onPress={() => navigateToDetail(nextDeadline)}
        activeOpacity={0.8}
      >
        <View style={styles.nextDeadlineHeader}>
          <View style={[styles.nextDeadlineBadge, { backgroundColor: config.bgColor }]}>
            <StatusIcon size={14} color={config.color} />
            <Text style={[styles.nextDeadlineBadgeText, { color: config.color }]}>
              Prossima scadenza
            </Text>
          </View>
          <View style={[styles.daysLeftBadge, { backgroundColor: config.color }]}>
            <Text style={styles.daysLeftText}>
              {daysUntil === 0 ? 'OGGI' : daysUntil < 0 ? 'SCADUTA' : `${daysUntil}g`}
            </Text>
          </View>
        </View>
        <Text style={styles.nextDeadlineTitle}>{nextDeadline.title}</Text>
        <View style={styles.nextDeadlineFooter}>
          <Text style={styles.nextDeadlineDate}>
            <CalendarIcon size={14} color={COLORS.textSecondary} /> {formatDate(nextDeadline.date || nextDeadline.due_date || '')}
          </Text>
          <View style={styles.viewDetailButton}>
            <Text style={styles.viewDetailText}>Dettagli</Text>
            <ArrowRight size={14} color={COLORS.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render Deadline Card
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
    const upcomingDeadlines = getUpcomingDeadlines();
    const urgentDeadlines = getUrgentDeadlines();

    return (
      <>
        {/* Next Important Deadline */}
        {renderNextDeadlineCard()}

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
              <ChevronLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
              <ChevronRight size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {DAYS.map((day) => (
              <View key={day} style={styles.dayHeader}>
                <Text style={styles.dayHeaderText}>{day}</Text>
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
        </View>

        {/* Selected Day Deadlines */}
        {selectedDate && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <CalendarIcon size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>
                {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]}
              </Text>
              <Text style={styles.sectionCount}>
                {selectedDateDeadlines.length} scadenz{selectedDateDeadlines.length !== 1 ? 'e' : 'a'}
              </Text>
            </View>
            {selectedDateDeadlines.length > 0 ? (
              selectedDateDeadlines.map(deadline => renderDeadlineCard(deadline, false))
            ) : (
              <View style={styles.emptyState}>
                <CalendarIcon size={32} color={COLORS.textLight} />
                <Text style={styles.emptyStateText}>Nessuna scadenza per questo giorno</Text>
              </View>
            )}
          </View>
        )}

        {/* Urgent Deadlines */}
        {urgentDeadlines.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={18} color={COLORS.error} />
              <Text style={[styles.sectionTitle, { color: COLORS.error }]}>Scadenze Urgenti</Text>
              <View style={[styles.countBadge, { backgroundColor: COLORS.error }]}>
                <Text style={styles.countBadgeText}>{urgentDeadlines.length}</Text>
              </View>
            </View>
            {urgentDeadlines.slice(0, 3).map(deadline => renderDeadlineCard(deadline))}
          </View>
        )}

        {/* Upcoming Deadlines */}
        {upcomingDeadlines.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Prossimi 7 giorni</Text>
              <Text style={styles.sectionCount}>{upcomingDeadlines.length}</Text>
            </View>
            {upcomingDeadlines.slice(0, 5).map(deadline => renderDeadlineCard(deadline))}
          </View>
        )}

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
            {filteredDeadlines.length} scadenz{filteredDeadlines.length !== 1 ? 'e' : 'a'}
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
            <Text style={styles.emptyStateTitle}>Nessun risultato</Text>
            <Text style={styles.emptyStateSubtitle}>
              Nessuna scadenza corrisponde ai filtri selezionati
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
          <Text style={styles.headerTitle}>Scadenze</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scadenze</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'calendar' && styles.toggleButtonActive]}
            onPress={() => setViewMode('calendar')}
          >
            <Grid size={18} color={viewMode === 'calendar' ? '#fff' : COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <List size={18} color={viewMode === 'list' ? '#fff' : COLORS.textSecondary} />
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
            tintColor={COLORS.primary}
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
  nextDeadlineCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    ...SHADOWS.sm,
  },
  nextDeadlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  nextDeadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  nextDeadlineBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  daysLeftBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  daysLeftText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  nextDeadlineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  nextDeadlineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextDeadlineDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  viewDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
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
