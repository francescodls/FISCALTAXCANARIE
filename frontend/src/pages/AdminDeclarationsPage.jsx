/**
 * Dichiarazioni dei Redditi - Dashboard Admin Completa
 * Gestione pratiche, stati, messaggi, cronologia
 * Versione 2.1 - Con Error Boundary e gestione errori migliorata
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search,
  Filter,
  FileText,
  User,
  Calendar,
  ChevronRight,
  ChevronDown,
  Eye,
  Download,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
  Send,
  Building,
  Phone,
  Mail,
  Hash,
  ArrowUpDown,
  SlidersHorizontal,
  Paperclip,
  History,
  AlertTriangle,
  Check,
  XCircle,
  FileCheck,
  MoreVertical,
  Upload,
  Trash2,
  FileArchive,
  Image,
  Loader2,
  WifiOff,
  ArrowLeft,
  Home,
  Square,
  CheckSquare,
  MinusSquare
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';

// Import componenti modulari
import { 
  DeclarationErrorBoundary,
  AdminDashboardSkeleton,
  DeclarationDetailSkeleton
} from '@/components/declarations';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Costanti per retry
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Configurazione stati con colori
const STATUS_CONFIG = {
  bozza: { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
    label: 'Bozza',
    icon: Clock,
    description: 'Il cliente sta ancora compilando'
  },
  inviata: { 
    color: 'bg-blue-100 text-blue-800 border-blue-300', 
    label: 'Inviata',
    icon: Send,
    description: 'In attesa di revisione'
  },
  documentazione_incompleta: { 
    color: 'bg-orange-100 text-orange-800 border-orange-300', 
    label: 'Doc. Incompleta',
    icon: AlertTriangle,
    description: 'Richiesta integrazione documenti'
  },
  in_revisione: { 
    color: 'bg-purple-100 text-purple-800 border-purple-300', 
    label: 'In Revisione',
    icon: Eye,
    description: 'In fase di elaborazione'
  },
  pronta: { 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300', 
    label: 'Pronta',
    icon: FileCheck,
    description: 'Pronta per la presentazione'
  },
  presentata: { 
    color: 'bg-green-100 text-green-800 border-green-300', 
    label: 'Presentata',
    icon: CheckCircle,
    description: 'Dichiarazione presentata'
  },
  rifiutata: { 
    color: 'bg-red-100 text-red-800 border-red-300', 
    label: 'Rifiutata',
    icon: XCircle,
    description: 'Non corretta / Rifiutata'
  },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'bozza', label: 'Bozza' },
  { value: 'inviata', label: 'Inviata' },
  { value: 'documentazione_incompleta', label: 'Doc. Incompleta' },
  { value: 'in_revisione', label: 'In Revisione' },
  { value: 'pronta', label: 'Pronta' },
  { value: 'presentata', label: 'Presentata' },
  { value: 'rifiutata', label: 'Rifiutata' },
];

// Nomi sezioni per visualizzazione
const SECTION_NAMES = {
  dati_personali: 'Dati Personali',
  situazione_familiare: 'Situazione Familiare',
  redditi_lavoro: 'Redditi da Lavoro',
  redditi_autonomo: 'Redditi Autonomo',
  immobili: 'Immobili',
  canoni_locazione: 'Canoni Locazione',
  plusvalenze: 'Plusvalenze',
  investimenti_finanziari: 'Investimenti',
  criptomonete: 'Criptomonete',
  spese_deducibili: 'Spese Deducibili',
  deduzioni_agevolazioni: 'Deduzioni',
  documenti_allegati: 'Documenti',
  note_aggiuntive: 'Note',
  autorizzazione_firma: 'Firma'
};

const AdminDeclarationsPage = ({ token }) => {
  // State
  const [declarations, setDeclarations] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_status: {}, new_submissions: 0, pending_review: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [newMessage, setNewMessage] = useState('');
  const [isIntegrationRequest, setIsIntegrationRequest] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [loadError, setLoadError] = useState(null);
  
  // State per selezione multipla e eliminazione
  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingIds, setDeletingIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'single' | 'multiple', ids: [] }

  // Monitora stato connessione
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch con retry
  const fetchWithRetry = useCallback(async (url, options = {}, retries = MAX_RETRIES) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, options);
        return res;
      } catch (error) {
        if (attempt === retries) throw error;
        await new Promise(r => setTimeout(r, RETRY_DELAY * (attempt + 1)));
      }
    }
  }, []);

  // Fetch dichiarazioni
  const fetchDeclarations = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (yearFilter) params.append('anno', yearFilter);

      const res = await fetchWithRetry(`${API_URL}/api/declarations/v2/admin/declarations?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeclarations(data);
      } else {
        throw new Error('Errore risposta server');
      }
    } catch (error) {
      console.error('Errore caricamento:', error);
      setLoadError(isOffline ? 'Sei offline' : 'Errore di connessione');
      if (!isOffline) {
        toast.error('Errore nel caricamento. Riprovo...');
      }
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, yearFilter, fetchWithRetry, isOffline]);

  // Fetch statistiche
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithRetry(`${API_URL}/api/declarations/v2/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Errore stats:', error);
    }
  }, [token, fetchWithRetry]);

  useEffect(() => {
    fetchDeclarations();
    fetchStats();
  }, [fetchDeclarations, fetchStats]);

  // Aggiorna stato con notifica
  const updateStatus = async (declId, newStatus) => {
    setUpdatingStatus(true);
    try {
      // Usa endpoint con notifica
      const res = await fetchWithRetry(`${API_URL}/api/declarations/v2/admin/declarations/${declId}/status-notify`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ new_status: newStatus, note: statusNote || null })
      });
      if (res.ok) {
        const updated = await res.json();
        toast.success(`Stato aggiornato a "${STATUS_CONFIG[newStatus]?.label}" - Notifica inviata al cliente`);
        setStatusNote('');
        fetchDeclarations();
        fetchStats();
        if (selectedDeclaration?.id === declId) {
          setSelectedDeclaration(updated);
        }
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Errore aggiornamento stato');
      }
    } catch (error) {
      toast.error('Errore di connessione');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Invia messaggio
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedDeclaration) return;
    
    setSendingMessage(true);
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/declarations/${selectedDeclaration.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage,
          is_integration_request: isIntegrationRequest
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedDeclaration(updated);
        setNewMessage('');
        setIsIntegrationRequest(false);
        toast.success(isIntegrationRequest ? 'Richiesta integrazione inviata' : 'Messaggio inviato');
        fetchDeclarations();
      }
    } catch (error) {
      toast.error('Errore invio messaggio');
    } finally {
      setSendingMessage(false);
    }
  };

  // Apri dettaglio
  const openDetail = async (declId) => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/declarations/${declId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Fetch anche i messaggi
        const msgRes = await fetch(`${API_URL}/api/declarations/v2/declarations/${declId}/messages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (msgRes.ok) {
          data.messages = await msgRes.json();
        }
        setSelectedDeclaration(data);
        setDetailTab('overview');
      }
    } catch (error) {
      toast.error('Errore caricamento dettaglio');
    }
  };

  // Toggle selezione singola dichiarazione
  const toggleSelectDeclaration = (declId) => {
    setSelectedIds(prev => 
      prev.includes(declId) 
        ? prev.filter(id => id !== declId)
        : [...prev, declId]
    );
  };

  // Seleziona/deseleziona tutte le dichiarazioni filtrate
  const toggleSelectAll = () => {
    const filteredIds = filteredDeclarations.map(d => d.id);
    const allSelected = filteredIds.every(id => selectedIds.includes(id));
    
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  // Conferma eliminazione
  const confirmDelete = (type, ids) => {
    setDeleteTarget({ type, ids });
    setShowDeleteConfirm(true);
  };

  // Elimina dichiarazioni
  const deleteDeclarations = async () => {
    if (!deleteTarget) return;
    
    const idsToDelete = deleteTarget.ids;
    setDeletingIds(idsToDelete);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const declId of idsToDelete) {
        try {
          const res = await fetch(`${API_URL}/api/declarations/v2/admin/declarations/${declId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (e) {
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} dichiarazione/i eliminata/e`);
        fetchDeclarations();
        fetchStats();
        setSelectedIds(prev => prev.filter(id => !idsToDelete.includes(id)));
        
        // Chiudi il dettaglio se era selezionata una dichiarazione eliminata
        if (selectedDeclaration && idsToDelete.includes(selectedDeclaration.id)) {
          setSelectedDeclaration(null);
        }
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} dichiarazione/i non eliminate (errore)`);
      }
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setDeletingIds([]);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  // Download documento con token
  const downloadDocument = async (declId, docId, filename) => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/declarations/${declId}/documents/${docId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'documento';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        toast.error('Errore download documento');
      }
    } catch (error) {
      toast.error('Errore di connessione');
    }
  };

  // URL documento con token (per anteprima)
  const getDocumentUrl = (declId, docId) => {
    return `${API_URL}/api/declarations/v2/declarations/${declId}/documents/${docId}?token=${encodeURIComponent(token)}`;
  };

  // Componenti UI
  const StatusBadge = ({ status, size = 'default' }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.bozza;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border ${size === 'lg' ? 'text-sm px-3 py-1' : ''}`}>
        <Icon className={`${size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} mr-1`} />
        {config.label}
      </Badge>
    );
  };

  // Formatta data
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Statistiche filtrate
  const filteredStats = useMemo(() => {
    return {
      total: declarations.length,
      bozza: declarations.filter(d => d.status === 'bozza').length,
      inviata: declarations.filter(d => d.status === 'inviata').length,
      in_revisione: declarations.filter(d => d.status === 'in_revisione').length,
      presentata: declarations.filter(d => d.status === 'presentata').length,
    };
  }, [declarations]);

  // Dichiarazioni filtrate
  const filteredDeclarations = useMemo(() => {
    return declarations.filter(decl => {
      // Filtro ricerca
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch = 
          (decl.client_name || '').toLowerCase().includes(searchLower) ||
          (decl.client_nome || '').toLowerCase().includes(searchLower) ||
          (decl.client_cognome || '').toLowerCase().includes(searchLower) ||
          (decl.client_email || '').toLowerCase().includes(searchLower) ||
          (decl.ragione_sociale || '').toLowerCase().includes(searchLower) ||
          (decl.codice_fiscale || '').toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Filtro stato
      if (statusFilter && decl.status !== statusFilter) return false;
      
      // Filtro anno
      if (yearFilter && decl.anno_fiscale !== parseInt(yearFilter)) return false;
      
      return true;
    });
  }, [declarations, search, statusFilter, yearFilter]);

  // Render dettaglio sezione
  const renderSectionDetail = (sectionKey, sectionData) => {
    if (!sectionData) return null;
    
    const data = sectionData.data || {};
    const isCompleted = sectionData.completed;
    const isNotApplicable = sectionData.not_applicable;

    if (isNotApplicable) {
      return (
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-slate-500 italic">Il cliente ha indicato: "Non ho questa tipologia"</p>
        </div>
      );
    }

    if (Object.keys(data).length === 0) {
      return (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-yellow-700">Sezione non ancora compilata</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {Object.entries(data).map(([key, value]) => {
          if (value === null || value === undefined || value === '') return null;
          
          // Formatta il nome del campo
          const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
          // Gestisci array
          if (Array.isArray(value)) {
            return (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-500">{fieldName}</span>
                <span className="text-slate-900">{value.join(', ')}</span>
              </div>
            );
          }
          
          return (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-sm font-medium text-slate-500">{fieldName}</span>
              <span className="text-slate-900">{String(value)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Render con skeleton loader se in caricamento
  if (loading && declarations.length === 0) {
    return (
      <DeclarationErrorBoundary>
        <div className="min-h-screen bg-slate-50 p-4 md:p-6">
          <AdminDashboardSkeleton />
        </div>
      </DeclarationErrorBoundary>
    );
  }

  // Render errore con retry
  if (loadError && declarations.length === 0) {
    return (
      <DeclarationErrorBoundary>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {isOffline ? (
                  <WifiOff className="w-8 h-8 text-amber-600" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                {isOffline ? 'Sei Offline' : 'Errore di Connessione'}
              </h2>
              <p className="text-slate-600 mb-6">
                {isOffline 
                  ? 'Connettiti a internet per visualizzare le dichiarazioni.'
                  : 'Impossibile caricare i dati. Verifica la connessione e riprova.'}
              </p>
              <Button onClick={fetchDeclarations} className="gap-2 bg-teal-600 hover:bg-teal-700">
                <RefreshCw className="w-4 h-4" />
                Riprova
              </Button>
            </CardContent>
          </Card>
        </div>
      </DeclarationErrorBoundary>
    );
  }

  return (
    <DeclarationErrorBoundary>
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 space-y-6">
      {/* Banner offline */}
      {isOffline && (
        <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium rounded-lg">
          <WifiOff className="w-4 h-4 inline mr-2" />
          Sei offline. Alcune funzionalita potrebbero non essere disponibili.
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => window.location.href = '/admin'}
            className="shrink-0"
            data-testid="back-to-dashboard-btn"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Dichiarazioni dei Redditi
            </h1>
            <p className="text-slate-600 mt-1">
              Gestione pratiche e comunicazioni clienti
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/admin'}
            className="gap-2"
            data-testid="home-btn"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => { fetchDeclarations(); fetchStats(); }}
            className="gap-2"
            disabled={loading}
            data-testid="refresh-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Caricamento...' : 'Aggiorna'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setStatusFilter('')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500">Totale</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer border-blue-200" 
          onClick={() => setStatusFilter('inviata')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-600">{stats.by_status?.inviata || 0}</p>
                <p className="text-sm text-slate-500">Da Revisionare</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Send className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer border-purple-200"
          onClick={() => setStatusFilter('in_revisione')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-purple-600">{stats.by_status?.in_revisione || 0}</p>
                <p className="text-sm text-slate-500">In Revisione</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Eye className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer border-orange-200"
          onClick={() => setStatusFilter('documentazione_incompleta')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-orange-600">{stats.by_status?.documentazione_incompleta || 0}</p>
                <p className="text-sm text-slate-500">Doc. Incompleta</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="hover:shadow-md transition-shadow cursor-pointer border-green-200"
          onClick={() => setStatusFilter('presentata')}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-600">{stats.by_status?.presentata || 0}</p>
                <p className="text-sm text-slate-500">Presentate</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtri e Ricerca */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Barra ricerca principale */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Cerca per nome, cognome, ragione sociale, codice fiscale, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-11"
                  data-testid="search-input"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-11 px-3 border rounded-lg bg-white min-w-[160px]"
                  data-testid="status-filter"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="h-11 px-3 border rounded-lg bg-white min-w-[120px]"
                  data-testid="year-filter"
                >
                  <option value="">Tutti gli anni</option>
                  {[2025, 2024, 2023, 2022, 2021].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <Button 
                  variant="outline" 
                  className="h-11"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Filtri attivi */}
            {(statusFilter || yearFilter || search) && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-slate-500">Filtri attivi:</span>
                {search && (
                  <Badge variant="secondary" className="gap-1">
                    Cerca: "{search}"
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSearch('')} />
                  </Badge>
                )}
                {statusFilter && (
                  <Badge variant="secondary" className="gap-1">
                    Stato: {STATUS_CONFIG[statusFilter]?.label}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setStatusFilter('')} />
                  </Badge>
                )}
                {yearFilter && (
                  <Badge variant="secondary" className="gap-1">
                    Anno: {yearFilter}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setYearFilter('')} />
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setSearch(''); setStatusFilter(''); setYearFilter(''); }}
                >
                  Pulisci tutto
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Barra azioni selezione multipla */}
      {selectedIds.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckSquare className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-800">
                  {selectedIds.length} dichiarazione/i selezionata/e
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                >
                  Annulla selezione
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={() => confirmDelete('multiple', selectedIds)}
                  data-testid="delete-selected-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  Elimina selezionate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista Dichiarazioni */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              Dichiarazioni ({filteredDeclarations.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
          ) : filteredDeclarations.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 text-lg">Nessuna dichiarazione trovata</p>
              <p className="text-slate-400 text-sm mt-1">Prova a modificare i filtri di ricerca</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-sm text-slate-600">
                    <th className="px-4 py-3 w-12">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                        className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-teal-600"
                        data-testid="select-all-checkbox"
                      >
                        {filteredDeclarations.length > 0 && filteredDeclarations.every(d => selectedIds.includes(d.id)) ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : filteredDeclarations.some(d => selectedIds.includes(d.id)) ? (
                          <MinusSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Anno</th>
                    <th className="px-4 py-3 font-semibold">Stato</th>
                    <th className="px-4 py-3 font-semibold">Completamento</th>
                    <th className="px-4 py-3 font-semibold hidden md:table-cell">Documenti</th>
                    <th className="px-4 py-3 font-semibold hidden lg:table-cell">Creata</th>
                    <th className="px-4 py-3 font-semibold hidden lg:table-cell">Aggiornata</th>
                    <th className="px-4 py-3 font-semibold text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDeclarations.map((decl) => (
                    <tr 
                      key={decl.id} 
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedIds.includes(decl.id) ? 'bg-teal-50' : ''
                      } ${deletingIds.includes(decl.id) ? 'opacity-50' : ''}`}
                      onClick={() => openDetail(decl.id)}
                      data-testid={`declaration-row-${decl.id}`}
                    >
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelectDeclaration(decl.id); }}
                          className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-teal-600"
                          data-testid={`select-checkbox-${decl.id}`}
                        >
                          {selectedIds.includes(decl.id) ? (
                            <CheckSquare className="w-5 h-5 text-teal-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-teal-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">
                              {decl.client_nome && decl.client_cognome 
                                ? `${decl.client_nome} ${decl.client_cognome}`
                                : decl.client_name}
                            </p>
                            <p className="text-sm text-slate-500 truncate">{decl.client_email}</p>
                            {decl.ragione_sociale && (
                              <p className="text-xs text-slate-400 truncate">
                                <Building className="w-3 h-3 inline mr-1" />
                                {decl.ragione_sociale}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-lg font-semibold text-slate-700">{decl.anno_fiscale}</span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={decl.status} />
                        {decl.pending_integration_requests > 0 && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            {decl.pending_integration_requests} richieste
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                decl.completion_percentage >= 100 ? 'bg-green-500' :
                                decl.completion_percentage >= 50 ? 'bg-teal-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${decl.completion_percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-600 w-10">
                            {decl.completion_percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-1 text-slate-600">
                          <Paperclip className="w-4 h-4" />
                          <span>{decl.documents_count || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500 hidden lg:table-cell">
                        {formatDate(decl.created_at)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500 hidden lg:table-cell">
                        {formatDate(decl.updated_at)}
                      </td>
                      <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openDetail(decl.id); }}
                            title="Apri dettaglio"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Apri
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={async (e) => { 
                              e.stopPropagation();
                              try {
                                const res = await fetch(`${API_URL}/api/declarations/v2/admin/declarations/${decl.id}/pdf`, {
                                  headers: { 'Authorization': `Bearer ${token}` }
                                });
                                if (res.ok) {
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = `dichiarazione_${decl.anno_fiscale}_${(decl.client_name || 'cliente').replace(/\s/g, '_')}.pdf`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                  toast.success('PDF scaricato');
                                } else {
                                  toast.error('Errore download PDF');
                                }
                              } catch (e) {
                                toast.error('Errore connessione');
                              }
                            }}
                            title="Scarica PDF"
                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              confirmDelete('single', [decl.id]); 
                            }}
                            disabled={deletingIds.includes(decl.id)}
                            data-testid={`delete-btn-${decl.id}`}
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Conferma Eliminazione */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="border-b bg-red-50">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Conferma Eliminazione
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-slate-600 mb-4">
                {deleteTarget.type === 'single' 
                  ? 'Sei sicuro di voler eliminare questa dichiarazione?'
                  : `Sei sicuro di voler eliminare ${deleteTarget.ids.length} dichiarazioni?`
                }
              </p>
              <p className="text-sm text-red-600 mb-6">
                <strong>Attenzione:</strong> Questa azione è irreversibile. Tutti i dati e i documenti associati verranno eliminati permanentemente.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
                  disabled={deletingIds.length > 0}
                >
                  Annulla
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteDeclarations}
                  disabled={deletingIds.length > 0}
                  className="gap-2"
                  data-testid="confirm-delete-btn"
                >
                  {deletingIds.length > 0 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Eliminazione...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Elimina
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Dettaglio Pratica */}
      {selectedDeclaration && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-5xl my-4 md:my-8 shadow-2xl">
            {/* Header Modal */}
            <CardHeader className="border-b bg-slate-50 sticky top-0 z-10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center">
                    <User className="w-7 h-7 text-teal-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {selectedDeclaration.client_nome && selectedDeclaration.client_cognome 
                        ? `${selectedDeclaration.client_nome} ${selectedDeclaration.client_cognome}`
                        : selectedDeclaration.client_name}
                    </h2>
                    <p className="text-slate-500">{selectedDeclaration.client_email}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <StatusBadge status={selectedDeclaration.status} size="lg" />
                      <span className="text-sm text-slate-500">
                        Anno Fiscale: <strong>{selectedDeclaration.anno_fiscale}</strong>
                      </span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSelectedDeclaration(null)}
                  data-testid="close-detail-modal"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Tabs */}
              <Tabs value={detailTab} onValueChange={setDetailTab} className="w-full">
                <div className="border-b bg-white sticky top-[120px] z-10">
                  <TabsList className="w-full justify-start rounded-none h-auto p-0 bg-transparent overflow-x-auto">
                    <TabsTrigger 
                      value="overview" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Panoramica
                    </TabsTrigger>
                    <TabsTrigger 
                      value="sections" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Sezioni ({Object.keys(selectedDeclaration.sections || {}).length})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="documents" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Documenti ({selectedDeclaration.documents_count || 0})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="messages" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Messaggi ({selectedDeclaration.messages_count || 0})
                    </TabsTrigger>
                    <TabsTrigger 
                      value="status" 
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-600 data-[state=active]:bg-transparent px-6 py-3"
                    >
                      Gestione Stato
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Tab Panoramica */}
                <TabsContent value="overview" className="p-6 space-y-6 mt-0">
                  {/* Info Card */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                            <Hash className="w-5 h-5 text-teal-600" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">ID Pratica</p>
                            <p className="font-mono text-sm">{selectedDeclaration.id?.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">Creata il</p>
                            <p className="font-medium">{formatDate(selectedDeclaration.created_at)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <History className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">Ultima Modifica</p>
                            <p className="font-medium">{formatDateTime(selectedDeclaration.updated_at)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Progresso Sezioni */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Progresso Compilazione</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span>Completamento totale</span>
                          <span className="font-semibold">{selectedDeclaration.completion_percentage}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              selectedDeclaration.completion_percentage >= 100 ? 'bg-green-500' :
                              selectedDeclaration.completion_percentage >= 50 ? 'bg-teal-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${selectedDeclaration.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(selectedDeclaration.sections || {}).map(([key, section]) => (
                          <div 
                            key={key}
                            className={`p-3 rounded-lg border text-sm ${
                              section.completed ? 'bg-green-50 border-green-200' :
                              section.not_applicable ? 'bg-slate-100 border-slate-200' :
                              'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {section.completed && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
                              {section.not_applicable && <X className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                              {!section.completed && !section.not_applicable && <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                              <span className="truncate">{SECTION_NAMES[key] || key}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dati Cliente (se compilati) */}
                  {selectedDeclaration.sections?.dati_personali?.data && 
                   Object.keys(selectedDeclaration.sections.dati_personali.data).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Dati Cliente</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          {selectedDeclaration.sections.dati_personali.data.codice_fiscale && (
                            <div className="flex items-center gap-3">
                              <Hash className="w-5 h-5 text-slate-400" />
                              <div>
                                <p className="text-sm text-slate-500">Codice Fiscale / NIE</p>
                                <p className="font-mono font-medium">{selectedDeclaration.sections.dati_personali.data.codice_fiscale}</p>
                              </div>
                            </div>
                          )}
                          {selectedDeclaration.sections.dati_personali.data.telefono && (
                            <div className="flex items-center gap-3">
                              <Phone className="w-5 h-5 text-slate-400" />
                              <div>
                                <p className="text-sm text-slate-500">Telefono</p>
                                <p className="font-medium">{selectedDeclaration.sections.dati_personali.data.telefono}</p>
                              </div>
                            </div>
                          )}
                          {selectedDeclaration.sections.dati_personali.data.indirizzo && (
                            <div className="flex items-center gap-3 md:col-span-2">
                              <Building className="w-5 h-5 text-slate-400" />
                              <div>
                                <p className="text-sm text-slate-500">Indirizzo</p>
                                <p className="font-medium">{selectedDeclaration.sections.dati_personali.data.indirizzo}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Firma */}
                  {selectedDeclaration.is_signed && selectedDeclaration.signature && (
                    <Card className="border-green-200 bg-green-50/50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                          <CheckCircle className="w-5 h-5" />
                          Dichiarazione Firmata
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-green-700">
                          Firmata il {formatDateTime(selectedDeclaration.signature.signed_at)}
                        </p>
                        {selectedDeclaration.signature.signature_image && (
                          <div className="mt-4 p-4 bg-white rounded-lg border">
                            <img 
                              src={selectedDeclaration.signature.signature_image} 
                              alt="Firma cliente"
                              className="max-h-24"
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Tab Sezioni */}
                <TabsContent value="sections" className="p-6 mt-0">
                  <div className="space-y-4">
                    {Object.entries(selectedDeclaration.sections || {}).map(([key, section]) => (
                      <Card key={key}>
                        <CardHeader className="py-3 cursor-pointer" onClick={() => {}}>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              {section.completed && <CheckCircle className="w-5 h-5 text-green-600" />}
                              {section.not_applicable && <X className="w-5 h-5 text-slate-400" />}
                              {!section.completed && !section.not_applicable && <Clock className="w-5 h-5 text-yellow-500" />}
                              {SECTION_NAMES[key] || key}
                            </CardTitle>
                            {section.updated_at && (
                              <span className="text-xs text-slate-400">
                                Aggiornata: {formatDateTime(section.updated_at)}
                              </span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {renderSectionDetail(key, section)}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Tab Documenti */}
                <TabsContent value="documents" className="p-6 mt-0">
                  <DocumentsTab 
                    declaration={selectedDeclaration}
                    token={token}
                    onRefresh={() => openDetail(selectedDeclaration.id)}
                  />
                </TabsContent>

                {/* Tab Messaggi */}
                <TabsContent value="messages" className="p-6 mt-0">
                  <div className="space-y-4">
                    {/* Cronologia messaggi */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Cronologia Comunicazioni</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-[300px] pr-4">
                          {(!selectedDeclaration.messages || selectedDeclaration.messages.length === 0) ? (
                            <div className="text-center py-8 text-slate-500">
                              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                              <p>Nessun messaggio</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {selectedDeclaration.messages.map((msg, idx) => (
                                <div 
                                  key={msg.id || idx}
                                  className={`p-4 rounded-lg ${
                                    msg.sender_role === 'admin' 
                                      ? 'bg-teal-50 border border-teal-200 ml-8'
                                      : 'bg-slate-50 border border-slate-200 mr-8'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-sm">
                                      {msg.sender_name}
                                      {msg.sender_role === 'admin' && (
                                        <Badge variant="outline" className="ml-2 text-xs">Admin</Badge>
                                      )}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                      {formatDateTime(msg.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-slate-700">{msg.content}</p>
                                  {msg.is_integration_request && (
                                    <Badge variant="destructive" className="mt-2">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Richiesta Integrazione
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Nuovo messaggio */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Invia Messaggio</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Textarea
                          placeholder="Scrivi un messaggio al cliente..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          rows={3}
                          data-testid="message-input"
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isIntegrationRequest}
                              onChange={(e) => setIsIntegrationRequest(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-300"
                            />
                            <span className="text-sm text-slate-600">
                              Richiesta integrazione documenti
                            </span>
                          </label>
                          <Button
                            onClick={sendMessage}
                            disabled={!newMessage.trim() || sendingMessage}
                            className="bg-teal-600 hover:bg-teal-700"
                            data-testid="send-message-btn"
                          >
                            {sendingMessage ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Invio...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Invia
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Tab Gestione Stato */}
                <TabsContent value="status" className="p-6 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Cambia Stato Pratica</CardTitle>
                      <div className="text-sm text-slate-500 flex items-center gap-2">
                        <span>Stato attuale:</span>
                        <StatusBadge status={selectedDeclaration.status} size="lg" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Griglia stati */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                          const Icon = config.icon;
                          const isActive = selectedDeclaration.status === key;
                          return (
                            <button
                              key={key}
                              onClick={() => !isActive && updateStatus(selectedDeclaration.id, key)}
                              disabled={isActive || updatingStatus}
                              className={`p-4 rounded-lg border-2 text-left transition-all ${
                                isActive 
                                  ? 'border-teal-600 bg-teal-50 ring-2 ring-teal-600/20' 
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                              data-testid={`status-btn-${key}`}
                            >
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${config.color}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <p className="font-medium text-slate-900">{config.label}</p>
                              <p className="text-xs text-slate-500 mt-1">{config.description}</p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Nota opzionale */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Nota (opzionale)
                        </label>
                        <Textarea
                          placeholder="Aggiungi una nota per il cambio stato..."
                          value={statusNote}
                          onChange={(e) => setStatusNote(e.target.value)}
                          rows={2}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          La nota sara visibile nella cronologia della pratica
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </DeclarationErrorBoundary>
  );
};

// =============================================================================
// COMPONENTE DOCUMENTI TAB
// =============================================================================

const DocumentsTab = ({ declaration, token, onRefresh }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const fileInputRef = React.useRef(null);

  // Carica documenti
  const fetchDocuments = React.useCallback(async () => {
    if (!declaration?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/declarations/${declaration.id}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch (e) {
      console.error('Errore caricamento documenti:', e);
    } finally {
      setLoading(false);
    }
  }, [declaration?.id, token]);

  React.useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Upload file
  const handleUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    let successCount = 0;
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: Troppo grande (max 10MB)`);
        continue;
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'admin');
      
      try {
        const res = await fetch(`${API_URL}/api/declarations/v2/declarations/${declaration.id}/documents`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        if (res.ok) {
          successCount++;
        } else {
          const err = await res.json();
          toast.error(`${file.name}: ${err.detail || 'Errore'}`);
        }
      } catch (e) {
        toast.error(`${file.name}: Errore connessione`);
      }
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} file caricati`);
      fetchDocuments();
      onRefresh();
    }
    setUploading(false);
  };

  // Elimina documento
  const deleteDocument = async (docId) => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/declarations/${declaration.id}/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Documento eliminato');
        fetchDocuments();
        onRefresh();
      }
    } catch (e) {
      toast.error('Errore eliminazione');
    }
  };

  // Download PDF riepilogo
  const downloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/admin/declarations/${declaration.id}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dichiarazione_${declaration.anno_fiscale}_${declaration.client_name?.replace(/\s/g, '_')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('PDF scaricato');
      } else {
        toast.error('Errore download PDF');
      }
    } catch (e) {
      toast.error('Errore connessione');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Download ZIP completo
  const downloadZip = async () => {
    setDownloadingZip(true);
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/admin/declarations/${declaration.id}/zip`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pratica_${declaration.anno_fiscale}_${declaration.client_name?.replace(/\s/g, '_')}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('ZIP scaricato');
      } else {
        toast.error('Errore download ZIP');
      }
    } catch (e) {
      toast.error('Errore connessione');
    } finally {
      setDownloadingZip(false);
    }
  };

  // Toggle selezione documento
  const toggleDocSelection = (docId) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  // Seleziona tutti
  const selectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documents.map(d => d.id));
    }
  };

  // Determina icona per tipo file
  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return FileText;
    if (mimeType?.includes('image')) return Image;
    return FileText;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Azioni download */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Download Pratica</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={downloadPdf}
                disabled={downloadingPdf}
                className="gap-2"
                data-testid="download-pdf-btn"
              >
                {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                PDF Riepilogo
              </Button>
              <Button
                onClick={downloadZip}
                disabled={downloadingZip}
                className="gap-2 bg-teal-600 hover:bg-teal-700"
                data-testid="download-zip-btn"
              >
                {downloadingZip ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
                ZIP Completo
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            <strong>PDF Riepilogo:</strong> Documento con tutti i dati compilati dal cliente.
            <br />
            <strong>ZIP Completo:</strong> PDF riepilogativo + tutti gli allegati caricati.
          </p>
        </CardContent>
      </Card>

      {/* Upload admin */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Carica Documento (Admin)</CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="border-2 border-dashed rounded-lg p-6 text-center hover:border-teal-400 cursor-pointer transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-teal-500 mx-auto" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Trascina file o clicca per caricare</p>
                <p className="text-xs text-slate-400">PDF, JPG, PNG - Max 10MB</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista documenti */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Documenti Allegati ({documents.length})</span>
            {documents.length > 0 && (
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedDocs.length === documents.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Paperclip className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Nessun documento allegato</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => {
                const FileIcon = getFileIcon(doc.mime_type);
                const isSelected = selectedDocs.includes(doc.id);
                const isImage = doc.mime_type?.includes('image');
                
                return (
                  <div 
                    key={doc.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isSelected ? 'bg-teal-50 border-teal-300' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDocSelection(doc.id)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <FileIcon className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">{doc.filename}</p>
                        <p className="text-xs text-slate-500">
                          {(doc.file_size / 1024).toFixed(1)} KB 
                          {' - '}Caricato da {doc.uploaded_by_name}
                          {' - '}{new Date(doc.created_at).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isImage && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setPreviewDoc(doc)}
                          title="Anteprima"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadDocument(declaration.id, doc.id, doc.filename)}
                        title="Scarica"
                      >
                        <Download className="w-4 h-4 text-slate-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteDocument(doc.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal anteprima immagine */}
      {previewDoc && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div className="max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">{previewDoc.filename}</h3>
              <Button variant="ghost" size="icon" onClick={() => setPreviewDoc(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <img 
              src={getDocumentUrl(declaration.id, previewDoc.id)}
              alt={previewDoc.filename}
              className="max-w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDeclarationsPage;
