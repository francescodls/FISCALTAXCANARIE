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
  Bell,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS } from '../config/constants';

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
      
      setThreads(Array.isArray(threadsData) ? threadsData : []);
      
      // Combina notifiche e messaggi diretti
      const directMessages = Array.isArray(notificationsData) 
        ? notificationsData.filter((n: any) => n.type === 'direct_message' || n.type === 'admin_message')
        : [];
      setMessages(directMessages);
    } catch (error) {
      console.error('Error loading data:', error);
      setThreads([]);
      setMessages([]);
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
      const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffHours < 1) {
        const diffMins = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        return `${diffMins} ${t.common?.minutesAgo || 'min fa'}`;
      }
      if (diffHours < 24) {
        return `${diffHours} ${t.common?.hoursAgo || 'ore fa'}`;
      }
      return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    } catch {
      return dateString;
    }
  };

  const handleThreadPress = (thread: CommunicationThread) => {
    navigation.navigate('ThreadDetail', { thread });
  };

  const renderThread = ({ item }: { item: CommunicationThread }) => (
    <TouchableOpacity
      style={styles.threadCard}
      onPress={() => handleThreadPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.threadIconContainer}>
        <Mail size={20} color={item.read_by_client ? COLORS.textSecondary : COLORS.primary} />
      </View>
      <View style={styles.threadContent}>
        <View style={styles.threadHeader}>
          <Text style={[styles.threadSubject, !item.read_by_client && styles.unread]} numberOfLines={1}>
            {item.subject}
          </Text>
          {!item.read_by_client && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.threadPreview} numberOfLines={2}>
          {item.messages?.[item.messages.length - 1]?.content || 'Nessun messaggio'}
        </Text>
        <View style={styles.threadMeta}>
          <Clock size={12} color={COLORS.textSecondary} />
          <Text style={styles.threadDate}>{formatDate(item.updated_at || item.created_at)}</Text>
          {item.status === 'closed' && (
            <View style={styles.closedBadge}>
              <CheckCircle size={10} color={COLORS.success} />
              <Text style={styles.closedText}>Chiuso</Text>
            </View>
          )}
        </View>
      </View>
      <ChevronRight size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: Message }) => (
    <TouchableOpacity
      style={styles.messageCard}
      activeOpacity={0.7}
    >
      <View style={[styles.messageIconContainer, { backgroundColor: item.read ? COLORS.surfaceAlt : `${COLORS.primary}20` }]}>
        <Bell size={18} color={item.read ? COLORS.textSecondary : COLORS.primary} />
      </View>
      <View style={styles.messageContent}>
        <Text style={[styles.messageTitle, !item.read && styles.unread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.messagePreview} numberOfLines={2}>
          {item.content}
        </Text>
        <Text style={styles.messageDate}>{formatDate(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Comunicazioni</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const hasContent = threads.length > 0 || messages.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Comunicazioni</Text>
      </View>

      {!hasContent ? (
        <View style={styles.emptyContainer}>
          <Mail size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Nessuna comunicazione</Text>
          <Text style={styles.emptyText}>
            Le comunicazioni con il tuo commercialista appariranno qui
          </Text>
        </View>
      ) : (
        <FlatList
          data={[...threads, ...messages]}
          keyExtractor={(item: any) => item.id || item._id}
          renderItem={({ item }) => {
            if ('subject' in item) {
              return renderThread({ item: item as CommunicationThread });
            }
            return renderMessage({ item: item as Message });
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
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
    paddingHorizontal: SPACING.lg,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  threadIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  threadSubject: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  unread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: 8,
  },
  threadPreview: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  threadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  threadDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    backgroundColor: `${COLORS.success}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  closedText: {
    fontSize: 11,
    color: COLORS.success,
    marginLeft: 4,
    fontWeight: '500',
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  messageContent: {
    flex: 1,
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  messagePreview: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  messageDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  separator: {
    height: SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default CommunicationsScreen;
