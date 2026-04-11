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
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  FileText,
  File,
  Image as ImageIcon,
  Download,
  Share2,
  Eye,
  Filter,
  ChevronDown,
  X,
  Folder,
  Calendar,
  Grid,
  List,
  ChevronRight,
  FileSpreadsheet,
  FileType,
  Info,
} from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Document {
  _id: string;
  id?: string;
  file_name: string;
  file_type: string;
  file_size?: number;
  category?: string;
  folder_category?: string;
  year?: string;
  practice?: string;
  created_at: string;
  download_url?: string;
}

interface CategoryGroup {
  id: string;
  label: string;
  icon: any;
  count: number;
  color: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  'fiscali': { label: 'Documenti Fiscali', icon: FileText, color: '#ef4444' },
  'modelli': { label: 'Modelli', icon: FileType, color: '#8b5cf6' },
  'ricevute': { label: 'Ricevute', icon: FileSpreadsheet, color: '#10b981' },
  'societari': { label: 'Doc. Societari', icon: Folder, color: '#3b82f6' },
  'comunicazioni': { label: 'Comunicazioni', icon: File, color: '#f59e0b' },
  'contratti': { label: 'Contratti', icon: FileText, color: '#6366f1' },
  'altro': { label: 'Altri Documenti', icon: File, color: '#64748b' },
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://fiscaltax-tribute-models-docs.preview.emergentagent.com';

export const DocumentsScreen: React.FC = () => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'categories' | 'list'>('categories');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    const type = fileType?.toLowerCase() || '';
    if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
      return { icon: ImageIcon, color: '#8b5cf6' };
    } else if (type.includes('pdf')) {
      return { icon: FileText, color: '#ef4444' };
    } else if (type.includes('sheet') || type.includes('excel') || type.includes('xlsx') || type.includes('csv')) {
      return { icon: FileSpreadsheet, color: '#10b981' };
    } else if (type.includes('doc') || type.includes('word')) {
      return { icon: FileType, color: '#3b82f6' };
    }
    return { icon: File, color: COLORS.textSecondary };
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

  // Raggruppa documenti per categoria
  const getCategoryGroups = (): CategoryGroup[] => {
    const groups: Record<string, number> = {};
    
    documents.forEach(doc => {
      const cat = doc.folder_category || doc.category || 'altro';
      groups[cat] = (groups[cat] || 0) + 1;
    });

    return Object.entries(groups).map(([id, count]) => {
      const config = CATEGORY_CONFIG[id] || CATEGORY_CONFIG['altro'];
      return {
        id,
        label: config.label,
        icon: config.icon,
        count,
        color: config.color,
      };
    }).sort((a, b) => b.count - a.count);
  };

  // Filtra documenti
  const getFilteredDocuments = () => {
    return documents
      .filter(doc => {
        const matchesSearch = !searchQuery || 
          doc.file_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = !selectedCategory || 
          doc.folder_category === selectedCategory || 
          doc.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return a.file_name.localeCompare(b.file_name);
      });
  };

  // VISUALIZZA - Apre il documento in un browser/viewer
  const handlePreview = async (doc: Document) => {
    setActionLoading(doc._id + '-preview');
    try {
      const downloadUrl = doc.download_url || `${API_BASE_URL}/api/documents/${doc._id}/download`;
      
      // Usa WebBrowser per aprire PDF e altri documenti
      await WebBrowser.openBrowserAsync(downloadUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: COLORS.primary,
        toolbarColor: COLORS.surface,
      });
    } catch (error) {
      console.error('Preview error:', error);
      Alert.alert(
        'Errore',
        'Impossibile visualizzare il documento. Riprova più tardi.',
        [{ text: 'OK' }]
      );
    } finally {
      setActionLoading(null);
    }
  };

  // SCARICA - Scarica il file e lo salva/apre con opzioni iOS
  const handleDownload = async (doc: Document) => {
    setActionLoading(doc._id + '-download');
    try {
      const downloadUrl = doc.download_url || `${API_BASE_URL}/api/documents/${doc._id}/download`;
      
      // Usa la nuova API expo-file-system
      const destinationDir = Paths.document;
      const downloadedFile = await ExpoFile.downloadFileAsync(downloadUrl, destinationDir);

      // Su iOS, apriamo il foglio di condivisione che permette di salvare in Files
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadedFile.uri, {
          mimeType: doc.file_type || 'application/octet-stream',
          dialogTitle: 'Salva documento',
          UTI: getUTI(doc.file_type),
        });
      } else {
        Alert.alert(
          'Download completato',
          `Il documento "${doc.file_name}" è stato scaricato.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert(
        'Errore download',
        'Impossibile scaricare il documento. Verifica la connessione e riprova.',
        [{ text: 'OK' }]
      );
    } finally {
      setActionLoading(null);
    }
  };

  // CONDIVIDI - Usa il foglio di condivisione nativo iOS
  const handleShare = async (doc: Document) => {
    setActionLoading(doc._id + '-share');
    try {
      const downloadUrl = doc.download_url || `${API_BASE_URL}/api/documents/${doc._id}/download`;

      // Scarica il file temporaneamente
      const cacheDir = Paths.cache;
      const downloadedFile = await ExpoFile.downloadFileAsync(downloadUrl, cacheDir);

      // Verifica che la condivisione sia disponibile
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadedFile.uri, {
          mimeType: doc.file_type || 'application/octet-stream',
          dialogTitle: `Condividi ${doc.file_name}`,
          UTI: getUTI(doc.file_type),
        });
      } else {
        Alert.alert(
          'Condivisione non disponibile',
          'La condivisione non è disponibile su questo dispositivo.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert(
        'Errore condivisione',
        'Impossibile condividere il documento. Riprova più tardi.',
        [{ text: 'OK' }]
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Ottieni UTI per iOS
  const getUTI = (fileType?: string): string => {
    const type = fileType?.toLowerCase() || '';
    if (type.includes('pdf')) return 'com.adobe.pdf';
    if (type.includes('png')) return 'public.png';
    if (type.includes('jpg') || type.includes('jpeg')) return 'public.jpeg';
    if (type.includes('doc')) return 'com.microsoft.word.doc';
    if (type.includes('xls')) return 'com.microsoft.excel.xls';
    return 'public.data';
  };

  // Render Card Categoria
  const renderCategoryCard = (category: CategoryGroup) => {
    const IconComponent = category.icon;
    
    return (
      <TouchableOpacity
        key={category.id}
        style={styles.categoryCard}
        onPress={() => {
          setSelectedCategory(category.id);
          setViewMode('list');
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.categoryIconContainer, { backgroundColor: category.color + '15' }]}>
          <IconComponent size={28} color={category.color} />
        </View>
        <Text style={styles.categoryLabel} numberOfLines={2}>{category.label}</Text>
        <View style={[styles.categoryCountBadge, { backgroundColor: category.color }]}>
          <Text style={styles.categoryCountText}>{category.count}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render Card Documento
  const renderDocumentCard = ({ item }: { item: Document }) => {
    const { icon: FileIcon, color } = getFileIcon(item.file_type);
    const isLoading = actionLoading?.startsWith(item._id);

    return (
      <View style={styles.documentCard}>
        <TouchableOpacity
          style={styles.documentMain}
          onPress={() => handlePreview(item)}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <View style={[styles.documentIcon, { backgroundColor: color + '15' }]}>
            <FileIcon size={24} color={color} />
          </View>
          <View style={styles.documentInfo}>
            <Text style={styles.documentName} numberOfLines={2}>
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
          </View>
        </TouchableOpacity>
        
        <View style={styles.documentActions}>
          <TouchableOpacity
            style={[styles.actionButton, actionLoading === item._id + '-preview' && styles.actionButtonLoading]}
            onPress={() => handlePreview(item)}
            disabled={isLoading}
          >
            {actionLoading === item._id + '-preview' ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Eye size={18} color={COLORS.primary} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, actionLoading === item._id + '-download' && styles.actionButtonLoading]}
            onPress={() => handleDownload(item)}
            disabled={isLoading}
          >
            {actionLoading === item._id + '-download' ? (
              <ActivityIndicator size="small" color={COLORS.success} />
            ) : (
              <Download size={18} color={COLORS.success} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, actionLoading === item._id + '-share' && styles.actionButtonLoading]}
            onPress={() => handleShare(item)}
            disabled={isLoading}
          >
            {actionLoading === item._id + '-share' ? (
              <ActivityIndicator size="small" color={COLORS.warning} />
            ) : (
              <Share2 size={18} color={COLORS.warning} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render Vista Categorie
  const renderCategoriesView = () => {
    const categories = getCategoryGroups();
    
    if (categories.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Folder size={64} color={COLORS.textLight} />
          <Text style={styles.emptyStateTitle}>Nessun documento</Text>
          <Text style={styles.emptyStateText}>
            Non ci sono ancora documenti disponibili
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.categoriesGrid}>
        {categories.map(renderCategoryCard)}
      </View>
    );
  };

  // Render Vista Lista
  const renderListView = () => {
    const filteredDocs = getFilteredDocuments();

    return (
      <>
        {/* Header categoria selezionata */}
        {selectedCategory && (
          <View style={styles.selectedCategoryHeader}>
            <Text style={styles.selectedCategoryTitle}>
              {CATEGORY_CONFIG[selectedCategory]?.label || selectedCategory}
            </Text>
            <TouchableOpacity
              style={styles.clearCategoryButton}
              onPress={() => {
                setSelectedCategory(null);
                setViewMode('categories');
              }}
            >
              <X size={16} color={COLORS.textSecondary} />
              <Text style={styles.clearCategoryText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sort Options */}
        <View style={styles.sortBar}>
          <Text style={styles.resultsCount}>
            {filteredDocs.length} document{filteredDocs.length !== 1 ? 'i' : 'o'}
          </Text>
          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
              onPress={() => setSortBy('date')}
            >
              <Calendar size={14} color={sortBy === 'date' ? COLORS.primary : COLORS.textSecondary} />
              <Text style={[styles.sortButtonText, sortBy === 'date' && styles.sortButtonTextActive]}>
                Data
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === 'name' && styles.sortButtonActive]}
              onPress={() => setSortBy('name')}
            >
              <FileText size={14} color={sortBy === 'name' ? COLORS.primary : COLORS.textSecondary} />
              <Text style={[styles.sortButtonText, sortBy === 'name' && styles.sortButtonTextActive]}>
                Nome
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista Documenti */}
        {filteredDocs.length > 0 ? (
          <FlatList
            data={filteredDocs}
            renderItem={renderDocumentCard}
            keyExtractor={(item) => item._id || item.id || Math.random().toString()}
            contentContainerStyle={styles.documentsList}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Search size={48} color={COLORS.textLight} />
            <Text style={styles.emptyStateTitle}>Nessun risultato</Text>
            <Text style={styles.emptyStateText}>
              Nessun documento corrisponde alla ricerca
            </Text>
          </View>
        )}
      </>
    );
  };

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
        <Text style={styles.headerTitle}>Documenti</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'categories' && styles.toggleButtonActive]}
            onPress={() => {
              setViewMode('categories');
              setSelectedCategory(null);
            }}
          >
            <Grid size={18} color={viewMode === 'categories' ? '#fff' : COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <List size={18} color={viewMode === 'list' ? '#fff' : COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
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
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'categories' && !selectedCategory ? (
          <>
            {/* Stats Card */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{documents.length}</Text>
                <Text style={styles.statLabel}>Documenti totali</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{getCategoryGroups().length}</Text>
                <Text style={styles.statLabel}>Categorie</Text>
              </View>
            </View>

            {/* Categorie */}
            <Text style={styles.sectionTitle}>Sfoglia per categoria</Text>
            {renderCategoriesView()}

            {/* Documenti Recenti */}
            {documents.length > 0 && (
              <>
                <View style={styles.recentHeader}>
                  <Text style={styles.sectionTitle}>Documenti recenti</Text>
                  <TouchableOpacity onPress={() => setViewMode('list')}>
                    <Text style={styles.viewAllText}>Vedi tutti</Text>
                  </TouchableOpacity>
                </View>
                {documents.slice(0, 3).map(doc => (
                  <View key={doc._id}>
                    {renderDocumentCard({ item: doc })}
                  </View>
                ))}
              </>
            )}
          </>
        ) : (
          renderListView()
        )}

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Info size={16} color={COLORS.textSecondary} />
          <Text style={styles.infoBannerText}>
            I documenti sono caricati dal tuo commercialista
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
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
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Stats Card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  // Categories
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - SPACING.md * 2 - SPACING.sm * 2) / 3,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  categoryCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  // Recent Header
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Selected Category
  selectedCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  selectedCategoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  clearCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
  },
  clearCategoryText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  // Sort Bar
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resultsCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary + '15',
  },
  sortButtonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sortButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Document Card
  documentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  documentMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  documentDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  metaSeparator: {
    color: COLORS.textLight,
    marginHorizontal: 4,
  },
  documentSize: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  documentActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  actionButtonLoading: {
    backgroundColor: COLORS.background,
  },
  documentsList: {
    paddingBottom: SPACING.md,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  infoBannerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
