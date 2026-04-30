import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Mail,
  Clock,
  CheckCircle,
  ChevronRight,
  User,
  Bell,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS } from '../config/constants';
import { CardSkeleton } from '../components/UIStates';

interface Message {
  _id: string;
  id?: string;
  title: string;
  content: string;
  read: boolean;
  created_at: string;
  type?: string;
}

interface CommunicationThread {
  id: string;
  subject: string;
  type: string;
  status: string;
  messages: any[];
  created_at: string;
  updated_at: string;
  read_by_client: boolean;
  created_by_name?: string;
}

export const CommunicationsScreen: React.FC = () => {
  const { token } = useAuth();
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<CommunicationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      const [notificationsData, threadsData] = await Promise.all([
        apiService.getNotifications().catch(() => []),
        apiService.getCommunicationThreads().catch(() => []),
      ]);
      
      setThreads(threadsData || []);
      
      // Convert notifications to messages format
      const msgs = notificationsData.map((n: any) => ({
        _id: n._id || n.id,
        title: n.subject || n.title,
        content: n.body || n.message,
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return t.common.yesterday;
      } else if (diffDays < 7) {
        return `${diffDays} ${t.common.daysAgo}`;
      } else {
        return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
      }
    } catch {
      return '';
    }
  };

  const renderThread = ({ item }: { item: CommunicationThread }) => {
    const isUnread = !item.read_by_client;
    const lastMessage = item.messages && item.messages.length > 0 
      ? item.messages[item.messages.length - 1] 
      : null;

    return (
      <TouchableOpacity
        style={[styles.threadCard, isUnread && styles.unreadCard]}
        onPress={() => navigation.navigate('ThreadDetail', { threadId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.threadIcon}>
          <Mail size={24} color={isUnread ? COLORS.light.primary : COLORS.light.textSecondary} />
        </View>
        <View style={styles.threadContent}>
          <View style={styles.threadHeader}>
            <Text style={[styles.threadSubject, isUnread && styles.unreadText]} numberOfLines={1}>
              {item.subject}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          {lastMessage && (
            <Text style={styles.threadPreview} numberOfLines={2}>
              {lastMessage.content}
            </Text>
          )}
          <View style={styles.threadMeta}>
            <User size={12} color={COLORS.light.textSecondary} />
            <Text style={styles.threadMetaText}>
              {item.created_by_name || 'Studio'}
            </Text>
            <Clock size={12} color={COLORS.light.textSecondary} style={{ marginLeft: 12 }} />
            <Text style={styles.threadMetaText}>
              {formatDate(item.updated_at || item.created_at)}
            </Text>
          </View>
        </View>
        <ChevronRight size={20} color={COLORS.light.textSecondary} />
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    return (
      <TouchableOpacity
        style={[styles.messageCard, !item.read && styles.unreadCard]}
        activeOpacity={0.7}
      >
        <View style={styles.messageIcon}>
          <Bell size={20} color={!item.read ? COLORS.light.primary : COLORS.light.textSecondary} />
        </View>
        <View style={styles.messageContent}>
          <Text style={[styles.messageTitle, !item.read && styles.unreadText]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.messagePreview} numberOfLines={2}>
            {item.content}
          </Text>
          <Text style={styles.messageDate}>{formatDate(item.created_at)}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Mail size={64} color={COLORS.light.textSecondary} style={{ opacity: 0.5 }} />
      <Text style={styles.emptyTitle}>{t.notifications.noNotifications}</Text>
      <Text style={styles.emptySubtitle}>
        Le comunicazioni dallo studio appariranno qui
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.communications?.title || 'Comunicazioni'}</Text>
        </View>
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} style={{ marginBottom: 12 }} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  const allItems = [...threads, ...messages.filter(m => !threads.some(th => th.id === m._id))];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.communications?.title || 'Comunicazioni'}</Text>
        <Text style={styles.headerSubtitle}>
          {threads.filter(th => !th.read_by_client).length + messages.filter(m => !m.read).length} non lette
        </Text>
      </View>

      {threads.length === 0 && messages.length === 0 ? (
        renderEmpty()
      ) : (
        <>
          {/* Threads Section */}
          {threads.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Messaggi dallo Studio</Text>
              <FlatList
                data={threads}
                renderItem={renderThread}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.listContent}
              />
            </View>
          )}

          {/* Notifications Section */}
          {messages.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notifiche</Text>
              <FlatList
                data={messages}
                renderItem={renderMessage}
                keyExtractor={(item) => item._id}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                contentContainerStyle={styles.listContent}
              />
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.light.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.light.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.light.textSecondary,
    marginTop: 4,
  },
  loadingContainer: {
    padding: SPACING.lg,
  },
  section: {
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.light.text,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  unreadCard: {
    backgroundColor: '#f0fdf4',
    borderColor: COLORS.light.primary,
  },
  threadIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  threadSubject: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.light.text,
    flex: 1,
  },
  unreadText: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.light.primary,
    marginLeft: 8,
  },
  threadPreview: {
    fontSize: 14,
    color: COLORS.light.textSecondary,
    marginTop: 4,
  },
  threadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  threadMetaText: {
    fontSize: 12,
    color: COLORS.light.textSecondary,
    marginLeft: 4,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.light.border,
  },
  messageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  messageContent: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.light.text,
  },
  messagePreview: {
    fontSize: 13,
    color: COLORS.light.textSecondary,
    marginTop: 2,
  },
  messageDate: {
    fontSize: 12,
    color: COLORS.light.textSecondary,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.light.text,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.light.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});

export default CommunicationsScreen;
