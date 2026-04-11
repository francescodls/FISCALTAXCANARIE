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
  Calendar,
  ChevronRight,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';
import { ScreenHeader } from '../components/ScreenHeader';

interface Declaration {
  _id: string;
  id?: string;
  tipo: string;
  anno: number;
  stato: string;
  created_at: string;
  updated_at?: string;
  documenti_allegati?: number;
}

export const DeclarationsScreen: React.FC = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadDeclarations();
    }
  }, [token]);

  const loadDeclarations = async () => {
    try {
      const data = await apiService.getDeclarations();
      setDeclarations(data);
    } catch (error) {
      console.error('Error loading declarations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDeclarations();
    setRefreshing(false);
  }, []);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bgColor: string; icon: any; text: string }> = {
      'bozza': {
        color: COLORS.textLight,
        bgColor: COLORS.textLight + '20',
        icon: FileText,
        text: 'Bozza',
      },
      'in_attesa': {
        color: COLORS.warning,
        bgColor: COLORS.warning + '20',
        icon: Clock,
        text: 'In attesa',
      },
      'in_lavorazione': {
        color: COLORS.info,
        bgColor: COLORS.info + '20',
        icon: Clock,
        text: 'In lavorazione',
      },
      'completata': {
        color: COLORS.success,
        bgColor: COLORS.success + '20',
        icon: CheckCircle,
        text: 'Completata',
      },
      'inviata': {
        color: COLORS.success,
        bgColor: COLORS.success + '20',
        icon: Send,
        text: 'Inviata',
      },
    };
    return configs[status] || configs['bozza'];
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      'irpf': 'IRPF - Imposta sul Reddito',
      'iva': 'IVA Trimestrale',
      'modelo_720': 'Modello 720',
      'modelo_347': 'Modello 347',
      'impuesto_sociedades': 'Imposta sulle Società',
    };
    return labels[tipo] || tipo?.toUpperCase() || 'Dichiarazione';
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const renderDeclaration = ({ item }: { item: Declaration }) => {
    const statusConfig = getStatusConfig(item.stato);
    const StatusIcon = statusConfig.icon;

    return (
      <TouchableOpacity
        style={styles.declarationCard}
        onPress={() => navigation.navigate('DeclarationDetail', { id: item._id || item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: COLORS.primary + '15' }]}>
            <Calendar size={24} color={COLORS.primary} />
          </View>
          <View style={styles.cardHeaderContent}>
            <Text style={styles.cardTitle}>{getTipoLabel(item.tipo)}</Text>
            <Text style={styles.cardYear}>Anno fiscale {item.anno}</Text>
          </View>
          <ChevronRight size={22} color={COLORS.textLight} />
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <StatusIcon size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.text}
            </Text>
          </View>
          <Text style={styles.dateText}>
            Aggiornato: {formatDate(item.updated_at || item.created_at)}
          </Text>
        </View>

        {item.documenti_allegati !== undefined && item.documenti_allegati > 0 && (
          <View style={styles.documentsInfo}>
            <FileText size={14} color={COLORS.textSecondary} />
            <Text style={styles.documentsText}>
              {item.documenti_allegati} document{item.documenti_allegati > 1 ? 'i' : 'o'} allegat{item.documenti_allegati > 1 ? 'i' : 'o'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Calendar size={48} color={COLORS.textLight} />
      </View>
      <Text style={styles.emptyTitle}>Nessuna dichiarazione</Text>
      <Text style={styles.emptyText}>
        Le tue dichiarazioni fiscali appariranno qui
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Dichiarazioni" showHomeButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader 
        title="Dichiarazioni" 
        showHomeButton
        rightComponent={
          <Text style={styles.headerSubtitle}>
            {declarations.length} dichiarazion{declarations.length !== 1 ? 'i' : 'e'}
          </Text>
        }
      />

      <FlatList
        data={declarations}
        renderItem={renderDeclaration}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  declarationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  cardHeaderContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardYear: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  documentsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  documentsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
  },
});
