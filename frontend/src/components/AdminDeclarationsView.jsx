import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { 
  Users, Search, FileText, ChevronRight, MessageCircle, 
  AlertCircle, Clock, CheckCircle, FileCheck, RefreshCw,
  ArrowLeft, User, Calendar, Send, Paperclip, Eye, Trash2,
  Building2, LayoutList, FolderOpen, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../i18n/LanguageContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDeclarationsView = ({ token, user, onSelectDeclaration }) => {
  const { t } = useLanguage();
  const [clients, setClients] = useState([]);
  const [allDeclarations, setAllDeclarations] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDeclarations, setClientDeclarations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('all'); // 'all' = tutte le dichiarazioni, 'clients' = per cliente
  const [deleteDialog, setDeleteDialog] = useState({ open: false, declaration: null });
  const [filters, setFilters] = useState({
    search: '',
    tipoCliente: '',
    hasPendingRequests: '',
    stato: ''
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'updated_at', // campo di ordinamento
    direction: 'desc'    // 'asc' o 'desc'
  });

  useEffect(() => {
    fetchClientsWithDeclarations();
    fetchAllDeclarations();
  }, []);

  const fetchAllDeclarations = async () => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAllDeclarations(data);
    } catch (error) {
      console.error('Errore caricamento dichiarazioni:', error);
    }
  };

  const fetchClientsWithDeclarations = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/declarations/clients-with-declarations`;
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.tipoCliente) params.append('tipo_cliente', filters.tipoCliente);
      if (filters.hasPendingRequests === 'true') params.append('has_pending_requests', 'true');
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error('Errore caricamento clienti:', error);
      toast.error('Errore caricamento clienti');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDeclarations = async (clientId) => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns?client_id=${clientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setClientDeclarations(data);
    } catch (error) {
      console.error('Errore caricamento dichiarazioni:', error);
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    fetchClientDeclarations(client.client_id);
  };

  const handleBackToClients = () => {
    setSelectedClient(null);
    setClientDeclarations([]);
  };

  const handleStatusChange = async (declarationId, newStatus) => {
    try {
      const formData = new FormData();
      formData.append('nuovo_stato', newStatus);
      
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${declarationId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (res.ok) {
        toast.success(`${t('taxReturns.statusUpdated')}: ${getStatusLabel(newStatus)}`);
        fetchAllDeclarations();
        if (selectedClient) {
          fetchClientDeclarations(selectedClient.client_id);
        }
      } else {
        toast.error(t('messages.saveError'));
      }
    } catch (error) {
      console.error('Errore:', error);
      toast.error(t('messages.saveError'));
    }
  };

  const handleDeleteDeclaration = async () => {
    if (!deleteDialog.declaration) return;
    
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${deleteDialog.declaration.id}?soft_delete=true`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast.success(t('taxReturns.declarationDeleted'));
        setDeleteDialog({ open: false, declaration: null });
        fetchAllDeclarations();
        fetchClientsWithDeclarations();
        if (selectedClient) {
          fetchClientDeclarations(selectedClient.client_id);
        }
      } else {
        toast.error(t('messages.deleteError'));
      }
    } catch (error) {
      console.error('Errore:', error);
      toast.error(t('messages.deleteError'));
    }
  };

  const getStatusLabel = (stato) => {
    const statusMap = {
      bozza: t('taxReturns.status.draft'),
      inviata: t('taxReturns.status.sent'),
      documentazione_incompleta: t('taxReturns.status.incompleteDoc'),
      in_revisione: t('taxReturns.status.inReview'),
      pronta: t('taxReturns.status.ready'),
      presentata: t('taxReturns.status.presented'),
      errata: t('taxReturns.status.error'),
      non_presentare: t('taxReturns.status.notPresent'),
      archiviata: t('taxReturns.status.archived'),
      eliminata: t('taxReturns.status.deleted')
    };
    return statusMap[stato] || stato;
  };

  const getStatusBadge = (stato) => {
    // Codifica colore:
    // VERDE = presentata
    // GIALLO = pendente (bozza, inviata, doc_incompleta, in_revisione, pronta)
    // ROSSO = errata, non_presentare
    // GRIGIO = archiviata, eliminata
    const config = {
      bozza: { label: 'Bozza', color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: Clock },
      inviata: { label: 'Inviata', color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: Send },
      documentazione_incompleta: { label: 'Doc. Incompleta', color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: AlertCircle },
      in_revisione: { label: 'In Revisione', color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: Eye },
      pronta: { label: 'Pronta', color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: FileCheck },
      presentata: { label: 'Presentata', color: 'bg-green-100 text-green-700 border border-green-300', icon: CheckCircle },
      errata: { label: 'Errata', color: 'bg-red-100 text-red-700 border border-red-300', icon: AlertCircle },
      non_presentare: { label: 'Non Presentare', color: 'bg-red-100 text-red-700 border border-red-300', icon: AlertCircle },
      archiviata: { label: 'Archiviata', color: 'bg-slate-100 text-slate-600 border border-slate-300', icon: FileText },
      eliminata: { label: 'Eliminata', color: 'bg-slate-200 text-slate-500 border border-slate-300', icon: FileText }
    };
    const cfg = config[stato] || { label: stato, color: 'bg-gray-100 text-gray-600', icon: FileText };
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </Badge>
    );
  };

  const getClientTypeLabel = (tipo) => {
    const types = {
      autonomo: 'Autonomo',
      societa: 'Società',
      vivienda_vacacional: 'Vivienda Vacacional',
      persona_fisica: 'Persona Fisica'
    };
    return types[tipo] || tipo || 'N/D';
  };

  // Stats totali
  const totalStats = {
    totalClients: clients.length,
    totalDeclarations: allDeclarations.filter(d => d.stato !== 'eliminata').length,
    totalPending: clients.reduce((acc, c) => acc + c.total_richieste_pendenti, 0),
    totalUnread: clients.reduce((acc, c) => acc + c.unread_messages, 0),
    presentate: allDeclarations.filter(d => d.stato === 'presentata').length,
    pendenti: allDeclarations.filter(d => ['bozza', 'inviata', 'documentazione_incompleta', 'in_revisione', 'pronta'].includes(d.stato)).length,
    errate: allDeclarations.filter(d => ['errata', 'non_presentare'].includes(d.stato)).length
  };

  // Filtra dichiarazioni per la vista "Tutte"
  const filteredDeclarations = useMemo(() => {
    let result = allDeclarations.filter(decl => {
      if (decl.stato === 'eliminata') return false;
      
      // Filtro ricerca avanzata (nome, email, anno, stato)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase().trim();
        const matchName = decl.client_name?.toLowerCase().includes(searchLower);
        const matchEmail = decl.client_email?.toLowerCase().includes(searchLower);
        const matchAnno = decl.anno_fiscale?.toString().includes(searchLower);
        const matchStato = getStatusLabel(decl.stato).toLowerCase().includes(searchLower);
        if (!matchName && !matchEmail && !matchAnno && !matchStato) return false;
      }
      
      // Filtro stato
      if (filters.stato) {
        if (filters.stato === 'pendente' && !['bozza', 'inviata', 'documentazione_incompleta', 'in_revisione', 'pronta'].includes(decl.stato)) return false;
        if (filters.stato === 'presentata' && decl.stato !== 'presentata') return false;
        if (filters.stato === 'errata' && !['errata', 'non_presentare'].includes(decl.stato)) return false;
      }
      
      return true;
    });

    // Ordinamento
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortConfig.field) {
        case 'client_name':
          comparison = (a.client_name || '').localeCompare(b.client_name || '');
          break;
        case 'anno_fiscale':
          comparison = (a.anno_fiscale || 0) - (b.anno_fiscale || 0);
          break;
        case 'stato':
          // Ordine: presentata, pendenti, errata
          const statoOrder = {
            presentata: 1,
            pronta: 2,
            in_revisione: 3,
            documentazione_incompleta: 4,
            inviata: 5,
            bozza: 6,
            errata: 7,
            non_presentare: 8,
            archiviata: 9
          };
          comparison = (statoOrder[a.stato] || 10) - (statoOrder[b.stato] || 10);
          break;
        case 'created_at':
          comparison = new Date(a.created_at) - new Date(b.created_at);
          break;
        case 'updated_at':
        default:
          comparison = new Date(a.updated_at) - new Date(b.updated_at);
          break;
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allDeclarations, filters.search, filters.stato, sortConfig]);

  // Gestione click header tabella per ordinamento
  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Icona ordinamento per header
  const SortIcon = ({ field }) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-slate-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-teal-600" />
      : <ArrowDown className="w-4 h-4 ml-1 text-teal-600" />;
  };

  // Componente per il selettore di stato
  const StatusSelector = ({ declaration }) => (
    <Select 
      value={declaration.stato} 
      onValueChange={(newStatus) => handleStatusChange(declaration.id, newStatus)}
    >
      <SelectTrigger className="w-[160px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="bozza">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            Bozza
          </div>
        </SelectItem>
        <SelectItem value="inviata">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            Inviata
          </div>
        </SelectItem>
        <SelectItem value="documentazione_incompleta">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            Doc. Incompleta
          </div>
        </SelectItem>
        <SelectItem value="in_revisione">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            In Revisione
          </div>
        </SelectItem>
        <SelectItem value="pronta">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            Pronta
          </div>
        </SelectItem>
        <SelectItem value="presentata">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Presentata
          </div>
        </SelectItem>
        <SelectItem value="errata">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            Errata
          </div>
        </SelectItem>
        <SelectItem value="non_presentare">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            Non Presentare
          </div>
        </SelectItem>
        <SelectItem value="archiviata">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-400" />
            Archiviata
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );

  // Vista Tutte le Dichiarazioni
  if (viewMode === 'all' && !selectedClient) {
    return (
      <div className="space-y-6" data-testid="admin-declarations-all-view">
        {/* Dialog Conferma Eliminazione */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('taxReturns.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('taxReturns.confirmDeleteDesc')} {deleteDialog.declaration?.anno_fiscale} {t('taxReturns.of')} <strong>{deleteDialog.declaration?.client_name}</strong>?
                <br /><br />
                {t('taxReturns.deleteWarning')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteDeclaration} className="bg-red-600 hover:bg-red-700">
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-teal-50 cursor-pointer hover:bg-teal-100 transition-colors" onClick={() => setFilters({...filters, stato: ''})}>
            <CardContent className="p-4 text-center">
              <FileText className="w-6 h-6 mx-auto mb-2 text-teal-600" />
              <p className="text-2xl font-bold text-teal-700">{totalStats.totalDeclarations}</p>
              <p className="text-sm text-slate-500">{t('taxReturns.totalDeclarations')}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 cursor-pointer hover:bg-green-100 transition-colors border-green-200" onClick={() => setFilters({...filters, stato: 'presentata'})}>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-700">{totalStats.presentate}</p>
              <p className="text-sm text-slate-500">{t('taxReturns.presented')}</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 cursor-pointer hover:bg-yellow-100 transition-colors border-yellow-200" onClick={() => setFilters({...filters, stato: 'pendente'})}>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-700">{totalStats.pendenti}</p>
              <p className="text-sm text-slate-500">{t('taxReturns.pending')}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 cursor-pointer hover:bg-red-100 transition-colors border-red-200" onClick={() => setFilters({...filters, stato: 'errata'})}>
            <CardContent className="p-4 text-center">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold text-red-700">{totalStats.errate}</p>
              <p className="text-sm text-slate-500">{t('taxReturns.errorNotPresent')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Toggle Vista + Filtri + Ordinamento */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Toggle Vista */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                <Button 
                  variant={viewMode === 'all' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('all')}
                  className={viewMode === 'all' ? 'bg-teal-600' : ''}
                >
                  <LayoutList className="w-4 h-4 mr-1" />
                  {t('taxReturns.allDeclarations')}
                </Button>
                <Button 
                  variant={viewMode === 'clients' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('clients')}
                  className={viewMode === 'clients' ? 'bg-teal-600' : ''}
                >
                  <FolderOpen className="w-4 h-4 mr-1" />
                  {t('taxReturns.byClient')}
                </Button>
              </div>
              
              <div className="h-6 w-px bg-slate-200" />
              
              {/* Barra di ricerca migliorata */}
              <div className="flex-1 min-w-[280px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder={t('taxReturns.search')}
                    className="pl-10 pr-4"
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    data-testid="declarations-search-input"
                  />
                </div>
              </div>
              
              {/* Filtro Stato */}
              <Select 
                value={filters.stato || "all"} 
                onValueChange={(v) => setFilters({...filters, stato: v === "all" ? "" : v})}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t('common.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('taxReturns.filterByStatus')}</SelectItem>
                  <SelectItem value="presentata">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      {t('taxReturns.presented')}
                    </div>
                  </SelectItem>
                  <SelectItem value="pendente">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      {t('taxReturns.pending')}
                    </div>
                  </SelectItem>
                  <SelectItem value="errata">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      {t('taxReturns.status.error')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Dropdown Ordinamento */}
              <Select 
                value={`${sortConfig.field}_${sortConfig.direction}`}
                onValueChange={(v) => {
                  const [field, direction] = v.split('_');
                  setSortConfig({ field, direction });
                }}
              >
                <SelectTrigger className="w-[220px]" data-testid="sort-dropdown">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={t('taxReturns.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_at_desc">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="w-3 h-3" />
                      {t('taxReturns.sortLastModifiedRecent')}
                    </div>
                  </SelectItem>
                  <SelectItem value="updated_at_asc">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="w-3 h-3" />
                      {t('taxReturns.sortLastModifiedOld')}
                    </div>
                  </SelectItem>
                  <SelectItem value="created_at_desc">
                    <div className="flex items-center gap-2">
                      <ArrowDown className="w-3 h-3" />
                      {t('taxReturns.sortRequestDateRecent')}
                    </div>
                  </SelectItem>
                  <SelectItem value="created_at_asc">
                    <div className="flex items-center gap-2">
                      <ArrowUp className="w-3 h-3" />
                      {t('taxReturns.sortRequestDateOld')}
                    </div>
                  </SelectItem>
                  <SelectItem value="stato_asc">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {t('taxReturns.sortStatusPresented')}
                    </div>
                  </SelectItem>
                  <SelectItem value="stato_desc">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 text-red-500" />
                      {t('taxReturns.sortStatusError')}
                    </div>
                  </SelectItem>
                  <SelectItem value="client_name_asc">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" />
                      {t('taxReturns.sortClientAZ')}
                    </div>
                  </SelectItem>
                  <SelectItem value="client_name_desc">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3" />
                      {t('taxReturns.sortClientZA')}
                    </div>
                  </SelectItem>
                  <SelectItem value="anno_fiscale_desc">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {t('taxReturns.sortYearRecent')}
                    </div>
                  </SelectItem>
                  <SelectItem value="anno_fiscale_asc">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {t('taxReturns.sortYearOld')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={() => { fetchAllDeclarations(); fetchClientsWithDeclarations(); }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('taxReturns.refresh')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista Dichiarazioni */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              {t('taxReturns.allDeclarations')}
              <Badge variant="outline" className="ml-2">{filteredDeclarations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-500">{t('common.loading')}</div>
            ) : filteredDeclarations.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                {filters.search ? `${t('taxReturns.noResultsFor')} "${filters.search}"` : t('taxReturns.noDeclarations')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th 
                        className="text-left p-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 select-none"
                        onClick={() => handleSort('client_name')}
                      >
                        <div className="flex items-center">
                          {t('taxReturns.client')}
                          <SortIcon field="client_name" />
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 select-none"
                        onClick={() => handleSort('anno_fiscale')}
                      >
                        <div className="flex items-center">
                          {t('taxReturns.fiscalYear')}
                          <SortIcon field="anno_fiscale" />
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 select-none"
                        onClick={() => handleSort('stato')}
                      >
                        <div className="flex items-center">
                          {t('common.status')}
                          <SortIcon field="stato" />
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100 select-none"
                        onClick={() => handleSort('updated_at')}
                      >
                        <div className="flex items-center">
                          {t('taxReturns.lastModified')}
                          <SortIcon field="updated_at" />
                        </div>
                      </th>
                      <th className="text-center p-3 font-semibold text-slate-700">{t('taxReturns.documentsCount')}</th>
                      <th className="text-center p-3 font-semibold text-slate-700">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeclarations.map(decl => (
                      <tr 
                        key={decl.id} 
                        className={`border-b hover:bg-slate-50 transition-colors ${
                          decl.stato === 'presentata' ? 'border-l-4 border-l-green-500' :
                          ['errata', 'non_presentare'].includes(decl.stato) ? 'border-l-4 border-l-red-500' :
                          'border-l-4 border-l-yellow-400'
                        }`}
                        data-testid={`declaration-row-${decl.id}`}
                      >
                        {/* Cliente */}
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                              {decl.client_name?.includes(' ') ? (
                                <User className="w-5 h-5 text-teal-600" />
                              ) : (
                                <Building2 className="w-5 h-5 text-teal-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{decl.client_name || 'N/A'}</p>
                              <p className="text-xs text-slate-500">{decl.client_email}</p>
                            </div>
                          </div>
                        </td>
                        
                        {/* Anno */}
                        <td className="p-3">
                          <Badge variant="outline" className="font-mono">
                            {decl.anno_fiscale}
                          </Badge>
                        </td>
                        
                        {/* Stato (modificabile) */}
                        <td className="p-3">
                          <StatusSelector declaration={decl} />
                        </td>
                        
                        {/* Ultima Modifica */}
                        <td className="p-3 text-sm text-slate-500">
                          {new Date(decl.updated_at).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        
                        {/* Documenti */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1 text-slate-500">
                            <Paperclip className="w-4 h-4" />
                            <span>{decl.documentos_count}</span>
                          </div>
                        </td>
                        
                        {/* Azioni */}
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => onSelectDeclaration(decl)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              {t('taxReturns.detail')}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDialog({ open: true, declaration: decl });
                              }}
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
      </div>
    );
  }

  // Vista Lista Clienti (viewMode === 'clients')
  if (viewMode === 'clients' && !selectedClient) {
    return (
      <div className="space-y-6" data-testid="admin-declarations-clients-view">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-50">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-slate-600" />
              <p className="text-2xl font-bold text-slate-900">{totalStats.totalClients}</p>
              <p className="text-sm text-slate-500">{t('clients.title')}</p>
            </CardContent>
          </Card>
          <Card className="bg-teal-50">
            <CardContent className="p-4 text-center">
              <FileText className="w-6 h-6 mx-auto mb-2 text-teal-600" />
              <p className="text-2xl font-bold text-teal-700">{totalStats.totalDeclarations}</p>
              <p className="text-sm text-slate-500">Dichiarazioni</p>
            </CardContent>
          </Card>
          <Card className={`${totalStats.totalPending > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}`}>
            <CardContent className="p-4 text-center">
              <AlertCircle className={`w-6 h-6 mx-auto mb-2 ${totalStats.totalPending > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
              <p className={`text-2xl font-bold ${totalStats.totalPending > 0 ? 'text-yellow-700' : 'text-gray-500'}`}>{totalStats.totalPending}</p>
              <p className="text-sm text-slate-500">Richieste Pendenti</p>
            </CardContent>
          </Card>
          <Card className={`${totalStats.totalUnread > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
            <CardContent className="p-4 text-center">
              <MessageCircle className={`w-6 h-6 mx-auto mb-2 ${totalStats.totalUnread > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
              <p className={`text-2xl font-bold ${totalStats.totalUnread > 0 ? 'text-blue-700' : 'text-gray-500'}`}>{totalStats.totalUnread}</p>
              <p className="text-sm text-slate-500">Messaggi</p>
            </CardContent>
          </Card>
        </div>

        {/* Toggle Vista + Filtri */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Toggle Vista */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                <Button 
                  variant={viewMode === 'all' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('all')}
                  className={viewMode === 'all' ? 'bg-teal-600' : ''}
                >
                  <LayoutList className="w-4 h-4 mr-1" />
                  Tutte
                </Button>
                <Button 
                  variant={viewMode === 'clients' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => setViewMode('clients')}
                  className={viewMode === 'clients' ? 'bg-teal-600' : ''}
                >
                  <FolderOpen className="w-4 h-4 mr-1" />
                  Per Cliente
                </Button>
              </div>
              
              <div className="h-6 w-px bg-slate-200" />
              
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Cerca cliente..."
                    className="pl-10"
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && fetchClientsWithDeclarations()}
                  />
                </div>
              </div>
              <Select 
                value={filters.tipoCliente || "all"} 
                onValueChange={(v) => setFilters({...filters, tipoCliente: v === "all" ? "" : v})}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="autonomo">Autonomo</SelectItem>
                  <SelectItem value="societa">Società</SelectItem>
                  <SelectItem value="vivienda_vacacional">Vivienda Vacacional</SelectItem>
                  <SelectItem value="persona_fisica">Persona Fisica</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchClientsWithDeclarations}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Aggiorna
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista Clienti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              Clienti con Dichiarazioni
              <Badge variant="outline" className="ml-2">{clients.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-500">Caricamento...</div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Nessun cliente con dichiarazioni trovato
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map(client => (
                  <div
                    key={client.client_id}
                    className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectClient(client)}
                    data-testid={`client-row-${client.client_id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{client.client_name}</h3>
                          <p className="text-sm text-slate-500">{client.client_email}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {getClientTypeLabel(client.tipo_cliente)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-xl font-bold text-slate-700">{client.total_declarations}</p>
                          <p className="text-xs text-slate-500">Dichiarazioni</p>
                        </div>
                        
                        <div className="flex gap-2">
                          {client.declarations_inviate > 0 && (
                            <Badge className="bg-blue-100 text-blue-700">
                              {client.declarations_inviate} Inviate
                            </Badge>
                          )}
                          {client.declarations_in_revisione > 0 && (
                            <Badge className="bg-purple-100 text-purple-700">
                              {client.declarations_in_revisione} In Rev.
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {client.total_richieste_pendenti > 0 && (
                            <div className="flex items-center gap-1 text-yellow-600">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">{client.total_richieste_pendenti}</span>
                            </div>
                          )}
                          {client.unread_messages > 0 && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">{client.unread_messages}</span>
                            </div>
                          )}
                        </div>
                        
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista Dichiarazioni del Cliente Selezionato
  return (
    <div className="space-y-6" data-testid="admin-declarations-client-detail">
      {/* Header con info cliente */}
      <Card className="bg-gradient-to-r from-teal-50 to-slate-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBackToClients}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna ai Clienti
              </Button>
              <div className="h-8 w-px bg-slate-200" />
              <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-teal-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedClient.client_name}</h2>
                <p className="text-slate-500">{selectedClient.client_email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-teal-600">{selectedClient.total_declarations}</p>
                <p className="text-sm text-slate-500">Dichiarazioni</p>
              </div>
              {selectedClient.total_richieste_pendenti > 0 && (
                <Badge className="bg-yellow-100 text-yellow-700 text-lg px-3 py-1">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {selectedClient.total_richieste_pendenti} Richieste Pendenti
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista Dichiarazioni */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Dichiarazioni di {selectedClient.client_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientDeclarations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nessuna dichiarazione trovata per questo cliente
            </div>
          ) : (
            <div className="space-y-4">
              {clientDeclarations.map(decl => (
                <div
                  key={decl.id}
                  className="p-4 border rounded-lg hover:border-teal-300 hover:bg-teal-50/50 cursor-pointer transition-all"
                  onClick={() => onSelectDeclaration(decl)}
                  data-testid={`declaration-row-${decl.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          Dichiarazione Redditi {decl.anno_fiscale}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          {getStatusBadge(decl.stato)}
                          {decl.has_authorization && (
                            <Badge className="bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Firmata
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      {/* Indicatori Sezioni */}
                      <div className="flex gap-1">
                        {decl.has_rentas_trabajo && (
                          <Badge variant="outline" className="text-xs">Lavoro</Badge>
                        )}
                        {decl.has_autonomo && (
                          <Badge variant="outline" className="text-xs">Autonomo</Badge>
                        )}
                        {decl.has_inmuebles && (
                          <Badge variant="outline" className="text-xs">Immobili</Badge>
                        )}
                        {decl.has_criptomonedas && (
                          <Badge variant="outline" className="text-xs">Crypto</Badge>
                        )}
                      </div>
                      
                      {/* Documenti */}
                      <div className="flex items-center gap-1 text-slate-500">
                        <Paperclip className="w-4 h-4" />
                        <span className="text-sm">{decl.documentos_count}</span>
                      </div>
                      
                      {/* Richieste pendenti */}
                      {decl.richieste_pendenti > 0 && (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {decl.richieste_pendenti} Richieste
                        </Badge>
                      )}
                      
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizza
                      </Button>
                    </div>
                  </div>
                  
                  {/* Data ultima modifica */}
                  <div className="mt-3 pt-3 border-t text-xs text-slate-400">
                    Ultima modifica: {new Date(decl.updated_at).toLocaleString('it-IT')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDeclarationsView;
