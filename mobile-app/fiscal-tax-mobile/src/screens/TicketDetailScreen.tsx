import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  Home,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  MessageSquare,
  Tag,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';

interface TicketMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  created_at: string;
}

interface TicketDetail {
  id: string;
  subject: string;
  client_id: string;
  client_name?: string;
  status: string;
  messages: TicketMessage[];
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

export const TicketDetailScreen: React.FC = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { ticketId } = route.params as { ticketId: string };
  
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadTicket();
    }
  }, [token, ticketId]);

  const loadTicket = async () => {
    try {
      const data = await apiService.getTicketDetails(ticketId);
      setTicket(data);
      // Scroll to bottom after loading
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 100);
    } catch (error) {
      console.error('Error loading ticket:', error);
      Alert.alert('Errore', 'Impossibile caricare il ticket.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTicket();
    setRefreshing(false);
  }, [ticketId]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !ticket) return;

    setSending(true);
    try {
      await apiService.sendTicketMessage(ticketId, newMessage.trim());
      setNewMessage('');
      await loadTicket();
      // Scroll to bottom
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Errore', 'Impossibile inviare il messaggio. Riprova.');
    } finally {
      setSending(false);
    }
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'Comunicazioni' });
    }
  };

  const handleGoHome = () => {
    navigation.navigate('Main', { screen: 'HomeTab' });
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bgColor: string; icon: any; text: string }> = {
      'aperto': { color: COLORS.primary, bgColor: COLORS.primary + '15', icon: Clock, text: 'Aperto' },
      'open': { color: COLORS.primary, bgColor: COLORS.primary + '15', icon: Clock, text: 'Aperto' },
      'in_lavorazione': { color: COLORS.warning, bgColor: COLORS.warning + '15', icon: AlertCircle, text: 'In lavorazione' },
      'in_progress': { color: COLORS.warning, bgColor: COLORS.warning + '15', icon: AlertCircle, text: 'In lavorazione' },
      'attesa_cliente': { color: '#8b5cf6', bgColor: '#8b5cf6' + '15', icon: User, text: 'Attesa risposta' },
      'waiting_client': { color: '#8b5cf6', bgColor: '#8b5cf6' + '15', icon: User, text: 'Attesa risposta' },
      'chiuso': { color: COLORS.success, bgColor: COLORS.success + '15', icon: CheckCircle, text: 'Chiuso' },
      'closed': { color: COLORS.success, bgColor: COLORS.success + '15', icon: CheckCircle, text: 'Chiuso' },
    };
    return configs[status] || configs['aperto'];
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const formatMessageDate = (dateString: string) => {
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

  const isMyMessage = (message: TicketMessage) => {
    return message.sender_id === user?.id || message.sender_role === 'cliente';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Caricamento...</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ticket non trovato</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <MessageSquare size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>Ticket non trovato</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(ticket.status);
  const StatusIcon = statusConfig.icon;
  const isClosed = ticket.status === 'chiuso' || ticket.status === 'closed';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>Ticket</Text>
        </View>
        <TouchableOpacity onPress={handleGoHome} style={styles.homeButton}>
          <Home size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Ticket Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <StatusIcon size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.text}</Text>
          </View>
          <Text style={styles.ticketDate}>{formatDate(ticket.created_at)}</Text>
        </View>
        <Text style={styles.ticketSubject}>{ticket.subject}</Text>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {ticket.messages.map((message, index) => {
            const isMine = isMyMessage(message);
            const showDate = index === 0 || 
              formatMessageDate(message.created_at) !== formatMessageDate(ticket.messages[index - 1].created_at);

            return (
              <View key={message.id}>
                {showDate && (
                  <View style={styles.dateSeparator}>
                    <Text style={styles.dateSeparatorText}>{formatMessageDate(message.created_at)}</Text>
                  </View>
                )}
                <View style={[styles.messageWrapper, isMine ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
                  {!isMine && (
                    <View style={styles.senderAvatar}>
                      <User size={16} color={COLORS.primary} />
                    </View>
                  )}
                  <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.otherMessage]}>
                    {!isMine && (
                      <Text style={styles.senderName}>{message.sender_name || 'Staff'}</Text>
                    )}
                    <Text style={[styles.messageText, isMine && styles.myMessageText]}>
                      {message.content}
                    </Text>
                    <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
                      {formatMessageTime(message.created_at)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Input Area */}
        {!isClosed ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Scrivi un messaggio..."
              placeholderTextColor={COLORS.textLight}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.closedBanner}>
            <CheckCircle size={18} color={COLORS.success} />
            <Text style={styles.closedText}>Questo ticket è stato chiuso</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  homeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.primary + '15',
    borderRadius: RADIUS.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  // Info Card
  infoCard: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ticketDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dateSeparatorText: {
    fontSize: 12,
    color: COLORS.textLight,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    maxWidth: '85%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  messageBubble: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    maxWidth: '100%',
  },
  myMessage: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  myMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  // Closed Banner
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.success + '10',
    borderTopWidth: 1,
    borderTopColor: COLORS.success + '30',
    gap: SPACING.xs,
  },
  closedText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '500',
  },
});
