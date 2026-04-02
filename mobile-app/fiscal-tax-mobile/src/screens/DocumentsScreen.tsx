import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Download, Eye, Folder, ChevronRight } from 'lucide-react-native';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Badge';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';
import * as Sharing from 'expo-sharing';

interface Document {
  id: string;
  file_name: string;
  folder_name?: string;
  uploaded_at: string;
  file_type?: string;
}

export const DocumentsScreen: React.FC = () => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadDocuments();
    }
  }, [token]);

  const loadDocuments = async () => {
    try {
      const docs = await apiService.getDocuments();
      setDocuments(docs);
      
      // Estrai cartelle uniche
      const uniqueFolders = [...new Set(docs.map((d: Document) => d.folder_name).filter(Boolean))];
      setFolders(uniqueFolders as string[]);
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

  const downloadDocument = async (doc: Document) => {
    try {
      Alert.alert('Info', `Il documento "${doc.file_name}" verrà aperto per la condivisione.`);
      // Implementazione semplificata - in produzione usare expo-file-system correttamente
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Errore', 'Impossibile scaricare il documento');
    }
  };

  const filteredDocuments = selectedFolder
    ? documents.filter((d) => d.folder_name === selectedFolder)
    : documents;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderFolder = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.folderItem, selectedFolder === item && styles.folderItemActive]}
      onPress={() => setSelectedFolder(selectedFolder === item ? null : item)}
    >
      <Folder
        size={20}
        color={selectedFolder === item ? COLORS.primary : COLORS.textSecondary}
      />
      <Text
        style={[
          styles.folderName,
          selectedFolder === item && styles.folderNameActive,
        ]}
        numberOfLines={1}
      >
        {item}
      </Text>
      {selectedFolder === item && (
        <Badge text={`${filteredDocuments.length}`} variant="outline" size="sm" />
      )}
    </TouchableOpacity>
  );

  const renderDocument = ({ item }: { item: Document }) => (
    <View style={styles.documentItem}>
      <View style={styles.documentIcon}>
        <FileText size={24} color={COLORS.primary} />
      </View>
      <View style={styles.documentInfo}>
        <Text style={styles.documentName} numberOfLines={2}>
          {item.file_name}
        </Text>
        <Text style={styles.documentDate}>{formatDate(item.uploaded_at)}</Text>
        {item.folder_name && !selectedFolder && (
          <Badge text={item.folder_name} size="sm" style={{ marginTop: 4 }} />
        )}
      </View>
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={() => downloadDocument(item)}
      >
        <Download size={20} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Documenti</Text>
        <Text style={styles.subtitle}>{documents.length} documenti</Text>
      </View>

      {/* Filtro Cartelle */}
      {folders.length > 0 && (
        <View style={styles.foldersContainer}>
          <FlatList
            data={folders}
            renderItem={renderFolder}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.foldersList}
          />
        </View>
      )}

      {/* Lista Documenti */}
      <FlatList
        data={filteredDocuments}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.documentsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FileText size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Nessun documento</Text>
          </View>
        }
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
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  foldersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  foldersList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
    gap: SPACING.xs,
    ...SHADOWS.sm,
  },
  folderItemActive: {
    backgroundColor: COLORS.primary + '15',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  folderName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    maxWidth: 120,
  },
  folderNameActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  documentsList: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
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
  documentDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
});
