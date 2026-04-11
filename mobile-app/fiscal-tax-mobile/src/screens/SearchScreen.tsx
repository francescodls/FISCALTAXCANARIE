import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  Search,
  FileText,
  MessageSquare,
  Send,
  X,
  Bot,
  Folder,
  Calendar,
  Sparkles,
  Clock,
  ChevronRight,
  AlertCircle,
  HelpCircle,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';

type TabType = 'search' | 'assistant';

interface SearchResult {
  id: string;
  title: string;
  category: string;
  file_name: string;
  created_at: string;
  folder_category?: string;
  score?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  "Cos'è l'IGIC alle Canarie?",
  "Quali sono le scadenze fiscali del trimestre?",
  "Come funziona il regime ZEC?",
  "Cosa devo fare per la dichiarazione IRPF?",
  "Spiegami il Modello 720",
];

const SEARCH_SUGGESTIONS = [
  "Fattura",
  "Modello 303",
  "IRPF",
  "Contratto",
  "Ricevuta",
];

export const SearchScreen: React.FC = () => {
  const { token, user } = useAuth();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabType>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const chatListRef = useRef<FlatList>(null);
  const searchInputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
    }
  }, [token]);

  useEffect(() => {
    // Anima il cambio tab
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [activeTab]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    Keyboard.dismiss();
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const results = await apiService.searchDocuments(searchQuery.trim());
      setSearchResults(results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isSending) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date(),
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsSending(true);
    Keyboard.dismiss();
    
    // Scroll to bottom
    setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    
    try {
      const response = await apiService.sendChatMessage(chatInput.trim(), conversationId || undefined);
      
      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Mi dispiace, si è verificato un errore. Riprova più tardi o contatta lo studio.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setChatInput(question);
    handleSendMessageWithText(question);
  };

  const handleSendMessageWithText = async (text: string) => {
    if (!text.trim() || isSending) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setIsSending(true);
    
    setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    
    try {
      const response = await apiService.sendChatMessage(text.trim(), conversationId || undefined);
      
      if (response.conversation_id) {
        setConversationId(response.conversation_id);
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };
      
      setChatMessages(prev => [...prev, assistantMessage]);
      setTimeout(() => chatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Mi dispiace, si è verificato un errore. Riprova più tardi.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSearchSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion);
    searchInputRef.current?.focus();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    searchInputRef.current?.focus();
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'HomeTab' });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity 
      style={styles.resultCard}
      onPress={() => navigation.navigate('Documenti')}
      activeOpacity={0.7}
    >
      <View style={styles.resultIcon}>
        <FileText size={24} color={COLORS.primary} />
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>{item.title || item.file_name}</Text>
        <View style={styles.resultMeta}>
          {item.folder_category && (
            <View style={styles.resultTag}>
              <Folder size={12} color={COLORS.textSecondary} />
              <Text style={styles.resultTagText}>{item.folder_category}</Text>
            </View>
          )}
          {item.created_at && (
            <View style={styles.resultTag}>
              <Calendar size={12} color={COLORS.textSecondary} />
              <Text style={styles.resultTagText}>{formatDate(item.created_at)}</Text>
            </View>
          )}
        </View>
      </View>
      <ChevronRight size={20} color={COLORS.textLight} />
    </TouchableOpacity>
  );

  const renderChatMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageContainer,
      item.role === 'user' ? styles.userMessageContainer : styles.assistantMessageContainer
    ]}>
      {item.role === 'assistant' && (
        <View style={styles.assistantAvatar}>
          <Bot size={16} color={COLORS.primary} />
        </View>
      )}
      <View style={[
        styles.messageBubble,
        item.role === 'user' ? styles.userBubble : styles.assistantBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.role === 'user' ? styles.userMessageText : styles.assistantMessageText
        ]}>
          {item.content}
        </Text>
      </View>
    </View>
  );

  const renderSearchTab = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      {/* Search Input */}
      <View style={styles.searchInputContainer}>
        <Search size={20} color={COLORS.textSecondary} />
        <TextInput
          ref={searchInputRef}
          style={styles.searchInput}
          placeholder="Cerca nei tuoi documenti..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
            <X size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Button */}
      <TouchableOpacity 
        style={[styles.searchButton, !searchQuery.trim() && styles.searchButtonDisabled]}
        onPress={handleSearch}
        disabled={!searchQuery.trim() || isSearching}
      >
        {isSearching ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Search size={18} color="#fff" />
            <Text style={styles.searchButtonText}>Cerca</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Results or Suggestions */}
      {hasSearched ? (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>
            {searchResults.length > 0 
              ? `${searchResults.length} risultat${searchResults.length === 1 ? 'o' : 'i'} trovati`
              : 'Nessun risultato'}
          </Text>
          
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.resultsList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.noResults}>
              <AlertCircle size={48} color={COLORS.textLight} />
              <Text style={styles.noResultsText}>Nessun documento trovato</Text>
              <Text style={styles.noResultsHint}>
                Prova a cercare con parole diverse o chiedi all'assistente AI
              </Text>
              <TouchableOpacity 
                style={styles.askAiButton}
                onPress={() => {
                  setActiveTab('assistant');
                  setChatInput(`Aiutami a trovare documenti riguardo: ${searchQuery}`);
                }}
              >
                <Sparkles size={16} color={COLORS.primary} />
                <Text style={styles.askAiButtonText}>Chiedi all'assistente</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Ricerche suggerite</Text>
          <View style={styles.suggestionTags}>
            {SEARCH_SUGGESTIONS.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionTag}
                onPress={() => handleSearchSuggestion(suggestion)}
              >
                <Clock size={14} color={COLORS.textSecondary} />
                <Text style={styles.suggestionTagText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.aiPromo}>
            <View style={styles.aiPromoIcon}>
              <Sparkles size={24} color={COLORS.primary} />
            </View>
            <View style={styles.aiPromoContent}>
              <Text style={styles.aiPromoTitle}>Assistente AI</Text>
              <Text style={styles.aiPromoText}>
                Fai domande in linguaggio naturale sui tuoi documenti e sulla fiscalità canaria
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.aiPromoButton}
              onPress={() => setActiveTab('assistant')}
            >
              <Text style={styles.aiPromoButtonText}>Prova</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );

  const renderAssistantTab = () => (
    <Animated.View style={[styles.tabContent, styles.assistantContent, { opacity: fadeAnim }]}>
      {chatMessages.length === 0 ? (
        <View style={styles.welcomeContainer}>
          <View style={styles.welcomeIcon}>
            <Bot size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.welcomeTitle}>Assistente Fiscal Tax</Text>
          <Text style={styles.welcomeText}>
            Sono il tuo assistente virtuale specializzato in fiscalità delle Canarie e spagnola. 
            Posso aiutarti con domande sui tuoi documenti, scadenze e adempimenti fiscali.
          </Text>
          
          <Text style={styles.quickQuestionsTitle}>Domande frequenti</Text>
          <View style={styles.quickQuestions}>
            {QUICK_QUESTIONS.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickQuestionButton}
                onPress={() => handleQuickQuestion(question)}
              >
                <HelpCircle size={16} color={COLORS.primary} />
                <Text style={styles.quickQuestionText}>{question}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          ref={chatListRef}
          data={chatMessages}
          renderItem={renderChatMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Chat Input */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Fai una domanda..."
            placeholderTextColor={COLORS.textLight}
            value={chatInput}
            onChangeText={setChatInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!chatInput.trim() || isSending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!chatInput.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.disclaimer}>
          Le risposte sono informative e non sostituiscono la consulenza professionale.
        </Text>
      </KeyboardAvoidingView>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ricerca</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.tabActive]}
          onPress={() => setActiveTab('search')}
        >
          <Search size={18} color={activeTab === 'search' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>
            Documenti
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assistant' && styles.tabActive]}
          onPress={() => setActiveTab('assistant')}
        >
          <Sparkles size={18} color={activeTab === 'assistant' ? COLORS.primary : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'assistant' && styles.tabTextActive]}>
            Assistente AI
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'search' ? renderSearchTab() : renderAssistantTab()}
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
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerRight: {
    width: 40,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    gap: SPACING.xs,
  },
  tabActive: {
    backgroundColor: COLORS.primary + '15',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabContent: {
    flex: 1,
    padding: SPACING.md,
  },
  assistantContent: {
    paddingBottom: 0,
  },
  // Search styles
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: SPACING.xs,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  searchButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resultsContainer: {
    flex: 1,
    marginTop: SPACING.lg,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  resultsList: {
    paddingBottom: SPACING.xl,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  resultIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  resultTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultTagText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  noResultsHint: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  askAiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  askAiButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  suggestionsContainer: {
    marginTop: SPACING.lg,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  suggestionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  suggestionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionTagText: {
    fontSize: 14,
    color: COLORS.text,
  },
  aiPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    marginTop: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  aiPromoIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  aiPromoContent: {
    flex: 1,
  },
  aiPromoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  aiPromoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  aiPromoButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  aiPromoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  // Assistant styles
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.xl,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  welcomeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  quickQuestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
    marginLeft: SPACING.sm,
  },
  quickQuestions: {
    width: '100%',
    gap: SPACING.sm,
  },
  quickQuestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickQuestionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  chatList: {
    paddingBottom: SPACING.md,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  assistantMessageContainer: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  assistantMessageText: {
    color: COLORS.text,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  chatInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 100,
    paddingVertical: SPACING.xs,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.textLight,
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
});
