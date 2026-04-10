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
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  List,
  Grid,
  Filter,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS } from '../config/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_WIDTH = (SCREEN_WIDTH - 48 - 6 * 4) / 7;

interface Deadline {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  date: string;
  category?: string;
  status: 'pending' | 'completed' | 'overdue';
  priority: 'high' | 'medium' | 'low';
}

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export const CalendarScreen: React.FC = () => {
  const { token } = useAuth();
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

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
    
    // Get the day of week (0-6, where 0 is Sunday)
    let startDayOfWeek = firstDay.getDay();
    // Convert to Monday = 0
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    const days: (number | null)[] = [];
    
    // Add empty cells for days before the first day
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add the days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const getDeadlinesForDay = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return deadlines.filter(d => {
      const deadlineDate = new Date(d.date);
      return deadlineDate.getDate() === day &&
             deadlineDate.getMonth() === month &&
             deadlineDate.getFullYear() === year;
    });
  };

  const getFilteredDeadlines = () => {
    let filtered = deadlines;
    if (filter === 'pending') {
      filtered = deadlines.filter(d => d.status === 'pending');
    } else if (filter === 'completed') {
      filtered = deadlines.filter(d => d.status === 'completed');
    }
    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

  const getStatusConfig = (deadline: Deadline) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline.date);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (deadline.status === 'completed') {
      return { color: COLORS.success, icon: CheckCircle, text: 'Completata' };
    }
    if (diffDays < 0) {
      return { color: COLORS.error, icon: AlertTriangle, text: 'Scaduta' };
    }
    if (diffDays <= 3) {
      return { color: COLORS.error, icon: AlertTriangle, text: `Tra ${diffDays} giorni` };
    }
    if (diffDays <= 7) {
      return { color: COLORS.warning, icon: Clock, text: `Tra ${diffDays} giorni` };
    }
    return { color: COLORS.primary, icon: Clock, text: `Tra ${diffDays} giorni` };
  };

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() &&
           currentMonth.getMonth() === today.getMonth() &&
           currentMonth.getFullYear() === today.getFullYear();
  };

  const renderCalendarView = () => {
    const days = getDaysInMonth();

    return (
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

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  day && isToday(day) && styles.dayCellToday,
                  selectedDate && day === selectedDate.getDate() &&
                    currentMonth.getMonth() === selectedDate.getMonth() &&
                    styles.dayCellSelected,
                ]}
                onPress={() => day && setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
                disabled={!day}
              >
                {day && (
                  <>
                    <Text style={[
                      styles.dayNumber,
                      isToday(day) && styles.dayNumberToday,
                    ]}>
                      {day}
                    </Text>
                    {dayDeadlines.length > 0 && (
                      <View style={styles.deadlineIndicators}>
                        {hasUrgent && <View style={[styles.indicator, { backgroundColor: COLORS.error }]} />}
                        {hasWarning && !hasUrgent && <View style={[styles.indicator, { backgroundColor: COLORS.warning }]} />}
                        {!hasUrgent && !hasWarning && <View style={[styles.indicator, { backgroundColor: COLORS.primary }]} />}
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Day Deadlines */}
        {selectedDate && (
          <View style={styles.selectedDaySection}>
            <Text style={styles.selectedDayTitle}>
              {selectedDate.getDate()} {MONTHS[selectedDate.getMonth()]}
            </Text>
            {getDeadlinesForDay(selectedDate.getDate()).length > 0 ? (
              getDeadlinesForDay(selectedDate.getDate()).map(deadline => {
                const config = getStatusConfig(deadline);
                const StatusIcon = config.icon;
                return (
                  <View key={deadline._id || deadline.id} style={styles.deadlineItem}>
                    <View style={[styles.deadlineIconContainer, { backgroundColor: config.color + '15' }]}>
                      <StatusIcon size={18} color={config.color} />
                    </View>
                    <View style={styles.deadlineContent}>
                      <Text style={styles.deadlineTitle}>{deadline.title}</Text>
                      <Text style={[styles.deadlineStatus, { color: config.color }]}>{config.text}</Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noDeadlines}>Nessuna scadenza per questo giorno</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderListView = () => {
    const filteredDeadlines = getFilteredDeadlines();

    return (
      <View style={styles.listContainer}>
        {/* Filters */}
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              Tutte ({deadlines.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
            onPress={() => setFilter('pending')}
          >
            <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
              In attesa ({deadlines.filter(d => d.status === 'pending').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
            onPress={() => setFilter('completed')}
          >
            <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
              Completate ({deadlines.filter(d => d.status === 'completed').length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Deadlines List */}
        {filteredDeadlines.length > 0 ? (
          filteredDeadlines.map(deadline => {
            const config = getStatusConfig(deadline);
            const StatusIcon = config.icon;
            return (
              <View key={deadline._id || deadline.id} style={styles.listDeadlineCard}>
                <View style={[styles.priorityBar, { backgroundColor: config.color }]} />
                <View style={styles.listDeadlineContent}>
                  <View style={styles.listDeadlineHeader}>
                    <View style={[styles.deadlineIconContainer, { backgroundColor: config.color + '15' }]}>
                      <StatusIcon size={18} color={config.color} />
                    </View>
                    <View style={styles.listDeadlineInfo}>
                      <Text style={styles.listDeadlineTitle}>{deadline.title}</Text>
                      <Text style={styles.listDeadlineDate}>{formatDate(deadline.date)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
                      <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.text}</Text>
                    </View>
                  </View>
                  {deadline.description && (
                    <Text style={styles.listDeadlineDescription}>{deadline.description}</Text>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyList}>
            <CalendarIcon size={48} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Nessuna scadenza</Text>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'Non hai scadenze fiscali registrate'
                : filter === 'pending'
                ? 'Nessuna scadenza in attesa'
                : 'Nessuna scadenza completata'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
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
            <Grid size={18} color={viewMode === 'calendar' ? '#ffffff' : COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <List size={18} color={viewMode === 'list' ? '#ffffff' : COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

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
    backgroundColor: '#f8f9fb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 10,
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
    borderRadius: 10,
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
  deadlineIndicators: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  indicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  selectedDaySection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  selectedDayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  deadlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  deadlineIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deadlineContent: {
    flex: 1,
  },
  deadlineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  deadlineStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  noDeadlines: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  listContainer: {
    gap: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  listDeadlineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  priorityBar: {
    height: 4,
    width: '100%',
  },
  listDeadlineContent: {
    padding: 16,
  },
  listDeadlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listDeadlineInfo: {
    flex: 1,
  },
  listDeadlineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  listDeadlineDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listDeadlineDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 12,
    lineHeight: 18,
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
