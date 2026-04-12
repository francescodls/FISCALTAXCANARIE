import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { AlertCircle, RefreshCw, WifiOff, Clock, Inbox } from 'lucide-react-native';
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
        return <Inbox size={48} color={COLORS.textLight} />;
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
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
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
    {icon || <Inbox size={48} color={COLORS.textLight} />}
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
    {actionLabel && onAction && (
      <TouchableOpacity style={styles.actionButton} onPress={onAction} activeOpacity={0.8}>
        <Text style={styles.actionText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// Animated Skeleton component
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
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
};

// Card skeleton for lists
export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={styles.cardSkeleton}>
        <Skeleton width={50} height={50} borderRadius={12} />
        <View style={styles.cardSkeletonContent}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="50%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
    ))}
  </>
);

// Dashboard stat skeleton
export const StatSkeleton: React.FC = () => (
  <View style={styles.statSkeleton}>
    <Skeleton width={60} height={32} borderRadius={8} />
    <Skeleton width={80} height={14} style={{ marginTop: 6 }} />
  </View>
);

// Full page skeleton (for documents, deadlines, etc)
export const PageSkeleton: React.FC<{ hasHeader?: boolean }> = ({ hasHeader = true }) => (
  <View style={styles.pageSkeleton}>
    {hasHeader && (
      <View style={styles.pageSkeletonHeader}>
        <Skeleton width={150} height={24} borderRadius={8} />
        <Skeleton width={80} height={32} borderRadius={16} />
      </View>
    )}
    <View style={styles.pageSkeletonStats}>
      <StatSkeleton />
      <StatSkeleton />
      <StatSkeleton />
    </View>
    <CardSkeleton count={4} />
  </View>
);

// Document list skeleton
export const DocumentSkeleton: React.FC = () => (
  <View style={styles.documentSkeleton}>
    <Skeleton width={44} height={44} borderRadius={12} />
    <View style={styles.documentSkeletonContent}>
      <Skeleton width="80%" height={16} />
      <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
    </View>
    <Skeleton width={60} height={28} borderRadius={14} />
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
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
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
    paddingVertical: SPACING.sm + 2,
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
  statSkeleton: {
    alignItems: 'center',
    flex: 1,
  },
  pageSkeleton: {
    padding: SPACING.md,
  },
  pageSkeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  pageSkeletonStats: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  documentSkeleton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  documentSkeletonContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
});
