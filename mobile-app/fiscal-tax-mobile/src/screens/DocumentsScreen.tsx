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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import {
  FileText,
  Upload,
  Folder,
  Image as ImageIcon,
  File,
  ChevronRight,
  Eye,
  Download,
  Plus,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';

interface Document {
  _id: string;
  id?: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  category?: string;
  created_at: string;
  preview_url?: string;
}

interface Category {
  _id: string;
  name: string;
  icon?: string;
  count?: number;
}

export const DocumentsScreen: React.FC = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadData();
    }
  }, [token]);

  const loadData = async () => {
    try {
      const [docs, cats] = await Promise.all([
        apiService.getDocuments(),
        apiService.getDocumentFolders().catch(() => []),
      ]);
      setDocuments(docs);
      setCategories(cats);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const uploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setUploading(true);
      const file = result.assets[0];
      
      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);

      // TODO: Implement actual upload API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert('Successo', 'Documento caricato con successo');
      await loadData();
    } catch (error) {
      console.error('Error uploading document:', error);
      Alert.alert('Errore', 'Impossibile caricare il documento');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.includes('image')) {
      return { icon: ImageIcon, color: '#8b5cf6' };
    } else if (fileType?.includes('pdf')) {
      return { icon: FileText, color: '#ef4444' };
    } else {
      return { icon: File, color: COLORS.textSecondary };
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  const renderDocument = ({ item }: { item: Document }) => {
    const { icon: FileIcon, color } = getFileIcon(item.file_type);
    const isImage = item.file_type?.includes('image');

    return (
      <TouchableOpacity
        style={styles.documentCard}
        onPress={() => {
          // TODO: Open document preview
          Alert.alert('Anteprima', `Apertura di ${item.file_name}`);
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.documentIcon, { backgroundColor: color + '15' }]}>
          {isImage && item.preview_url ? (
            <Image source={{ uri: item.preview_url }} style={styles.documentPreview} />
          ) : (
            <FileIcon size={28} color={color} />
          )}
        </View>
        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={1}>
            {item.file_name}
          </Text>
          <View style={styles.documentMeta}>
            <Text style={styles.documentDate}>{formatDate(item.created_at)}</Text>
            {item.file_size && (
              <>
                <Text style={styles.metaSeparator}>•</Text>
                <Text style={styles.documentSize}>{formatFileSize(item.file_size)}</Text>
              </>
            )}
          </View>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Folder size={12} color={COLORS.primary} />
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>
        <View style={styles.documentActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Eye size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => {
        // TODO: Filter by category
      }}
      activeOpacity={0.7}
    >
      <View style={styles.categoryIcon}>
        <Folder size={24} color={COLORS.primary} />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
      {item.count !== undefined && (
        <View style={styles.categoryCount}>
          <Text style={styles.categoryCountText}>{item.count}</Text>
        </View>
      )}
      <ChevronRight size={18} color={COLORS.textLight} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <FileText size={48} color={COLORS.textLight} />
      </View>
      <Text style={styles.emptyTitle}>Nessun documento</Text>
      <Text style={styles.emptyText}>
        Carica i tuoi documenti per condividerli con il commercialista
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={uploadDocument}>
        <Upload size={20} color="#ffffff" />
        <Text style={styles.emptyButtonText}>Carica documento</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Documenti</Text>
        </View>
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
        <View>
          <Text style={styles.headerTitle}>Documenti</Text>
          <Text style={styles.headerSubtitle}>
            {documents.length} document{documents.length !== 1 ? 'i' : 'o'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={uploadDocument}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Plus size={22} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Categories */}
      {categories.length > 0 && (
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Cartelle</Text>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>
      )}

      {/* Documents List */}
      <FlatList
        data={documents}
        renderItem={renderDocument}
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
        ListHeaderComponent={
          documents.length > 0 ? (
            <Text style={styles.sectionTitle}>Tutti i documenti</Text>
          ) : null
        }
      />

      {/* Upload FAB */}
      {documents.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={uploadDocument}
          disabled={uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Upload size={24} color="#ffffff" />
          )}
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  uploadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  uploadButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesSection: {
    paddingTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  categoriesList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
    ...SHADOWS.sm,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  categoryCount: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: SPACING.xs,
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  documentIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    overflow: 'hidden',
  },
  documentPreview: {
    width: '100%',
    height: '100%',
    borderRadius: RADIUS.md,
  },
  documentInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  documentDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  metaSeparator: {
    fontSize: 12,
    color: COLORS.textLight,
    marginHorizontal: 6,
  },
  documentSize: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  documentActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
});
