import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  Send,
  FileText,
  Calendar,
  Clock,
  CheckCircle,
  MessageSquare,
  Paperclip,
  User,
  Home,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';

interface Message {
  id: string;
  sender: 'client' | 'admin';
  sender_name?: string;
  text: string;
  timestamp: string;
  attachments?: any[];
}

interface DeclarationDetail {
  _id: string;
  tipo: string;
  anno: number;
  stato: string;
  created_at: string;
  updated_at?: string;
  conversazione?: Message[];
  documenti?: any[];
}

export const DeclarationDetailScreen: React.FC = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { id } = route.params;
  
  const [declaration, setDeclaration] = useState<DeclarationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'chat' | 'docs'>('info');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (token && id) {
      apiService.setToken(token);
      loadDeclaration();
    }
  }, [token, id]);

  const loadDeclaration = async () => {
    try {
      const data = await apiService.getDeclarationDetails(id);
      setDeclaration(data as DeclarationDetail);
    } catch (error) {
      console.error('Error loading declaration:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDeclaration();
    setRefreshing(false);
  }, []);

  const sendMessage = async () => {
    if (!message.trim() || sending) return;
    
    setSending(true);
    try {
      await apiService.sendDeclarationMessage(id, message.trim());
      setMessage('');
      await loadDeclaration();
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bgColor: string; text: string }> = {
      'bozza': { color: COLORS.textLight, bgColor: COLORS.textLight + '20', text: 'Bozza' },
      'in_attesa': { color: COLORS.warning, bgColor: COLORS.warning + '20', text: 'In attesa documenti' },
      'in_lavorazione': { color: COLORS.info, bgColor: COLORS.info + '20', text: 'In lavorazione' },
      'completata': { color: COLORS.success, bgColor: COLORS.success + '20', text: 'Completata' },
      'inviata': { color: COLORS.success, bgColor: COLORS.success + '20', text: 'Inviata' },
    };
    return configs[status] || configs['bozza'];
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

  const formatTime = (dateString: string) => {
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

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('Main', { screen: 'HomeTab' });
    }
  };

  const handleGoHome = () => {
    (navigation as any).navigate('Main', { screen: 'HomeTab' });
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

  if (!declaration) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dichiarazione</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Dichiarazione non trovata</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(declaration.stato);
  const messages = declaration.conversazione || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {declaration.tipo?.toUpperCase() || 'Dichiarazione'} {declaration.anno}
          </Text>
          <View style={[styles.statusBadgeSmall, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusTextSmall, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleGoHome} style={styles.homeButton}>
          <Home size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.tabActive]}
          onPress={() => setActiveTab('info')}
        >
          <FileText size={18} color={activeTab === 'info' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'info' && styles.tabTextActive]}>Info</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chat' && styles.tabActive]}
          onPress={() => setActiveTab('chat')}
        >
          <MessageSquare size={18} color={activeTab === 'chat' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'chat' && styles.tabTextActive]}>Chat</Text>
          {messages.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{messages.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'docs' && styles.tabActive]}
          onPress={() => setActiveTab('docs')}
        >
          <Paperclip size={18} color={activeTab === 'docs' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'docs' && styles.tabTextActive]}>Documenti</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'info' && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {/* Status Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Stato Pratica</Text>
            <View style={[styles.statusBadgeLarge, { backgroundColor: statusConfig.bgColor }]}>
              <CheckCircle size={20} color={statusConfig.color} />
              <Text style={[styles.statusTextLarge, { color: statusConfig.color }]}>
                {statusConfig.text}
              </Text>
            </View>
          </View>

          {/* Details Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Dettagli</Text>
            <View style={styles.detailRow}>
              <Calendar size={18} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Anno fiscale:</Text>
              <Text style={styles.detailValue}>{declaration.anno}</Text>
            </View>
            <View style={styles.detailRow}>
              <FileText size={18} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Tipo:</Text>
              <Text style={styles.detailValue}>{declaration.tipo?.toUpperCase()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Clock size={18} color={COLORS.textSecondary} />
              <Text style={styles.detailLabel}>Creata il:</Text>
              <Text style={styles.detailValue}>{formatDate(declaration.created_at)}</Text>
            </View>
            {declaration.updated_at && (
              <View style={styles.detailRow}>
                <Clock size={18} color={COLORS.textSecondary} />
                <Text style={styles.detailLabel}>Aggiornata:</Text>
                <Text style={styles.detailValue}>{formatDate(declaration.updated_at)}</Text>
              </View>
            )}
          </View>

          {/* Help Card */}
          <View style={styles.helpCard}>
            <MessageSquare size={24} color={COLORS.primary} />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Hai domande?</Text>
              <Text style={styles.helpText}>
                Usa la sezione Chat per comunicare con il tuo commercialista
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      {activeTab === 'chat' && (
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyChat}>
                <MessageSquare size={48} color={COLORS.textLight} />
                <Text style={styles.emptyChatTitle}>Nessun messaggio</Text>
                <Text style={styles.emptyChatText}>
                  Inizia una conversazione con il tuo commercialista
                </Text>
              </View>
            ) : (
              messages.map((msg, index) => (
                <View
                  key={msg.id || index}
                  style={[
                    styles.messageBubble,
                    msg.sender === 'client' ? styles.messageBubbleClient : styles.messageBubbleAdmin,
                  ]}
                >
                  <View style={styles.messageHeader}>
                    <User size={14} color={msg.sender === 'client' ? '#ffffff' : COLORS.textSecondary} />
                    <Text
                      style={[
                        styles.messageSender,
                        msg.sender === 'client' ? styles.messageSenderClient : styles.messageSenderAdmin,
                      ]}
                    >
                      {msg.sender === 'client' ? 'Tu' : msg.sender_name || 'Commercialista'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.messageText,
                      msg.sender === 'client' ? styles.messageTextClient : styles.messageTextAdmin,
                    ]}
                  >
                    {msg.text}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      msg.sender === 'client' ? styles.messageTimeClient : styles.messageTimeAdmin,
                    ]}
                  >
                    {formatTime(msg.timestamp)}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Scrivi un messaggio..."
              placeholderTextColor={COLORS.textLight}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!message.trim() || sending) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!message.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Send size={20} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {activeTab === 'docs' && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          {(!declaration.documenti || declaration.documenti.length === 0) ? (
            <View style={styles.emptyDocs}>
              <Paperclip size={48} color={COLORS.textLight} />
              <Text style={styles.emptyDocsTitle}>Nessun documento</Text>
              <Text style={styles.emptyDocsText}>
                I documenti allegati a questa dichiarazione appariranno qui
              </Text>
            </View>
          ) : (
            declaration.documenti.map((doc, index) => (
              <TouchableOpacity key={doc.id || index} style={styles.documentItem}>
                <View style={styles.documentIcon}>
                  <FileText size={24} color={COLORS.primary} />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName}>{doc.nome || doc.file_name}</Text>
                  <Text style={styles.documentDate}>
                    Caricato il {formatDate(doc.uploaded_at || doc.created_at)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
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
  statusBadgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    marginTop: 4,
  },
  statusTextSmall: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
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
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    gap: 8,
  },
  statusTextLarge: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  helpContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  helpText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyChatText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
  },
  messageBubbleClient: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleAdmin: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    ...SHADOWS.sm,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageSenderClient: {
    color: 'rgba(255,255,255,0.8)',
  },
  messageSenderAdmin: {
    color: COLORS.textSecondary,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTextClient: {
    color: '#ffffff',
  },
  messageTextAdmin: {
    color: COLORS.text,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeClient: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageTimeAdmin: {
    color: COLORS.textLight,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  emptyDocs: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyDocsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyDocsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  documentDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
