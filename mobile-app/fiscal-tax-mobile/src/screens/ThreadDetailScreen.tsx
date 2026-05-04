import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft,
  Send,
  User,
  Building2,
  Clock,
  CheckCheck,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS } from '../config/constants';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  created_at: string;
}

interface Thread {
  id: string;
  subject: string;
  client_id: string;
  type: string;
  status: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
  read_by_client: boolean;
}

export const ThreadDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { user } = useAuth();
  const { t } = useLanguage();
  const params = route.params as { threadId: string };
  
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const loadThread = useCallback(async () => {
    try {
      const data = await apiService.getCommunicationThread(params.threadId);
      setThread(data as Thread);
    } catch (error) {
      console.error('Error loading thread:', error);
      Alert.alert('Errore', 'Impossibile caricare la conversazione');
    } finally {
      setLoading(false);
    }
  }, [params.threadId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  const handleSendReply = async () => {
    if (!replyText.trim() || sending) return;
    
    setSending(true);
    try {
      const updatedThread = await apiService.replyToThread(params.threadId, replyText.trim());
      setThread(updatedThread as Thread);
      setReplyText('');
      
      // Scroll to bottom after sending
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending reply:', error);
      Alert.alert('Errore', 'Impossibile inviare la risposta. Riprova.');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!thread) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Conversazione</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Conversazione non trovata</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{thread.subject}</Text>
          <Text style={styles.headerSubtitle}>
            {thread.type === 'admin_notification' ? 'Messaggio dallo studio' : 'Comunicazione'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Thread info */}
          <View style={styles.threadInfo}>
            <Clock size={14} color={COLORS.textSecondary} />
            <Text style={styles.threadInfoText}>
              Conversazione iniziata il {formatDate(thread.created_at)}
            </Text>
          </View>

          {/* Messages */}
          {thread.messages.map((message, index) => {
            const isFromAdmin = message.sender_role !== 'cliente';
            const showDate = index === 0 || 
              new Date(message.created_at).toDateString() !== 
              new Date(thread.messages[index - 1].created_at).toDateString();

            return (
              <View key={message.id}>
                {showDate && (
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateHeaderText}>
                      {new Date(message.created_at).toLocaleDateString('it-IT', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </Text>
                  </View>
                )}
                
                <View style={[
                  styles.messageBubble,
                  isFromAdmin ? styles.messageBubbleAdmin : styles.messageBubbleClient
                ]}>
                  {/* Sender info */}
                  <View style={styles.senderRow}>
                    <View style={[
                      styles.senderIcon,
                      { backgroundColor: isFromAdmin ? COLORS.primary + '15' : COLORS.info + '15' }
                    ]}>
                      {isFromAdmin ? (
                        <Building2 size={12} color={COLORS.primary} />
                      ) : (
                        <User size={12} color={COLORS.info} />
                      )}
                    </View>
                    <Text style={styles.senderName}>
                      {isFromAdmin ? 'Fiscal Tax Canarie' : message.sender_name}
                    </Text>
                  </View>
                  
                  {/* Message content */}
                  <Text style={[
                    styles.messageText,
                    isFromAdmin ? styles.messageTextAdmin : styles.messageTextClient
                  ]}>
                    {message.content}
                  </Text>
                  
                  {/* Time */}
                  <View style={styles.messageFooter}>
                    <Text style={styles.messageTime}>{formatTime(message.created_at)}</Text>
                    {!isFromAdmin && (
                      <CheckCheck size={14} color={COLORS.textLight} style={{ marginLeft: 4 }} />
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Reply input */}
        <View style={styles.replyContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.replyInput}
              placeholder="Scrivi una risposta..."
              placeholderTextColor={COLORS.textLight}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={2000}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!replyText.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={handleSendReply}
            disabled={!replyText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: SPACING.md,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  threadInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    gap: 6,
  },
  threadInfoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dateHeaderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: 'capitalize',
  },
  messageBubble: {
    maxWidth: '85%',
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  messageBubbleAdmin: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopLeftRadius: 4,
  },
  messageBubbleClient: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 4,
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  senderIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextAdmin: {
    color: COLORS.text,
  },
  messageTextClient: {
    color: '#ffffff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : 0,
    minHeight: 44,
    maxHeight: 120,
  },
  replyInput: {
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
});
