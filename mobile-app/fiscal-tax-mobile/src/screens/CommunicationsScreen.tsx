import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  MessageSquare,
  Mail,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  X,
  Send,
  Tag,
  User,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS } from '../config/constants';

interface Ticket {
  _id: string;
  id?: string;
  subject: string;
  status: 'open' | 'pending' | 'in_progress' | 'waiting_client' | 'closed';
  category?: string;
  created_at: string;
  updated_at?: string;
  last_message?: string;
  unread_count?: number;
}

interface Message {
  _id: string;
  id?: string;
  title: string;
  content: string;
  read: boolean;
  created_at: string;
  type?: string;
}

const TICKET_CATEGORIES = [
  { id: 'contabilita', label: 'Contabilità', icon: '📊' },
  { id: 'imposte', label: 'Imposte', icon: '💰' },
  { id: 'documenti', label: 'Documenti', icon: '📄' },
  { id: 'societa', label: 'Società', icon: '🏢' },
  { id: 'assistenza', label: 'Assistenza generale', icon: '❓' },
];

export const CommunicationsScreen: React.FC = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'messages' | 'tickets'>('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // New ticket modal
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicketCategory, setNewTicketCategory] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      const [ticketsData, notificationsData] = await Promise.all([
        apiService.getTickets().catch(() => []),
        apiService.getNotifications().catch(() => []),
      ]);
      
      setTickets(ticketsData);
      
      // Convert notifications to messages format
      const msgs = notificationsData.map((n: any) => ({
        _id: n._id || n.id,
        title: n.title,
        content: n.message,
        read: n.read,
        created_at: n.created_at,
        type: n.type,
      }));
      setMessages(msgs);
    } catch (error) {
      console.error('Error loading communications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const createTicket = async () => {
    // Validazione
    if (!newTicketCategory) {
      Alert.alert('Attenzione', 'Seleziona una categoria per il ticket.');
      return;
    }
    if (!newTicketSubject.trim()) {
      Alert.alert('Attenzione', 'Inserisci un oggetto per il ticket.');
      return;
    }
    if (!newTicketMessage.trim()) {
      Alert.alert('Attenzione', 'Inserisci un messaggio per il ticket.');
      return;
    }
    if (newTicketMessage.trim().length < 10) {
      Alert.alert('Attenzione', 'Il messaggio deve essere di almeno 10 caratteri.');
      return;
    }

    setCreating(true);
    try {
      const result = await apiService.createTicket({
        subject: newTicketSubject.trim(),
        message: newTicketMessage.trim(),
        category: newTicketCategory,
      });
      
      // Reset form
      setNewTicketSubject('');
      setNewTicketMessage('');
      setNewTicketCategory('');
      setShowNewTicket(false);
      
      // Ricarica i dati
      await loadData();
      
      // Feedback successo
      Alert.alert(
        'Ticket inviato! ✓',
        'Il tuo ticket è stato inviato con successo. Ti risponderemo il prima possibile.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      Alert.alert(
        'Errore',
        error?.message || 'Impossibile inviare il ticket. Riprova più tardi.',
        [{ text: 'Riprova' }]
      );
    } finally {
      setCreating(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bgColor: string; icon: any; text: string }> = {
      'open': { color: COLORS.info, bgColor: COLORS.info + '15', icon: Clock, text: 'Aperto' },
      'pending': { color: COLORS.warning, bgColor: COLORS.warning + '15', icon: Clock, text: 'In attesa' },
      'in_progress': { color: COLORS.primary, bgColor: COLORS.primary + '15', icon: AlertCircle, text: 'In lavorazione' },
      'waiting_client': { color: '#8b5cf6', bgColor: '#8b5cf6' + '15', icon: User, text: 'Attesa cliente' },
      'closed': { color: COLORS.success, bgColor: COLORS.success + '15', icon: CheckCircle, text: 'Chiuso' },
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
        return `${diffDays}g fa`;
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
        onPress={() => {
          // TODO: Implementare TicketDetailScreen
          Alert.alert('Ticket', `Ticket #${item._id || item.id}\n\n${item.subject}\n\nStato: ${statusConfig.text}`);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.ticketHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <StatusIcon size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>
          <Text style={styles.ticketDate}>{formatDate(item.updated_at || item.created_at)}</Text>
        </View>
        
        <Text style={styles.ticketSubject} numberOfLines={1}>{item.subject}</Text>
        
        {item.last_message && (
          <Text style={styles.ticketLastMessage} numberOfLines={2}>
            {item.last_message}
          </Text>
        )}
        
        <View style={styles.ticketFooter}>
          {item.category && (
            <View style={styles.categoryTag}>
              <Tag size={12} color={COLORS.textSecondary} />
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
          <ChevronRight size={20} color={COLORS.textLight} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <TouchableOpacity
      style={[styles.messageCard, !item.read && styles.messageUnread]}
      activeOpacity={0.7}
    >
      <View style={styles.messageIconContainer}>
        <Mail size={20} color={item.read ? COLORS.textSecondary : COLORS.primary} />
      </View>
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
          <Text style={[styles.messageTitle, !item.read && styles.messageTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.messageDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={styles.messagePreview} numberOfLines={2}>{item.content}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        {activeTab === 'tickets' ? (
          <MessageSquare size={48} color={COLORS.textLight} />
        ) : (
          <Mail size={48} color={COLORS.textLight} />
        )}
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'tickets' ? 'Nessun ticket' : 'Nessun messaggio'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'tickets'
          ? 'Non hai richieste di assistenza aperte'
          : 'Non hai messaggi dallo studio'}
      </Text>
      {activeTab === 'tickets' && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => setShowNewTicket(true)}
        >
          <Plus size={18} color="#ffffff" />
          <Text style={styles.emptyButtonText}>Apri un ticket</Text>
        </TouchableOpacity>
      )}
    </View>
  );

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
        <Text style={styles.headerTitle}>Comunicazioni</Text>
        {activeTab === 'tickets' && (
          <TouchableOpacity
            style={styles.newButton}
            onPress={() => setShowNewTicket(true)}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tickets' && styles.tabActive]}
          onPress={() => setActiveTab('tickets')}
        >
          <MessageSquare size={18} color={activeTab === 'tickets' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'tickets' && styles.tabTextActive]}>
            Ticket
          </Text>
          {tickets.filter(t => t.status !== 'closed').length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {tickets.filter(t => t.status !== 'closed').length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'messages' && styles.tabActive]}
          onPress={() => setActiveTab('messages')}
        >
          <Mail size={18} color={activeTab === 'messages' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'messages' && styles.tabTextActive]}>
            Messaggi
          </Text>
          {messages.filter(m => !m.read).length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {messages.filter(m => !m.read).length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={activeTab === 'tickets' ? tickets : messages as any[]}
        renderItem={activeTab === 'tickets' ? renderTicket as any : renderMessage as any}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* New Ticket Modal */}
      <Modal
        visible={showNewTicket}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewTicket(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowNewTicket(false)}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Nuovo Ticket</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Category Selection */}
              <Text style={styles.inputLabel}>Categoria</Text>
              <View style={styles.categoriesGrid}>
                {TICKET_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      newTicketCategory === cat.id && styles.categoryCardActive,
                    ]}
                    onPress={() => setNewTicketCategory(cat.id)}
                  >
                    <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                    <Text style={[
                      styles.categoryLabel,
                      newTicketCategory === cat.id && styles.categoryLabelActive,
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Subject */}
              <Text style={styles.inputLabel}>Oggetto</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Breve descrizione della richiesta"
                placeholderTextColor={COLORS.textLight}
                value={newTicketSubject}
                onChangeText={setNewTicketSubject}
                maxLength={100}
              />

              {/* Message */}
              <Text style={styles.inputLabel}>Messaggio</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Descrivi nel dettaglio la tua richiesta..."
                placeholderTextColor={COLORS.textLight}
                value={newTicketMessage}
                onChangeText={setNewTicketMessage}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!newTicketCategory || !newTicketSubject.trim() || !newTicketMessage.trim() || creating) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={createTicket}
                disabled={!newTicketCategory || !newTicketSubject.trim() || !newTicketMessage.trim() || creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Send size={18} color="#ffffff" />
                    <Text style={styles.submitButtonText}>Invia Ticket</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  newButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    gap: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primary + '15',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    padding: 24,
    paddingBottom: 100,
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ticketDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  ticketLastMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageUnread: {
    backgroundColor: COLORS.primary + '08',
    borderColor: COLORS.primary + '30',
  },
  messageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  messageTitleUnread: {
    fontWeight: '600',
  },
  messageDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  messagePreview: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 24,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
