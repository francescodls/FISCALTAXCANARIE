import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  FileText,
  File,
  Image as ImageIcon,
  Download,
  Share,
  Eye,
  Filter,
  ChevronDown,
  X,
  Folder,
  Calendar,
  Clock,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS } from '../config/constants';

interface Document {
  _id: string;
  id?: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  category?: string;
  year?: string;
  practice?: string;
  created_at: string;
  download_url?: string;
}

const CATEGORIES = [
  { id: 'all', label: 'Tutti', icon: Folder },
  { id: 'fiscali', label: 'Fiscali', icon: FileText },
  { id: 'modelli', label: 'Modelli', icon: File },
  { id: 'ricevute', label: 'Ricevute', icon: FileText },
  { id: 'societa', label: 'Società', icon: Folder },
  { id: 'comunicazioni', label: 'Comunicazioni', icon: FileText },
];

export const DocumentsScreen: React.FC = () => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'category'>('date');

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadDocuments();
    }
  }, [token]);

  const loadDocuments = async () => {
    try {
      const data = await apiService.getDocuments();
      setDocuments(data);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDocuments();
    setRefreshing(false);
  }, []);

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

  const filteredDocuments = documents
    .filter(doc => {
      const matchesSearch = doc.file_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'name') {
        return a.file_name.localeCompare(b.file_name);
      }
      return 0;
    });

  const handlePreview = (doc: Document) => {
    Alert.alert(
      'Anteprima',
      `Visualizzazione di "${doc.file_name}"`,
      [
        { text: 'Chiudi', style: 'cancel' },
        { 
          text: 'Scarica', 
          onPress: () => handleDownload(doc),
        },
      ]
    );
  };

  const handleDownload = (doc: Document) => {
    if (doc.download_url) {
      Linking.openURL(doc.download_url);
    } else {
      Alert.alert('Download', `Download di "${doc.file_name}" avviato`);
    }
  };

  const handleShare = (doc: Document) => {
    Alert.alert('Condividi', `Condivisione di "${doc.file_name}"`);
  };

  const renderDocument = ({ item }: { item: Document }) => {
    const { icon: FileIcon, color } = getFileIcon(item.file_type);

    return (
      <View style={styles.documentCard}>
        <TouchableOpacity
          style={styles.documentMain}
          onPress={() => handlePreview(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.documentIcon, { backgroundColor: color + '15' }]}>
            <FileIcon size={24} color={color} />
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentName} numberOfLines={1}>
              {item.file_name}
            </Text>
            <View style={styles.documentMeta}>
              <Calendar size={12} color={COLORS.textLight} />
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
                <Text style={styles.categoryBadgeText}>{item.category}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <View style={styles.documentActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handlePreview(item)}
          >
            <Eye size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDownload(item)}
          >
            <Download size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleShare(item)}
          >
            <Share size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <FileText size={48} color={COLORS.textLight} />
      </View>
      <Text style={styles.emptyTitle}>Nessun documento</Text>
      <Text style={styles.emptyText}>
        {searchQuery
          ? 'Nessun documento corrisponde alla tua ricerca'
          : 'I documenti caricati dal tuo commercialista appariranno qui'}
      </Text>
      <Text style={styles.emptyHint}>
        Questa sezione è di sola consultazione
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
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
        <Text style={styles.headerTitle}>Documenti</Text>
        <Text style={styles.headerSubtitle}>
          {documents.length} document{documents.length !== 1 ? 'i' : 'o'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca documenti..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={showFilters ? '#ffffff' : COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersLabel}>Categoria</Text>
          <View style={styles.categoryFilters}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryFilter,
                  selectedCategory === cat.id && styles.categoryFilterActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryFilterText,
                    selectedCategory === cat.id && styles.categoryFilterTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filtersLabel, { marginTop: 16 }]}>Ordina per</Text>
          <View style={styles.sortOptions}>
            <TouchableOpacity
              style={[styles.sortOption, sortBy === 'date' && styles.sortOptionActive]}
              onPress={() => setSortBy('date')}
            >
              <Clock size={14} color={sortBy === 'date' ? COLORS.primary : COLORS.textSecondary} />
              <Text style={[styles.sortOptionText, sortBy === 'date' && styles.sortOptionTextActive]}>
                Data
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortOption, sortBy === 'name' && styles.sortOptionActive]}
              onPress={() => setSortBy('name')}
            >
              <FileText size={14} color={sortBy === 'name' ? COLORS.primary : COLORS.textSecondary} />
              <Text style={[styles.sortOptionText, sortBy === 'name' && styles.sortOptionTextActive]}>
                Nome
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Documents List */}
      <FlatList
        data={filteredDocuments}
        renderItem={renderDocument}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          📄 I documenti sono caricati dal tuo commercialista
        </Text>
      </View>
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
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fb',
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f8f9fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filtersContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filtersLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryFilter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fb',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryFilterActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  categoryFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  categoryFilterTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fb',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  sortOptionActive: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  sortOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  sortOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: 24,
    paddingBottom: 140,
  },
  documentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  documentMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  documentIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  documentDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 2,
  },
  metaSeparator: {
    fontSize: 12,
    color: COLORS.textLight,
    marginHorizontal: 4,
  },
  documentSize: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  documentActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f8f9fb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 32,
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  infoBanner: {
    position: 'absolute',
    bottom: 90,
    left: 24,
    right: 24,
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  infoBannerText: {
    fontSize: 13,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '500',
  },
});
