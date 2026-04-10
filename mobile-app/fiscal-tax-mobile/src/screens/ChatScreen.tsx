import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Send,
  MessageSquare,
  Plus,
  Clock,
  CheckCircle,
  User,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';

interface Ticket {
  _id: string;
  id?: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at?: string;
  last_message?: string;
  unread_count?: number;
}

export const ChatScreen: React.FC = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadTickets();
    }
  }, [token]);

  const loadTickets = async () => {
    try {
      const data = await apiService.getTickets();
      setTickets(data);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  }, []);

  const createTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim() || creating) return;

    setCreating(true);
    try {
      await apiService.createTicket({
        subject: newSubject.trim(),
        message: newMessage.trim(),
      });
      setNewSubject('');
      setNewMessage('');
      setShowNewTicket(false);
      await loadTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
    } finally {
      setCreating(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: any; text: string }> = {
      'open': { color: COLORS.info, icon: Clock, text: 'Aperto' },
      'pending': { color: COLORS.warning, icon: Clock, text: 'In attesa' },
      'closed': { color: COLORS.success, icon: CheckCircle, text: 'Chiuso' },
    };
    return configs[status] || configs['open'];
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Ieri';
      } else if (diffDays < 7) {
        return date.toLocaleDateString('it-IT', { weekday: 'short' });
      } else {
        return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
      }
    } catch {
      return '';
    }
  };

  const renderTicket = ({ item }: { item: Ticket }) => {
    const statusConfig = getStatusConfig(item.status);
    const StatusIcon = statusConfig.icon;

    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() => navigation.navigate('TicketDetail', { id: item._id || item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.ticketIcon}>
          <MessageSquare size={22} color={COLORS.primary} />
        </View>
        <View style={styles.ticketContent}>
          <View style={styles.ticketHeader}>
            <Text style={styles.ticketSubject} numberOfLines={1}>
              {item.subject}
            </Text>
            <Text style={styles.ticketDate}>{formatDate(item.updated_at || item.created_at)}</Text>
          </View>
          {item.last_message && (
            <Text style={styles.ticketLastMessage} numberOfLines={2}>
              {item.last_message}
            </Text>
          )}
          <View style={styles.ticketFooter}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
              <StatusIcon size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.text}
              </Text>
            </View>
            {item.unread_count && item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
        <ChevronRight size={20} color={COLORS.textLight} />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <MessageSquare size={48} color={COLORS.textLight} />
      </View>
      <Text style={styles.emptyTitle}>Nessuna conversazione</Text>
      <Text style={styles.emptyText}>
        Inizia una nuova conversazione con il tuo commercialista
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => setShowNewTicket(true)}
      >
        <Plus size={20} color="#ffffff" />
        <Text style={styles.emptyButtonText}>Nuova conversazione</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messaggi</Text>
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
        <View>
          <Text style={styles.headerTitle}>Messaggi</Text>
          <Text style={styles.headerSubtitle}>
            {tickets.length} conversazion{tickets.length !== 1 ? 'i' : 'e'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => setShowNewTicket(true)}
        >
          <Plus size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Tickets List */}
      <FlatList
        data={tickets}
        renderItem={renderTicket}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* New Ticket Modal */}
      {showNewTicket && (
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalBackground}
            onPress={() => setShowNewTicket(false)}
            activeOpacity={1}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuova conversazione</Text>
              <TouchableOpacity onPress={() => setShowNewTicket(false)}>
                <Text style={styles.modalCancel}>Annulla</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.subjectInput}
              placeholder="Oggetto"
              placeholderTextColor={COLORS.textLight}
              value={newSubject}
              onChangeText={setNewSubject}
              maxLength={100}
            />

            <TextInput
              style={styles.messageInput}
              placeholder="Scrivi il tuo messaggio..."
              placeholderTextColor={COLORS.textLight}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!newSubject.trim() || !newMessage.trim() || creating) && styles.submitButtonDisabled,
              ]}
              onPress={createTicket}
              disabled={!newSubject.trim() || !newMessage.trim() || creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Send size={18} color="#ffffff" />
                  <Text style={styles.submitButtonText}>Invia</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  newButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  ticketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  ticketIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  ticketContent: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  ticketDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  ticketLastMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: SPACING.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.textLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  modalBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCancel: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  subjectInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  messageInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
    height: 120,
    marginBottom: SPACING.md,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
