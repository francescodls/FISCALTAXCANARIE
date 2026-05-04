import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
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
  Plus,
  Eye,
  AlertTriangle,
  FileCheck,
  XCircle,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';
import { ScreenHeader } from '../components/ScreenHeader';

interface DeclarationV2 {
  id: string;
  anno_fiscale: number;
  status: string;
  client_name: string;
  client_email: string;
  completion_percentage: number;
  is_signed: boolean;
  documents_count: number;
  messages_count: number;
  pending_integration_requests: number;
  created_at: string;
  updated_at: string;
  sections?: Record<string, any>;
}

// Configurazione stati V2
const STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: any; text: string }> = {
  'bozza': {
    color: '#eab308',
    bgColor: '#fef9c320',
    icon: Clock,
    text: 'Bozza',
  },
  'inviata': {
    color: '#3b82f6',
    bgColor: '#3b82f620',
    icon: Send,
    text: 'Inviata',
  },
  'documentazione_incompleta': {
    color: '#f97316',
    bgColor: '#f9731620',
    icon: AlertTriangle,
    text: 'Doc. Incompleta',
  },
  'in_revisione': {
    color: '#8b5cf6',
    bgColor: '#8b5cf620',
    icon: Eye,
    text: 'In Revisione',
  },
  'pronta': {
    color: '#10b981',
    bgColor: '#10b98120',
    icon: FileCheck,
    text: 'Pronta',
  },
  'presentata': {
    color: '#22c55e',
    bgColor: '#22c55e20',
    icon: CheckCircle,
    text: 'Presentata',
  },
  'rifiutata': {
    color: '#ef4444',
    bgColor: '#ef444420',
    icon: XCircle,
    text: 'Rifiutata',
  },
};

export const DeclarationsScreen: React.FC = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const [declarations, setDeclarations] = useState<DeclarationV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadDeclarations();
    }
  }, [token]);

  const loadDeclarations = async () => {
    try {
      const data = await apiService.getDeclarationsV2();
      setDeclarations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading declarations:', error);
      setDeclarations([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDeclarations();
    setRefreshing(false);
  }, []);

  const createNewDeclaration = async () => {
    const currentYear = new Date().getFullYear();
    
    Alert.alert(
      'Nuova Dichiarazione',
      `Vuoi creare una nuova dichiarazione per l'anno fiscale ${currentYear}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Crea',
          onPress: async () => {
            setCreating(true);
            try {
              const newDecl = await apiService.createDeclarationV2(currentYear);
              await loadDeclarations();
              // Naviga al wizard
              navigation.navigate('DeclarationWizard', { id: newDecl.id });
            } catch (error: any) {
              Alert.alert('Errore', error.message || 'Impossibile creare la dichiarazione');
            } finally {
              setCreating(false);
            }
          },
        },
      ]
    );
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG['bozza'];
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

  const renderDeclaration = ({ item }: { item: DeclarationV2 }) => {
    const statusConfig = getStatusConfig(item.status);
    const StatusIcon = statusConfig.icon;
    const canEdit = item.status === 'bozza' || item.status === 'documentazione_incompleta';

    return (
      <TouchableOpacity
        style={styles.declarationCard}
        onPress={() => navigation.navigate(canEdit ? 'DeclarationWizard' : 'DeclarationDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.typeIcon, { backgroundColor: COLORS.primary + '15' }]}>
            <Calendar size={24} color={COLORS.primary} />
          </View>
          <View style={styles.cardHeaderContent}>
            <Text style={styles.cardTitle}>Dichiarazione dei Redditi</Text>
            <Text style={styles.cardYear}>Anno fiscale {item.anno_fiscale}</Text>
          </View>
          <ChevronRight size={22} color={COLORS.textLight} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${item.completion_percentage}%`,
                  backgroundColor: item.completion_percentage >= 100 
                    ? COLORS.success 
                    : item.completion_percentage >= 50 
                      ? COLORS.primary 
                      : COLORS.warning
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{item.completion_percentage}%</Text>
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
            {formatDate(item.updated_at || item.created_at)}
          </Text>
        </View>

        {/* Badges info */}
        <View style={styles.badgesRow}>
          {item.documents_count > 0 && (
            <View style={styles.infoBadge}>
              <FileText size={12} color={COLORS.textSecondary} />
              <Text style={styles.infoBadgeText}>{item.documents_count} doc</Text>
            </View>
          )}
          {item.pending_integration_requests > 0 && (
            <View style={[styles.infoBadge, { backgroundColor: '#f9731620' }]}>
              <AlertTriangle size={12} color="#f97316" />
              <Text style={[styles.infoBadgeText, { color: '#f97316' }]}>
                {item.pending_integration_requests} richieste
              </Text>
            </View>
          )}
          {item.is_signed && (
            <View style={[styles.infoBadge, { backgroundColor: '#22c55e20' }]}>
              <CheckCircle size={12} color="#22c55e" />
              <Text style={[styles.infoBadgeText, { color: '#22c55e' }]}>Firmata</Text>
            </View>
          )}
        </View>
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
        Tocca il pulsante + per creare la tua prima dichiarazione dei redditi
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
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={createNewDeclaration}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Plus size={20} color="#ffffff" />
            )}
          </TouchableOpacity>
        }
      />

      <FlatList
        data={declarations}
        renderItem={renderDeclaration}
        keyExtractor={(item) => item.id}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    minWidth: 35,
    textAlign: 'right',
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
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  infoBadgeText: {
    fontSize: 11,
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
    paddingHorizontal: SPACING.xl,
  },
});
