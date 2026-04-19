/**
 * Dichiarazione dei Redditi - Wizard Mobile V2
 * 14 Sezioni con Autosave, Firma Canvas, Upload Documenti e Haptic Feedback
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import SignatureScreen from 'react-native-signature-canvas';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Users,
  Briefcase,
  Building,
  Home,
  TrendingUp,
  PiggyBank,
  Bitcoin,
  Receipt,
  Gift,
  FileText,
  StickyNote,
  PenTool,
  Save,
  Camera,
  Image as ImageIcon,
  Upload,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Send,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../config/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Configurazione sezioni (come nel Web)
const SECTIONS = [
  { id: 'dati_personali', name: 'Dati Personali', icon: User, description: 'Informazioni anagrafiche' },
  { id: 'situazione_familiare', name: 'Famiglia', icon: Users, description: 'Stato civile e familiari' },
  { id: 'redditi_lavoro', name: 'Lavoro', icon: Briefcase, description: 'Stipendi, pensioni' },
  { id: 'redditi_autonomo', name: 'Autonomo', icon: Building, description: 'P.IVA, professioni' },
  { id: 'immobili', name: 'Immobili', icon: Home, description: 'Proprieta immobiliari' },
  { id: 'canoni_locazione', name: 'Affitti', icon: Receipt, description: 'Locazioni' },
  { id: 'plusvalenze', name: 'Plusvalenze', icon: TrendingUp, description: 'Guadagni vendite' },
  { id: 'investimenti_finanziari', name: 'Investimenti', icon: PiggyBank, description: 'Azioni, fondi' },
  { id: 'criptomonete', name: 'Crypto', icon: Bitcoin, description: 'Criptovalute' },
  { id: 'spese_deducibili', name: 'Spese', icon: Receipt, description: 'Deducibili/detraibili' },
  { id: 'deduzioni_agevolazioni', name: 'Bonus', icon: Gift, description: 'Agevolazioni fiscali' },
  { id: 'documenti_allegati', name: 'Documenti', icon: FileText, description: 'Allegati' },
  { id: 'note_aggiuntive', name: 'Note', icon: StickyNote, description: 'Info aggiuntive' },
  { id: 'autorizzazione_firma', name: 'Firma', icon: PenTool, description: 'Autorizzazione finale' },
];

interface DeclarationV2 {
  id: string;
  anno_fiscale: number;
  status: string;
  sections?: Record<string, any>;
  is_signed: boolean;
  completion_percentage: number;
  signature?: {
    accepted_terms: boolean;
    signature_image?: string;
    signed_at?: string;
  };
}

interface Document {
  id: string;
  filename: string;
  file_size: number;
  category: string;
  created_at: string;
}

export const DeclarationWizardScreen: React.FC = () => {
  const { token } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [declaration, setDeclaration] = useState<DeclarationV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSignature, setShowSignature] = useState(false);

  const signatureRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (token) {
      apiService.setToken(token);
      loadDeclaration();
    }
  }, [token]);

  const loadDeclaration = async () => {
    try {
      const data = await apiService.getDeclarationV2(id);
      setDeclaration(data);
      setFormData(data.sections || {});
      setAcceptedTerms(data.signature?.accepted_terms || false);
      // Carica documenti
      const docs = await apiService.getDeclarationDocuments(id);
      setDocuments(docs);
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile caricare la dichiarazione');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Salvataggio sezione con debounce
  const saveSection = useCallback(async (sectionId: string, sectionData: any) => {
    setSaving(true);
    try {
      const updated = await apiService.updateDeclarationSection(id, sectionId, sectionData);
      setDeclaration(updated);
    } catch (error) {
      console.error('Errore salvataggio:', error);
    } finally {
      setSaving(false);
    }
  }, [id]);

  // Aggiorna campo con auto-save
  const updateField = (sectionId: string, field: string, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          data: {
            ...(prev[sectionId]?.data || {}),
            [field]: value
          }
        }
      };

      // Debounce salvataggio (2 secondi per mobile)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveSection(sectionId, newData[sectionId]);
      }, 2000);

      return newData;
    });
  };

  // Segna come completato
  const markCompleted = (sectionId: string, completed: boolean) => {
    Haptics.impactAsync(completed ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    const sectionData = {
      ...formData[sectionId],
      completed
    };
    setFormData(prev => ({ ...prev, [sectionId]: sectionData }));
    saveSection(sectionId, sectionData);
  };

  // Navigazione
  const goNext = () => {
    if (currentStep < SECTIONS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCurrentStep(currentStep + 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(currentStep - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  // Cambio step diretto (dal tab indicator)
  const goToStep = (index: number) => {
    if (index !== currentStep) {
      Haptics.selectionAsync();
      setCurrentStep(index);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  // Upload da fotocamera
  const pickFromCamera = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Permesso negato', 'Devi concedere l\'accesso alla fotocamera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      uploadFile(result.assets[0]);
    }
  };

  // Upload da galleria
  const pickFromGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Permesso negato', 'Devi concedere l\'accesso alla galleria');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (!result.canceled) {
      for (const asset of result.assets) {
        await uploadFile(asset);
      }
    }
  };

  // Upload documento (PDF, etc.)
  const pickDocument = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          await uploadFile(asset);
        }
      }
    } catch (error) {
      console.error('Errore selezione documento:', error);
    }
  };

  // Upload file effettivo
  const uploadFile = async (asset: any) => {
    setUploading(true);
    try {
      const fileUri = asset.uri;
      const fileName = asset.name || asset.fileName || `documento_${Date.now()}.jpg`;
      const fileType = asset.mimeType || 'image/jpeg';

      // Crea oggetto file per FormData
      const file = {
        uri: fileUri,
        type: fileType,
        name: fileName,
      };

      await apiService.uploadDeclarationDocument(id, file, 'generale');
      
      // Ricarica documenti
      const docs = await apiService.getDeclarationDocuments(id);
      setDocuments(docs);
      await loadDeclaration();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Successo', 'Documento caricato');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', error.message || 'Errore durante il caricamento');
    } finally {
      setUploading(false);
    }
  };

  // Elimina documento
  const deleteDocument = async (docId: string, docName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Elimina documento',
      `Vuoi eliminare "${docName}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteDeclarationDocument(id, docId);
              const docs = await apiService.getDeclarationDocuments(id);
              setDocuments(docs);
              await loadDeclaration();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Errore', error.message);
            }
          },
        },
      ]
    );
  };

  // Gestione firma
  const handleSignature = (signature: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowSignature(false);
    saveSignature(signature);
  };

  const saveSignature = async (signatureImage: string) => {
    if (!acceptedTerms) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Attenzione', 'Devi accettare i termini e condizioni');
      return;
    }

    setSaving(true);
    try {
      const updated = await apiService.signDeclaration(id, signatureImage, true);
      setDeclaration(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Successo', 'Firma salvata con successo!');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Errore', error.message || 'Errore nel salvataggio della firma');
    } finally {
      setSaving(false);
    }
  };

  // Invia dichiarazione
  const submitDeclaration = async () => {
    if (!declaration?.is_signed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Attenzione', 'Devi firmare la dichiarazione prima di inviarla');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Conferma Invio',
      'Sei sicuro di voler inviare la dichiarazione? Non potrai piu modificarla.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Invia',
          onPress: async () => {
            setSubmitting(true);
            try {
              await apiService.submitDeclaration(id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Successo', 'Dichiarazione inviata con successo!', [
                { text: 'OK', onPress: () => navigation.navigate('Dichiarazioni') }
              ]);
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Errore', error.message || 'Errore durante l\'invio');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // Calcola progresso
  const getCompletedCount = () => {
    return SECTIONS.filter(s => {
      if (s.id === 'autorizzazione_firma') return false;
      const sd = formData[s.id] || {};
      return sd.completed;
    }).length;
  };

  // Render input testo
  const renderTextInput = (
    sectionId: string,
    field: string,
    label: string,
    placeholder: string,
    options: {
      multiline?: boolean;
      keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
      autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    } = {}
  ) => {
    const data = formData[sectionId]?.data || {};
    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TextInput
          style={[styles.textInput, options.multiline && styles.textInputMultiline]}
          value={data[field] || ''}
          onChangeText={(value) => updateField(sectionId, field, value)}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          multiline={options.multiline}
          keyboardType={options.keyboardType || 'default'}
          autoCapitalize={options.autoCapitalize || 'sentences'}
        />
      </View>
    );
  };

  // Render select
  const renderSelect = (
    sectionId: string,
    field: string,
    label: string,
    options: { value: string; label: string }[]
  ) => {
    const data = formData[sectionId]?.data || {};
    const currentValue = data[field] || '';

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View style={styles.selectContainer}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.selectOption,
                currentValue === opt.value && styles.selectOptionActive
              ]}
              onPress={() => updateField(sectionId, field, opt.value)}
            >
              <Text style={[
                styles.selectOptionText,
                currentValue === opt.value && styles.selectOptionTextActive
              ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Render sezione specifica
  const renderSectionContent = (section: typeof SECTIONS[0]) => {
    const sectionId = section.id;
    const sectionData = formData[sectionId] || {};
    const data = sectionData.data || {};
    const canEdit = declaration?.status === 'bozza' || declaration?.status === 'documentazione_incompleta';

    // Sezione documenti speciale
    if (sectionId === 'documenti_allegati') {
      return renderDocumentsSection(sectionData, canEdit);
    }

    // Sezione firma speciale
    if (sectionId === 'autorizzazione_firma') {
      return renderSignatureSection();
    }

    return (
      <View>
        {/* Campi specifici per sezione */}
        {renderSectionFields(sectionId, data)}

        {/* Pulsante completa */}
        <TouchableOpacity
          style={[
            styles.completeButton,
            sectionData.completed && styles.completeButtonActive
          ]}
          onPress={() => markCompleted(sectionId, !sectionData.completed)}
        >
          {sectionData.completed ? (
            <>
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.completeButtonTextActive}>Completata</Text>
            </>
          ) : (
            <>
              <Check size={18} color={COLORS.primary} />
              <Text style={styles.completeButtonText}>Segna come completata</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Render campi specifici per ogni sezione
  const renderSectionFields = (sectionId: string, data: any) => {
    switch (sectionId) {
      case 'dati_personali':
        return (
          <>
            {renderTextInput(sectionId, 'nome', 'Nome *', 'Il tuo nome')}
            {renderTextInput(sectionId, 'cognome', 'Cognome *', 'Il tuo cognome')}
            {renderTextInput(sectionId, 'codice_fiscale', 'Codice Fiscale / NIE *', 'Es. RSSMRA80A01H501Z', { autoCapitalize: 'characters' })}
            {renderTextInput(sectionId, 'data_nascita', 'Data di Nascita', 'GG/MM/AAAA')}
            {renderTextInput(sectionId, 'luogo_nascita', 'Luogo di Nascita', 'Citta')}
            {renderTextInput(sectionId, 'nazionalita', 'Nazionalita', 'Es. Italiana')}
            {renderTextInput(sectionId, 'indirizzo', 'Indirizzo di Residenza *', 'Via, numero, CAP, Citta')}
            {renderTextInput(sectionId, 'telefono', 'Telefono', '+34 612 345 678', { keyboardType: 'phone-pad' })}
            {renderTextInput(sectionId, 'email', 'Email *', 'email@esempio.com', { keyboardType: 'email-address', autoCapitalize: 'none' })}
          </>
        );

      case 'situazione_familiare':
        return (
          <>
            {renderSelect(sectionId, 'stato_civile', 'Stato Civile', [
              { value: 'celibe_nubile', label: 'Celibe/Nubile' },
              { value: 'coniugato', label: 'Coniugato/a' },
              { value: 'separato', label: 'Separato/a' },
              { value: 'divorziato', label: 'Divorziato/a' },
              { value: 'vedovo', label: 'Vedovo/a' },
            ])}
            {renderTextInput(sectionId, 'figli_carico', 'Numero Figli a Carico', '0', { keyboardType: 'numeric' })}
            {renderTextInput(sectionId, 'eta_figli', 'Eta Figli (se presenti)', 'Es: 5, 12, 18')}
            {renderSelect(sectionId, 'coniuge_carico', 'Coniuge a Carico', [
              { value: 'si', label: 'Si' },
              { value: 'no', label: 'No' },
            ])}
            {renderTextInput(sectionId, 'altri_familiari', 'Altri Familiari a Carico', 'Descrivi eventuali altri familiari', { multiline: true })}
          </>
        );

      case 'redditi_lavoro':
        return (
          <>
            {renderTextInput(sectionId, 'datore_lavoro', 'Datore di Lavoro / Ente', 'Nome azienda o ente')}
            {renderTextInput(sectionId, 'reddito_lordo', 'Reddito Lordo Annuo (EUR)', 'Es. 35000', { keyboardType: 'numeric' })}
            {renderTextInput(sectionId, 'ritenute', 'Ritenute Subite (EUR)', 'Es. 7000', { keyboardType: 'numeric' })}
            {renderSelect(sectionId, 'ha_cu', 'Hai la CU?', [
              { value: 'si', label: 'Si' },
              { value: 'no', label: 'No' },
            ])}
            {renderTextInput(sectionId, 'note', 'Note', 'Eventuali dettagli', { multiline: true })}
          </>
        );

      case 'redditi_autonomo':
        return (
          <>
            {renderSelect(sectionId, 'tipo_attivita', 'Tipologia Attivita', [
              { value: 'libero_professionista', label: 'Libero Professionista' },
              { value: 'impresa_individuale', label: 'Impresa Individuale' },
              { value: 'societa', label: 'Societa' },
              { value: 'occasionale', label: 'Prestazioni Occasionali' },
            ])}
            {renderTextInput(sectionId, 'partita_iva', 'Partita IVA', 'Es. IT12345678901', { autoCapitalize: 'characters' })}
            {renderTextInput(sectionId, 'fatturato', 'Fatturato Annuo (EUR)', 'Es. 50000', { keyboardType: 'numeric' })}
            {renderTextInput(sectionId, 'costi', 'Costi Deducibili (EUR)', 'Es. 15000', { keyboardType: 'numeric' })}
            {renderSelect(sectionId, 'regime_fiscale', 'Regime Fiscale', [
              { value: 'forfettario', label: 'Forfettario' },
              { value: 'ordinario', label: 'Ordinario' },
              { value: 'semplificato', label: 'Semplificato' },
            ])}
            {renderTextInput(sectionId, 'descrizione_attivita', 'Descrizione Attivita', 'Descrivi brevemente', { multiline: true })}
          </>
        );

      case 'immobili':
        return (
          <>
            {renderTextInput(sectionId, 'numero_immobili', 'Numero Immobili Posseduti', '0', { keyboardType: 'numeric' })}
            {renderTextInput(sectionId, 'tipologia_immobili', 'Tipologia Immobili', 'Es: Appartamento, Box auto', { multiline: true })}
            {renderTextInput(sectionId, 'valore_catastale', 'Valore Catastale Totale (EUR)', 'Es. 150000', { keyboardType: 'numeric' })}
            {renderSelect(sectionId, 'ubicazione', 'Ubicazione', [
              { value: 'italia', label: 'Solo Italia' },
              { value: 'estero', label: 'Solo Estero' },
              { value: 'entrambi', label: 'Italia e Estero' },
            ])}
            {renderTextInput(sectionId, 'note', 'Note', 'Mutui, ristrutturazioni, ecc.', { multiline: true })}
          </>
        );

      case 'canoni_locazione':
        return (
          <>
            {renderSelect(sectionId, 'affitti_percepiti', 'Hai percepito affitti?', [
              { value: 'si', label: 'Si' },
              { value: 'no', label: 'No' },
            ])}
            {data.affitti_percepiti === 'si' && (
              <>
                {renderTextInput(sectionId, 'totale_affitti_percepiti', 'Totale Affitti Percepiti (EUR/anno)', 'Es. 12000', { keyboardType: 'numeric' })}
              </>
            )}
            {renderSelect(sectionId, 'affitti_pagati', 'Hai pagato affitti?', [
              { value: 'si', label: 'Si' },
              { value: 'no', label: 'No' },
            ])}
            {data.affitti_pagati === 'si' && (
              renderTextInput(sectionId, 'totale_affitti_pagati', 'Totale Affitti Pagati (EUR/anno)', 'Es. 9600', { keyboardType: 'numeric' })
            )}
            {renderTextInput(sectionId, 'note', 'Note', 'Eventuali note', { multiline: true })}
          </>
        );

      case 'plusvalenze':
        return (
          <>
            {renderSelect(sectionId, 'ha_plusvalenze', 'Hai realizzato plusvalenze?', [
              { value: 'si', label: 'Si' },
              { value: 'no', label: 'No' },
            ])}
            {data.ha_plusvalenze === 'si' && (
              <>
                {renderSelect(sectionId, 'tipo_plusvalenza', 'Tipologia', [
                  { value: 'immobiliare', label: 'Vendita Immobili' },
                  { value: 'partecipazioni', label: 'Vendita Partecipazioni' },
                  { value: 'altro', label: 'Altro' },
                ])}
                {renderTextInput(sectionId, 'importo_plusvalenza', 'Importo (EUR)', 'Es. 25000', { keyboardType: 'numeric' })}
              </>
            )}
            {renderTextInput(sectionId, 'descrizione', 'Descrizione', 'Descrivi le operazioni', { multiline: true })}
          </>
        );

      case 'investimenti_finanziari':
        return (
          <>
            {renderSelect(sectionId, 'ha_investimenti', 'Possiedi Investimenti?', [
              { value: 'si', label: 'Si' },
              { value: 'no', label: 'No' },
            ])}
            {data.ha_investimenti === 'si' && (
              <>
                {renderTextInput(sectionId, 'tipologie', 'Tipologie', 'Es: Azioni, ETF, Fondi', { multiline: true })}
                {renderTextInput(sectionId, 'valore_portafoglio', 'Valore Totale (EUR)', 'Es. 50000', { keyboardType: 'numeric' })}
                {renderSelect(sectionId, 'ubicazione_investimenti', 'Ubicazione', [
                  { value: 'italia', label: 'Broker/Banca Italia' },
                  { value: 'estero', label: 'Broker/Banca Estero' },
                  { value: 'entrambi', label: 'Entrambi' },
                ])}
              </>
            )}
            {renderTextInput(sectionId, 'note', 'Note', 'Eventuali dettagli', { multiline: true })}
          </>
        );

      case 'criptomonete':
        return (
          <>
            <View style={styles.infoBox}>
              <AlertCircle size={18} color={COLORS.warning} />
              <Text style={styles.infoBoxText}>
                Le criptovalute sono soggette a monitoraggio fiscale
              </Text>
            </View>
            {renderSelect(sectionId, 'ha_cripto', 'Possiedi Criptovalute?', [
              { value: 'si', label: 'Si' },
              { value: 'no', label: 'No' },
            ])}
            {data.ha_cripto === 'si' && (
              <>
                {renderTextInput(sectionId, 'cripto_possedute', 'Criptovalute Possedute', 'Es: Bitcoin, Ethereum')}
                {renderTextInput(sectionId, 'valore_cripto', 'Valore al 31/12 (EUR)', 'Es. 10000', { keyboardType: 'numeric' })}
                {renderSelect(sectionId, 'ha_vendite_cripto', 'Hai effettuato vendite?', [
                  { value: 'si', label: 'Si' },
                  { value: 'no', label: 'No' },
                ])}
                {data.ha_vendite_cripto === 'si' && (
                  renderTextInput(sectionId, 'plusminus_cripto', 'Plus/Minusvalenze (EUR)', 'Es. 5000 o -2000', { keyboardType: 'numeric' })
                )}
                {renderTextInput(sectionId, 'exchange', 'Exchange/Wallet', 'Es: Binance, Coinbase')}
              </>
            )}
            {renderTextInput(sectionId, 'note', 'Note', 'Eventuali dettagli', { multiline: true })}
          </>
        );

      case 'spese_deducibili':
        return (
          <>
            <View style={styles.infoBox}>
              <CheckCircle size={18} color={COLORS.success} />
              <Text style={styles.infoBoxText}>
                Indica le spese che potrebbero essere deducibili
              </Text>
            </View>
            {renderTextInput(sectionId, 'spese_mediche', 'Spese Mediche (EUR)', '0', { keyboardType: 'numeric' })}
            {renderTextInput(sectionId, 'interessi_mutuo', 'Interessi Mutuo (EUR)', '0', { keyboardType: 'numeric' })}
            {renderTextInput(sectionId, 'assicurazioni', 'Assicurazioni (EUR)', '0', { keyboardType: 'numeric' })}
            {renderTextInput(sectionId, 'spese_istruzione', 'Spese Istruzione (EUR)', '0', { keyboardType: 'numeric' })}
            {renderTextInput(sectionId, 'contributi_previdenziali', 'Contributi Previdenziali (EUR)', '0', { keyboardType: 'numeric' })}
            {renderTextInput(sectionId, 'donazioni', 'Donazioni (EUR)', '0', { keyboardType: 'numeric' })}
            {renderTextInput(sectionId, 'altre_spese', 'Altre Spese Deducibili', 'Descrivi altre spese', { multiline: true })}
          </>
        );

      case 'deduzioni_agevolazioni':
        return (
          <>
            {renderTextInput(sectionId, 'bonus_utilizzati', 'Tipologie Bonus', 'Es: Ristrutturazione, Ecobonus', { multiline: true })}
            {renderTextInput(sectionId, 'importo_agevolazioni', 'Importo Totale (EUR)', 'Es. 10000', { keyboardType: 'numeric' })}
            {renderTextInput(sectionId, 'descrizione_agevolazioni', 'Descrizione', 'Descrivi le agevolazioni', { multiline: true })}
          </>
        );

      case 'note_aggiuntive':
        return (
          <>
            <View style={styles.infoBox}>
              <StickyNote size={18} color={COLORS.info} />
              <Text style={styles.infoBoxText}>
                Comunica informazioni aggiuntive al commercialista
              </Text>
            </View>
            {renderTextInput(sectionId, 'note', 'Note e Comunicazioni', 'Scrivi qui le tue note...', { multiline: true })}
            {renderTextInput(sectionId, 'domande', 'Domande per il Commercialista', 'Hai domande specifiche?', { multiline: true })}
          </>
        );

      default:
        return (
          <>
            {renderTextInput(sectionId, 'descrizione', 'Descrizione', 'Inserisci i dettagli', { multiline: true })}
            {renderTextInput(sectionId, 'importo', 'Importo (EUR)', '0', { keyboardType: 'numeric' })}
            {renderTextInput(sectionId, 'note', 'Note', 'Eventuali note', { multiline: true })}
          </>
        );
    }
  };

  // Sezione documenti
  const renderDocumentsSection = (sectionData: any, canEdit: boolean) => {
    return (
      <View>
        <View style={styles.infoBox}>
          <FileText size={18} color={COLORS.info} />
          <Text style={styles.infoBoxText}>
            Carica CU, fatture, ricevute, visure. PDF, JPG, PNG (max 10MB)
          </Text>
        </View>

        {/* Pulsanti upload */}
        {canEdit && (
          <View style={styles.uploadButtonsRow}>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickFromCamera}
              disabled={uploading}
            >
              <Camera size={24} color={COLORS.primary} />
              <Text style={styles.uploadButtonText}>Fotocamera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickFromGallery}
              disabled={uploading}
            >
              <ImageIcon size={24} color={COLORS.primary} />
              <Text style={styles.uploadButtonText}>Galleria</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={pickDocument}
              disabled={uploading}
            >
              <Upload size={24} color={COLORS.primary} />
              <Text style={styles.uploadButtonText}>File</Text>
            </TouchableOpacity>
          </View>
        )}

        {uploading && (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.uploadingText}>Caricamento in corso...</Text>
          </View>
        )}

        {/* Lista documenti */}
        {documents.length > 0 ? (
          <View style={styles.documentsList}>
            <Text style={styles.documentsListTitle}>
              Documenti caricati ({documents.length})
            </Text>
            {documents.map((doc) => (
              <View key={doc.id} style={styles.documentItem}>
                <View style={styles.documentIcon}>
                  <FileText size={20} color={COLORS.primary} />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>
                    {doc.filename}
                  </Text>
                  <Text style={styles.documentMeta}>
                    {(doc.file_size / 1024).toFixed(1)} KB
                  </Text>
                </View>
                {canEdit && (
                  <TouchableOpacity
                    style={styles.documentDeleteButton}
                    onPress={() => deleteDocument(doc.id, doc.filename)}
                  >
                    <Trash2 size={18} color={COLORS.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyDocuments}>
            <FileText size={40} color={COLORS.textLight} />
            <Text style={styles.emptyDocumentsText}>Nessun documento caricato</Text>
          </View>
        )}

        {renderTextInput('documenti_allegati', 'note', 'Note sui documenti', 'Descrivi i documenti caricati', { multiline: true })}

        <TouchableOpacity
          style={[
            styles.completeButton,
            sectionData.completed && styles.completeButtonActive
          ]}
          onPress={() => markCompleted('documenti_allegati', !sectionData.completed)}
        >
          {sectionData.completed ? (
            <>
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.completeButtonTextActive}>Completata</Text>
            </>
          ) : (
            <>
              <Check size={18} color={COLORS.primary} />
              <Text style={styles.completeButtonText}>Segna come completata</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Sezione firma
  const renderSignatureSection = () => {
    const completedCount = getCompletedCount();
    const totalSections = SECTIONS.length - 1;
    const canSign = completedCount >= Math.ceil(totalSections * 0.5);

    return (
      <View>
        {/* Riepilogo completamento */}
        <View style={[
          styles.signatureStatus,
          canSign ? styles.signatureStatusSuccess : styles.signatureStatusWarning
        ]}>
          {canSign ? (
            <CheckCircle size={20} color={COLORS.success} />
          ) : (
            <AlertCircle size={20} color={COLORS.warning} />
          )}
          <View style={styles.signatureStatusContent}>
            <Text style={styles.signatureStatusTitle}>
              {completedCount}/{totalSections} sezioni completate
            </Text>
            <Text style={styles.signatureStatusText}>
              {canSign 
                ? 'Puoi procedere con la firma'
                : 'Completa almeno il 50% delle sezioni'}
            </Text>
          </View>
        </View>

        {/* Termini e condizioni */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsTitle}>Autorizzazione al Trattamento Dati</Text>
          <ScrollView style={styles.termsScroll} nestedScrollEnabled>
            <Text style={styles.termsText}>
              Autorizzo Fiscal Tax Canarie S.L. al trattamento dei miei dati personali 
              ai fini della predisposizione e presentazione della dichiarazione dei redditi,
              in conformita al GDPR e alla normativa vigente.
              {'\n\n'}
              Dichiaro che le informazioni fornite sono veritiere e complete,
              e mi impegno a fornire eventuale documentazione integrativa su richiesta.
              {'\n\n'}
              Sono consapevole che la responsabilita delle informazioni dichiarate rimane in capo al sottoscritto.
            </Text>
          </ScrollView>
          
          <TouchableOpacity
            style={styles.acceptTermsRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAcceptedTerms(!acceptedTerms);
            }}
            disabled={!canSign || declaration?.is_signed}
          >
            <View style={[
              styles.checkbox,
              acceptedTerms && styles.checkboxChecked,
              (!canSign || declaration?.is_signed) && styles.checkboxDisabled
            ]}>
              {acceptedTerms && <Check size={14} color="#fff" />}
            </View>
            <Text style={styles.acceptTermsText}>Accetto i termini e le condizioni</Text>
          </TouchableOpacity>
        </View>

        {/* Area firma */}
        <View style={styles.signatureArea}>
          <Text style={styles.signatureAreaTitle}>Firma Autografa</Text>
          
          {declaration?.is_signed ? (
            <View style={styles.signedContainer}>
              <View style={styles.signedBadge}>
                <CheckCircle size={20} color={COLORS.success} />
                <Text style={styles.signedText}>Dichiarazione Firmata</Text>
              </View>
              {declaration.signature?.signature_image && (
                <View style={styles.signaturePreview}>
                  <Image
                    source={{ uri: declaration.signature.signature_image }}
                    style={styles.signatureImage}
                    resizeMode="contain"
                  />
                </View>
              )}
              <Text style={styles.signedDate}>
                Firmata il {new Date(declaration.signature?.signed_at || '').toLocaleDateString('it-IT')}
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.signatureInstructions}>
                {canSign 
                  ? 'Tocca per aprire il pannello firma'
                  : 'Completa le sezioni per abilitare la firma'}
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.openSignatureButton,
                  (!canSign || !acceptedTerms) && styles.openSignatureButtonDisabled
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowSignature(true);
                }}
                disabled={!canSign || !acceptedTerms}
              >
                <PenTool size={24} color={(!canSign || !acceptedTerms) ? COLORS.textLight : COLORS.primary} />
                <Text style={[
                  styles.openSignatureButtonText,
                  (!canSign || !acceptedTerms) && styles.openSignatureButtonTextDisabled
                ]}>
                  Apri Pannello Firma
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Pulsante Invia */}
        {declaration?.is_signed && declaration?.status === 'bozza' && (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={submitDeclaration}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Send size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Invia Dichiarazione</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentSection = SECTIONS[currentStep];
  const SectionIcon = currentSection.icon;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.goBack();
        }} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Dichiarazione {declaration?.anno_fiscale}</Text>
          <Text style={styles.headerSubtitle}>{declaration?.completion_percentage || 0}% completato</Text>
        </View>
        {saving && (
          <View style={styles.savingIndicator}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${((currentStep + 1) / SECTIONS.length) * 100}%` }
            ]}
          />
        </View>
        <Text style={styles.progressText}>{currentStep + 1}/{SECTIONS.length}</Text>
      </View>

      {/* Steps indicator */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.stepsContainer}
        contentContainerStyle={styles.stepsContent}
      >
        {SECTIONS.map((section, index) => {
          const Icon = section.icon;
          const sectionData = formData[section.id] || {};
          const isCompleted = sectionData.completed;
          const isCurrent = index === currentStep;

          return (
            <TouchableOpacity
              key={section.id}
              style={[
                styles.stepItem,
                isCurrent && styles.stepItemCurrent,
                isCompleted && styles.stepItemCompleted
              ]}
              onPress={() => goToStep(index)}
            >
              <Icon 
                size={18} 
                color={isCurrent ? COLORS.primary : isCompleted ? COLORS.success : COLORS.textLight} 
              />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <KeyboardAvoidingView 
        style={styles.contentContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          {/* Section header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <SectionIcon size={28} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>{currentSection.name}</Text>
              <Text style={styles.sectionDescription}>{currentSection.description}</Text>
            </View>
          </View>

          {/* Section content */}
          {renderSectionContent(currentSection)}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Navigation buttons */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
          onPress={goPrev}
          disabled={currentStep === 0}
        >
          <ArrowLeft size={20} color={currentStep === 0 ? COLORS.textLight : COLORS.text} />
          <Text style={[styles.navButtonText, currentStep === 0 && styles.navButtonTextDisabled]}>
            Indietro
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.navButtonPrimary,
            currentStep === SECTIONS.length - 1 && styles.navButtonDisabled
          ]}
          onPress={goNext}
          disabled={currentStep === SECTIONS.length - 1}
        >
          <Text style={[
            styles.navButtonText,
            styles.navButtonTextPrimary,
            currentStep === SECTIONS.length - 1 && styles.navButtonTextDisabled
          ]}>
            Avanti
          </Text>
          <ArrowRight size={20} color={currentStep === SECTIONS.length - 1 ? COLORS.textLight : '#fff'} />
        </TouchableOpacity>
      </View>

      {/* Signature Modal */}
      {showSignature && (
        <View style={styles.signatureModal}>
          <View style={styles.signatureModalHeader}>
            <Text style={styles.signatureModalTitle}>Firma qui sotto</Text>
            <TouchableOpacity onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSignature(false);
            }}>
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.signatureCanvasContainer}>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleSignature}
              onEmpty={() => Alert.alert('Attenzione', 'Per favore, inserisci la tua firma')}
              descriptionText=""
              clearText="Cancella"
              confirmText="Conferma"
              webStyle={`
                .m-signature-pad { box-shadow: none; border: none; }
                .m-signature-pad--body { border: 2px solid ${COLORS.border}; border-radius: 12px; }
                .m-signature-pad--footer { display: flex; justify-content: space-around; padding: 10px; }
                .m-signature-pad--footer .button { 
                  background-color: ${COLORS.primary}; 
                  color: white; 
                  border: none; 
                  padding: 12px 24px; 
                  border-radius: 8px; 
                  font-weight: 600;
                }
                .m-signature-pad--footer .button.clear { 
                  background-color: ${COLORS.textLight}; 
                }
              `}
              style={styles.signatureCanvas}
            />
          </View>
        </View>
      )}
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
  loadingText: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  savingIndicator: {
    padding: SPACING.xs,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginRight: SPACING.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    minWidth: 40,
  },
  stepsContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stepsContent: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  stepItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stepItemCurrent: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  stepItemCompleted: {
    backgroundColor: COLORS.success + '20',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
    ...SHADOWS.sm,
  },
  textInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  selectOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  selectOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  selectOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.info + '15',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginTop: SPACING.lg,
    gap: SPACING.xs,
  },
  completeButtonActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  completeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  completeButtonTextActive: {
    color: '#fff',
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  uploadButton: {
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 90,
    ...SHADOWS.sm,
  },
  uploadButtonText: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  uploadingText: {
    color: COLORS.textSecondary,
  },
  documentsList: {
    marginTop: SPACING.md,
  },
  documentsListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
    ...SHADOWS.sm,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  documentMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  documentDeleteButton: {
    padding: SPACING.xs,
  },
  emptyDocuments: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyDocumentsText: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
  },
  signatureStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  signatureStatusSuccess: {
    backgroundColor: COLORS.success + '15',
  },
  signatureStatusWarning: {
    backgroundColor: COLORS.warning + '15',
  },
  signatureStatusContent: {
    flex: 1,
  },
  signatureStatusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  signatureStatusText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  termsContainer: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  termsScroll: {
    maxHeight: 120,
    marginBottom: SPACING.sm,
  },
  termsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  acceptTermsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  acceptTermsText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  signatureArea: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  signatureAreaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  signatureInstructions: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  openSignatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: SPACING.sm,
  },
  openSignatureButtonDisabled: {
    borderColor: COLORS.textLight,
  },
  openSignatureButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  openSignatureButtonTextDisabled: {
    color: COLORS.textLight,
  },
  signedContainer: {
    alignItems: 'center',
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  signedText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  signaturePreview: {
    width: '100%',
    height: 100,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  signatureImage: {
    width: '100%',
    height: '100%',
  },
  signedDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    gap: SPACING.xs,
  },
  navButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  navButtonTextPrimary: {
    color: '#fff',
  },
  navButtonTextDisabled: {
    color: COLORS.textLight,
  },
  signatureModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    zIndex: 100,
  },
  signatureModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  signatureModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  signatureCanvasContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  signatureCanvas: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
