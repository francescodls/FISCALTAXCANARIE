import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AlertCircle, RefreshCw, WifiOff, Clock } from 'lucide-react-native';
import { COLORS, SPACING, RADIUS } from '../config/constants';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  type?: 'error' | 'network' | 'timeout' | 'empty';
  title?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Si è verificato un errore',
  onRetry,
  type = 'error',
  title,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'network':
        return <WifiOff size={48} color={COLORS.error} />;
      case 'timeout':
        return <Clock size={48} color={COLORS.warning} />;
      case 'empty':
        return null;
      default:
        return <AlertCircle size={48} color={COLORS.error} />;
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'network':
        return 'Connessione assente';
      case 'timeout':
        return 'Tempo scaduto';
      case 'empty':
        return 'Nessun dato';
      default:
        return 'Ops! Qualcosa è andato storto';
    }
  };

  return (
    <View style={styles.container}>
      {getIcon()}
      <Text style={styles.title}>{getTitle()}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <RefreshCw size={18} color="#fff" />
          <Text style={styles.retryText}>Riprova</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Caricamento...',
  fullScreen = false,
}) => (
  <View style={[styles.container, fullScreen && styles.fullScreen]}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}) => (
  <View style={styles.container}>
    {icon}
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {actionLabel && onAction && (
      <TouchableOpacity style={styles.actionButton} onPress={onAction}>
        <Text style={styles.actionText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// Skeleton loading placeholder
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => (
  <View
    style={[
      styles.skeleton,
      { width, height, borderRadius },
      style,
    ]}
  />
);

// Card skeleton for lists
export const CardSkeleton: React.FC = () => (
  <View style={styles.cardSkeleton}>
    <Skeleton width={50} height={50} borderRadius={12} />
    <View style={styles.cardSkeletonContent}>
      <Skeleton width="70%" height={16} />
      <Skeleton width="50%" height={12} style={{ marginTop: 8 }} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    minHeight: 200,
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fb',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginTop: SPACING.lg,
    gap: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  actionButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.lg,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  skeleton: {
    backgroundColor: '#e2e8f0',
  },
  cardSkeleton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  cardSkeletonContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
});
