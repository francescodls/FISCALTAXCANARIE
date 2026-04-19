/**
 * TaxPaymentsManagement - Gestione Importi Tributari
 * Sezione admin per gestire importi da pagare per dichiarazioni/modelli tributari
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
  Calendar,
  Euro,
  Users,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  Mail,
  Eye,
  MoreVertical,
  Loader2,
  Building2,
  User,
  Home,
  Briefcase,
  Send,
  Bell,
  Smartphone,
  History,
  CheckCheck,
  XCircle
} from 'lucide-react';
import axios from 'axios';
import { API } from '@/App';

// Configurazione stati notifica
const NOTIFICATION_STATUS = {
  non_inviata: { label: 'Non inviata', color: 'bg-slate-100 text-slate-700', icon: Clock },
  inviata: { label: 'Inviata', color: 'bg-blue-100 text-blue-700', icon: Mail },
  visualizzata: { label: 'Visualizzata', color: 'bg-amber-100 text-amber-700', icon: Eye },
  pagata: { label: 'Pagata', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle }
};

// Icone per categorie clienti
const CATEGORY_ICONS = {
  autonomo: Briefcase,
  societa: Building2,
  privato: User,
  casa_vacanza: Home
};

const TaxPaymentsManagement = ({ token }) => {
  const [activeTab, setActiveTab] = useState('assignments');
  const [loading, setLoading] = useState(true);
  
  // Dati
  const [taxModels, setTaxModels] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [stats, setStats] = useState({});
  
  // Filtri
  const [filters, setFilters] = useState({
    tax_model_id: '',
    client_category: '',
    period: '',
    notification_status: '',
    search: ''
  });
  
  // Selezione multipla
  const [selectedAssignments, setSelectedAssignments] = useState([]);
  
  // Dialog
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  
  // Form model
  const [modelForm, setModelForm] = useState({
    name: '',
    description: '',
    applicable_categories: [],
    periodicity: 'trimestrale',
    default_due_day: ''
  });
  
  // Form assignment
  const [assignmentForm, setAssignmentForm] = useState({
    client_id: '',
    tax_model_id: '',
    amount_due: '',
    due_date: '',
    period: '',
    internal_notes: ''
  });
  
  // Bulk assignment
  const [bulkForm, setBulkForm] = useState({
    tax_model_id: '',
    period: '',
    due_date: '',
    category: ''
  });
  const [bulkClients, setBulkClients] = useState([]);
  const [bulkAssignments, setBulkAssignments] = useState({});
  
  // Clienti per dropdown
  const [allClients, setAllClients] = useState([]);
  
  // Notifiche
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [notifyTarget, setNotifyTarget] = useState(null); // 'single' o 'bulk'
  const [notifyAssignment, setNotifyAssignment] = useState(null);
  const [notifyForm, setNotifyForm] = useState({
    custom_message: '',
    send_email: true,
    send_push: true
  });
  const [sendingNotification, setSendingNotification] = useState(false);
  
  const headers = { Authorization: `Bearer ${token}` };

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [modelsRes, categoriesRes, periodsRes, statsRes] = await Promise.all([
        axios.get(`${API}/tax-payments/models`, { headers }),
        axios.get(`${API}/tax-payments/client-categories`, { headers }),
        axios.get(`${API}/tax-payments/periods`, { headers }),
        axios.get(`${API}/tax-payments/stats`, { headers })
      ]);
      
      setTaxModels(modelsRes.data);
      setCategories(categoriesRes.data);
      setPeriods(periodsRes.data);
      setStats(statsRes.data);
      
      // Fetch tutti i clienti per dropdown
      const clientsRes = await axios.get(`${API}/tax-payments/clients-by-category/all`, { headers });
      setAllClients(clientsRes.data);
      
    } catch (error) {
      console.error('Errore caricamento dati:', error);
      toast.error('Errore nel caricamento dei dati');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchAssignments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.tax_model_id) params.append('tax_model_id', filters.tax_model_id);
      if (filters.client_category) params.append('client_category', filters.client_category);
      if (filters.period) params.append('period', filters.period);
      if (filters.notification_status) params.append('notification_status', filters.notification_status);
      if (filters.search) params.append('search', filters.search);
      
      const res = await axios.get(`${API}/tax-payments/assignments?${params.toString()}`, { headers });
      setAssignments(res.data.assignments);
    } catch (error) {
      console.error('Errore caricamento assegnazioni:', error);
    }
  }, [filters, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // =============================================================================
  // TAX MODELS HANDLERS
  // =============================================================================

  const handleSaveModel = async () => {
    if (!modelForm.name.trim()) {
      toast.error('Inserisci il nome del modello');
      return;
    }
    
    try {
      if (editingModel) {
        await axios.put(`${API}/tax-payments/models/${editingModel.id}`, modelForm, { headers });
        toast.success('Modello aggiornato');
      } else {
        await axios.post(`${API}/tax-payments/models`, modelForm, { headers });
        toast.success('Modello creato');
      }
      
      setShowModelDialog(false);
      setEditingModel(null);
      setModelForm({ name: '', description: '', applicable_categories: [], periodicity: 'trimestrale', default_due_day: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore salvataggio modello');
    }
  };

  const handleDeleteModel = async (modelId) => {
    if (!confirm('Sei sicuro di voler disattivare questo modello?')) return;
    
    try {
      await axios.delete(`${API}/tax-payments/models/${modelId}`, { headers });
      toast.success('Modello disattivato');
      fetchData();
    } catch (error) {
      toast.error('Errore disattivazione modello');
    }
  };

  const openEditModel = (model) => {
    setEditingModel(model);
    setModelForm({
      name: model.name,
      description: model.description || '',
      applicable_categories: model.applicable_categories || [],
      periodicity: model.periodicity,
      default_due_day: model.default_due_day || ''
    });
    setShowModelDialog(true);
  };

  // =============================================================================
  // ASSIGNMENT HANDLERS
  // =============================================================================

  const handleSaveAssignment = async () => {
    if (!assignmentForm.client_id || !assignmentForm.tax_model_id || !assignmentForm.amount_due || !assignmentForm.due_date || !assignmentForm.period) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }
    
    try {
      const payload = {
        ...assignmentForm,
        amount_due: parseFloat(assignmentForm.amount_due)
      };
      
      if (editingAssignment) {
        await axios.put(`${API}/tax-payments/assignments/${editingAssignment.id}`, payload, { headers });
        toast.success('Assegnazione aggiornata');
      } else {
        await axios.post(`${API}/tax-payments/assignments`, payload, { headers });
        toast.success('Assegnazione creata');
      }
      
      setShowAssignmentDialog(false);
      setEditingAssignment(null);
      setAssignmentForm({ client_id: '', tax_model_id: '', amount_due: '', due_date: '', period: '', internal_notes: '' });
      fetchAssignments();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore salvataggio');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('Eliminare questa assegnazione?')) return;
    
    try {
      await axios.delete(`${API}/tax-payments/assignments/${assignmentId}`, { headers });
      toast.success('Assegnazione eliminata');
      fetchAssignments();
      fetchData();
    } catch (error) {
      toast.error('Errore eliminazione');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedAssignments.length === 0) return;
    if (!confirm(`Eliminare ${selectedAssignments.length} assegnazioni?`)) return;
    
    try {
      const params = selectedAssignments.map(id => `assignment_ids=${id}`).join('&');
      await axios.delete(`${API}/tax-payments/assignments/bulk?${params}`, { headers });
      toast.success(`${selectedAssignments.length} assegnazioni eliminate`);
      setSelectedAssignments([]);
      fetchAssignments();
      fetchData();
    } catch (error) {
      toast.error('Errore eliminazione');
    }
  };

  const openEditAssignment = (assignment) => {
    setEditingAssignment(assignment);
    setAssignmentForm({
      client_id: assignment.client_id,
      tax_model_id: assignment.tax_model_id,
      amount_due: assignment.amount_due.toString(),
      due_date: assignment.due_date,
      period: assignment.period,
      internal_notes: assignment.internal_notes || ''
    });
    setShowAssignmentDialog(true);
  };

  // =============================================================================
  // BULK ASSIGNMENT HANDLERS
  // =============================================================================

  const loadClientsForBulk = async (category) => {
    try {
      const res = await axios.get(`${API}/tax-payments/clients-by-category/${category}`, { headers });
      setBulkClients(res.data);
      
      // Inizializza bulk assignments
      const initial = {};
      res.data.forEach(client => {
        initial[client.id] = { amount: '', notes: '', selected: true };
      });
      setBulkAssignments(initial);
    } catch (error) {
      toast.error('Errore caricamento clienti');
    }
  };

  const handleBulkSave = async () => {
    if (!bulkForm.tax_model_id || !bulkForm.period || !bulkForm.due_date) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }
    
    const selectedClients = Object.entries(bulkAssignments)
      .filter(([_, data]) => data.selected && data.amount)
      .map(([clientId, data]) => ({
        client_id: clientId,
        amount_due: parseFloat(data.amount),
        internal_notes: data.notes
      }));
    
    if (selectedClients.length === 0) {
      toast.error('Seleziona almeno un cliente con importo');
      return;
    }
    
    try {
      const res = await axios.post(`${API}/tax-payments/assignments/bulk`, {
        tax_model_id: bulkForm.tax_model_id,
        period: bulkForm.period,
        due_date: bulkForm.due_date,
        assignments: selectedClients
      }, { headers });
      
      toast.success(`Creati: ${res.data.created}, Aggiornati: ${res.data.updated}`);
      setShowBulkDialog(false);
      setBulkForm({ tax_model_id: '', period: '', due_date: '', category: '' });
      setBulkClients([]);
      setBulkAssignments({});
      fetchAssignments();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore salvataggio massivo');
    }
  };

  // =============================================================================
  // TOGGLE SELECTION
  // =============================================================================

  // =============================================================================
  // NOTIFICATION HANDLERS
  // =============================================================================

  const openNotifyDialog = (target, assignment = null) => {
    setNotifyTarget(target);
    setNotifyAssignment(assignment);
    setNotifyForm({ custom_message: '', send_email: true, send_push: true });
    setShowNotifyDialog(true);
  };

  const handleSendNotification = async () => {
    setSendingNotification(true);
    
    try {
      if (notifyTarget === 'single' && notifyAssignment) {
        // Invio singolo
        const res = await axios.post(`${API}/tax-payments/notifications/send`, {
          assignment_id: notifyAssignment.id,
          custom_message: notifyForm.custom_message || null,
          send_email: notifyForm.send_email,
          send_push: notifyForm.send_push
        }, { headers });
        
        if (res.data.success) {
          const results = res.data.results;
          let message = 'Notifica inviata: ';
          if (results.email.sent) message += 'Email ✓ ';
          if (results.push.sent) message += 'Push ✓';
          if (!results.email.sent && !results.push.sent) message = 'Nessun canale disponibile';
          
          toast.success(message);
        } else {
          toast.error('Errore invio notifica');
        }
      } else if (notifyTarget === 'bulk' && selectedAssignments.length > 0) {
        // Invio massivo
        const res = await axios.post(`${API}/tax-payments/notifications/send-bulk`, {
          assignment_ids: selectedAssignments,
          custom_message: notifyForm.custom_message || null,
          send_email: notifyForm.send_email,
          send_push: notifyForm.send_push
        }, { headers });
        
        if (res.data.success) {
          const s = res.data.summary;
          toast.success(
            `Invio completato: ${s.email_sent} email, ${s.push_sent} push notification`
          );
          setSelectedAssignments([]);
        }
      }
      
      setShowNotifyDialog(false);
      fetchAssignments();
      fetchData();
      
    } catch (error) {
      console.error('Errore invio notifica:', error);
      toast.error(error.response?.data?.detail || 'Errore invio notifica');
    } finally {
      setSendingNotification(false);
    }
  };

  const handleMarkAsPaid = async (assignmentIds) => {
    const ids = Array.isArray(assignmentIds) ? assignmentIds : [assignmentIds];
    
    try {
      await axios.post(`${API}/tax-payments/notifications/mark-as-paid`, ids, { headers });
      toast.success(`${ids.length} assegnazione/i segnata/e come pagata/e`);
      setSelectedAssignments([]);
      fetchAssignments();
      fetchData();
    } catch (error) {
      toast.error('Errore aggiornamento stato');
    }
  };

  const toggleSelectAll = () => {
    if (selectedAssignments.length === assignments.length) {
      setSelectedAssignments([]);
    } else {
      setSelectedAssignments(assignments.map(a => a.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedAssignments(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tax-payments-management">
      {/* Header con Stats Operativi */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilters(f => ({ ...f, notification_status: 'non_inviata' }))}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm">Da Notificare</p>
                <p className="text-3xl font-bold">{stats.by_status?.non_inviata?.count || 0}</p>
              </div>
              <Bell className="w-10 h-10 text-amber-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilters(f => ({ ...f, notification_status: 'inviata' }))}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Notificati</p>
                <p className="text-3xl font-bold">{stats.by_status?.inviata?.count || 0}</p>
              </div>
              <Send className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilters(f => ({ ...f, notification_status: '__all__' }))}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Urgenti (7gg)</p>
                <p className="text-3xl font-bold">{stats.upcoming_deadlines || 0}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-200" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setFilters(f => ({ ...f, notification_status: 'pagata' }))}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm">Pagati</p>
                <p className="text-3xl font-bold">{stats.by_status?.pagata?.count || 0}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-emerald-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border">
          <TabsTrigger value="assignments" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
            <Receipt className="w-4 h-4 mr-2" />
            Assegnazioni Importi
          </TabsTrigger>
          <TabsTrigger value="models" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
            <FileText className="w-4 h-4 mr-2" />
            Modelli Tributari
          </TabsTrigger>
          <TabsTrigger value="bulk" className="data-[state=active]:bg-teal-500 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />
            Assegnazione Rapida
          </TabsTrigger>
        </TabsList>

        {/* Tab Assegnazioni */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle>Lista Importi Assegnati</CardTitle>
                <div className="flex items-center gap-2">
                  {selectedAssignments.length > 0 && (
                    <>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="bg-teal-600 hover:bg-teal-700"
                        onClick={() => openNotifyDialog('bulk')}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Invia Notifiche ({selectedAssignments.length})
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleMarkAsPaid(selectedAssignments)}
                      >
                        <CheckCheck className="w-4 h-4 mr-2" />
                        Segna Pagati
                      </Button>
                      <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Elimina
                      </Button>
                    </>
                  )}
                  <Button onClick={() => { setEditingAssignment(null); setAssignmentForm({ client_id: '', tax_model_id: '', amount_due: '', due_date: '', period: '', internal_notes: '' }); setShowAssignmentDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuova Assegnazione
                  </Button>
                </div>
              </div>
              
              {/* Filtri */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Cerca cliente..."
                    value={filters.search}
                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filters.tax_model_id || "__all__"} onValueChange={(v) => setFilters(f => ({ ...f, tax_model_id: v === "__all__" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tutti i modelli" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tutti i modelli</SelectItem>
                    {taxModels.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filters.client_category || "__all__"} onValueChange={(v) => setFilters(f => ({ ...f, client_category: v === "__all__" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tutte le categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tutte le categorie</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filters.notification_status || "__all__"} onValueChange={(v) => setFilters(f => ({ ...f, notification_status: v === "__all__" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tutti gli stati" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tutti gli stati</SelectItem>
                    {Object.entries(NOTIFICATION_STATUS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button variant="outline" onClick={() => setFilters({ tax_model_id: '', client_category: '', period: '', notification_status: '', search: '' })}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nessuna assegnazione trovata</p>
                  <p className="text-sm">Crea una nuova assegnazione o modifica i filtri</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="p-3 text-left">
                          <Checkbox 
                            checked={selectedAssignments.length === assignments.length}
                            onCheckedChange={toggleSelectAll}
                          />
                        </th>
                        <th className="p-3 text-left text-sm font-medium text-slate-600">Cliente</th>
                        <th className="p-3 text-left text-sm font-medium text-slate-600">Categoria</th>
                        <th className="p-3 text-left text-sm font-medium text-slate-600">Modello</th>
                        <th className="p-3 text-left text-sm font-medium text-slate-600">Periodo</th>
                        <th className="p-3 text-right text-sm font-medium text-slate-600">Importo</th>
                        <th className="p-3 text-left text-sm font-medium text-slate-600">Scadenza</th>
                        <th className="p-3 text-left text-sm font-medium text-slate-600">Stato</th>
                        <th className="p-3 text-right text-sm font-medium text-slate-600">Azioni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map(assignment => {
                        const StatusIcon = NOTIFICATION_STATUS[assignment.notification_status]?.icon || Clock;
                        const CategoryIcon = CATEGORY_ICONS[assignment.client_category] || User;
                        
                        return (
                          <tr key={assignment.id} className="border-b hover:bg-slate-50">
                            <td className="p-3">
                              <Checkbox 
                                checked={selectedAssignments.includes(assignment.id)}
                                onCheckedChange={() => toggleSelect(assignment.id)}
                              />
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-slate-900">{assignment.client_name}</p>
                                <p className="text-xs text-slate-500">{assignment.client_email}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <CategoryIcon className="w-4 h-4 text-slate-500" />
                                <span className="text-sm capitalize">{assignment.client_category?.replace('_', ' ')}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline">{assignment.tax_model_name}</Badge>
                            </td>
                            <td className="p-3 text-sm">{assignment.period}</td>
                            <td className="p-3 text-right font-semibold text-slate-900">
                              €{assignment.amount_due.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-sm">
                              {new Date(assignment.due_date).toLocaleDateString('it-IT')}
                            </td>
                            <td className="p-3">
                              <Badge className={NOTIFICATION_STATUS[assignment.notification_status]?.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {NOTIFICATION_STATUS[assignment.notification_status]?.label}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {assignment.notification_status !== 'pagata' && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                    onClick={() => openNotifyDialog('single', assignment)}
                                    title="Invia notifica"
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                )}
                                {assignment.notification_status === 'inviata' && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    onClick={() => handleMarkAsPaid(assignment.id)}
                                    title="Segna come pagato"
                                  >
                                    <CheckCheck className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => openEditAssignment(assignment)} title="Modifica">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteAssignment(assignment.id)} title="Elimina">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Modelli Tributari */}
        <TabsContent value="models">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Modelli Tributari</CardTitle>
                <Button onClick={() => { setEditingModel(null); setModelForm({ name: '', description: '', applicable_categories: [], periodicity: 'trimestrale', default_due_day: '' }); setShowModelDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuovo Modello
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {taxModels.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nessun modello tributario</p>
                  <p className="text-sm">Crea il primo modello per iniziare</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {taxModels.map(model => (
                    <Card key={model.id} className="border-slate-200 hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{model.name}</h3>
                            {model.description && (
                              <p className="text-sm text-slate-500 mt-1">{model.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditModel(model)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteModel(model.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4" />
                            <span className="capitalize">{model.periodicity}</span>
                            {model.default_due_day && <span>- Giorno {model.default_due_day}</span>}
                          </div>
                          
                          {model.applicable_categories?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {model.applicable_categories.map(cat => (
                                <Badge key={cat} variant="secondary" className="text-xs capitalize">
                                  {cat.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Assegnazione Rapida */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>Assegnazione Rapida per Categoria</CardTitle>
              <p className="text-sm text-slate-500">
                Seleziona modello, periodo e categoria per assegnare importi a più clienti contemporaneamente
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <Label>Modello Tributario *</Label>
                  <Select 
                    value={bulkForm.tax_model_id} 
                    onValueChange={(v) => setBulkForm(f => ({ ...f, tax_model_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona modello" />
                    </SelectTrigger>
                    <SelectContent>
                      {taxModels.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Periodo *</Label>
                  <Select 
                    value={bulkForm.period} 
                    onValueChange={(v) => setBulkForm(f => ({ ...f, period: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[300px]">
                        {periods.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Data Scadenza *</Label>
                  <Input 
                    type="date" 
                    value={bulkForm.due_date}
                    onChange={(e) => setBulkForm(f => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label>Categoria Clienti</Label>
                  <Select 
                    value={bulkForm.category} 
                    onValueChange={(v) => { setBulkForm(f => ({ ...f, category: v })); loadClientsForBulk(v); }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i clienti</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {bulkClients.length > 0 && (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          <th className="p-3 text-left text-sm font-medium text-slate-600 w-10">
                            <Checkbox 
                              checked={Object.values(bulkAssignments).every(v => v.selected)}
                              onCheckedChange={(checked) => {
                                setBulkAssignments(prev => {
                                  const updated = { ...prev };
                                  Object.keys(updated).forEach(k => {
                                    updated[k] = { ...updated[k], selected: checked };
                                  });
                                  return updated;
                                });
                              }}
                            />
                          </th>
                          <th className="p-3 text-left text-sm font-medium text-slate-600">Cliente</th>
                          <th className="p-3 text-left text-sm font-medium text-slate-600">Categoria</th>
                          <th className="p-3 text-left text-sm font-medium text-slate-600 w-40">Importo (€)</th>
                          <th className="p-3 text-left text-sm font-medium text-slate-600">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkClients.map(client => (
                          <tr key={client.id} className="border-b hover:bg-slate-50">
                            <td className="p-3">
                              <Checkbox 
                                checked={bulkAssignments[client.id]?.selected || false}
                                onCheckedChange={(checked) => {
                                  setBulkAssignments(prev => ({
                                    ...prev,
                                    [client.id]: { ...prev[client.id], selected: checked }
                                  }));
                                }}
                              />
                            </td>
                            <td className="p-3">
                              <p className="font-medium">{client.full_name}</p>
                              <p className="text-xs text-slate-500">{client.email}</p>
                            </td>
                            <td className="p-3 text-sm capitalize">{client.tipo_cliente?.replace('_', ' ')}</td>
                            <td className="p-3">
                              <Input 
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={bulkAssignments[client.id]?.amount || ''}
                                onChange={(e) => {
                                  setBulkAssignments(prev => ({
                                    ...prev,
                                    [client.id]: { ...prev[client.id], amount: e.target.value }
                                  }));
                                }}
                                className="w-full"
                              />
                            </td>
                            <td className="p-3">
                              <Input 
                                placeholder="Note opzionali..."
                                value={bulkAssignments[client.id]?.notes || ''}
                                onChange={(e) => {
                                  setBulkAssignments(prev => ({
                                    ...prev,
                                    [client.id]: { ...prev[client.id], notes: e.target.value }
                                  }));
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button onClick={handleBulkSave} className="bg-teal-600 hover:bg-teal-700">
                      <Save className="w-4 h-4 mr-2" />
                      Salva Assegnazioni ({Object.values(bulkAssignments).filter(v => v.selected && v.amount).length})
                    </Button>
                  </div>
                </>
              )}
              
              {bulkForm.category && bulkClients.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>Nessun cliente in questa categoria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Modello */}
      <Dialog open={showModelDialog} onOpenChange={setShowModelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingModel ? 'Modifica Modello' : 'Nuovo Modello Tributario'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input 
                value={modelForm.name}
                onChange={(e) => setModelForm(f => ({ ...f, name: e.target.value }))}
                placeholder="es. IVA Trimestrale, Modello 130..."
              />
            </div>
            
            <div>
              <Label>Descrizione</Label>
              <Textarea 
                value={modelForm.description}
                onChange={(e) => setModelForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Descrizione opzionale..."
                rows={2}
              />
            </div>
            
            <div>
              <Label>Periodicità</Label>
              <Select 
                value={modelForm.periodicity} 
                onValueChange={(v) => setModelForm(f => ({ ...f, periodicity: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensile">Mensile</SelectItem>
                  <SelectItem value="trimestrale">Trimestrale</SelectItem>
                  <SelectItem value="annuale">Annuale</SelectItem>
                  <SelectItem value="una_tantum">Una Tantum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Giorno scadenza default (1-31)</Label>
              <Input 
                type="number"
                min="1"
                max="31"
                value={modelForm.default_due_day}
                onChange={(e) => setModelForm(f => ({ ...f, default_due_day: e.target.value }))}
                placeholder="es. 20"
              />
            </div>
            
            <div>
              <Label>Categorie applicabili</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {categories.map(cat => (
                  <label key={cat} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox 
                      checked={modelForm.applicable_categories.includes(cat)}
                      onCheckedChange={(checked) => {
                        setModelForm(f => ({
                          ...f,
                          applicable_categories: checked 
                            ? [...f.applicable_categories, cat]
                            : f.applicable_categories.filter(c => c !== cat)
                        }));
                      }}
                    />
                    <span className="text-sm capitalize">{cat.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModelDialog(false)}>Annulla</Button>
            <Button onClick={handleSaveModel} className="bg-teal-600 hover:bg-teal-700">
              <Save className="w-4 h-4 mr-2" />
              {editingModel ? 'Aggiorna' : 'Crea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Assegnazione */}
      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? 'Modifica Assegnazione' : 'Nuova Assegnazione'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Cliente *</Label>
              <Select 
                value={assignmentForm.client_id} 
                onValueChange={(v) => setAssignmentForm(f => ({ ...f, client_id: v }))}
                disabled={!!editingAssignment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona cliente" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {allClients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name} ({c.email})</SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Modello Tributario *</Label>
              <Select 
                value={assignmentForm.tax_model_id} 
                onValueChange={(v) => setAssignmentForm(f => ({ ...f, tax_model_id: v }))}
                disabled={!!editingAssignment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona modello" />
                </SelectTrigger>
                <SelectContent>
                  {taxModels.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Periodo *</Label>
              <Select 
                value={assignmentForm.period} 
                onValueChange={(v) => setAssignmentForm(f => ({ ...f, period: v }))}
                disabled={!!editingAssignment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona periodo" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {periods.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Importo (€) *</Label>
              <Input 
                type="number"
                step="0.01"
                min="0"
                value={assignmentForm.amount_due}
                onChange={(e) => setAssignmentForm(f => ({ ...f, amount_due: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <Label>Data Scadenza *</Label>
              <Input 
                type="date"
                value={assignmentForm.due_date}
                onChange={(e) => setAssignmentForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            
            <div>
              <Label>Note Interne</Label>
              <Textarea 
                value={assignmentForm.internal_notes}
                onChange={(e) => setAssignmentForm(f => ({ ...f, internal_notes: e.target.value }))}
                placeholder="Note opzionali..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignmentDialog(false)}>Annulla</Button>
            <Button onClick={handleSaveAssignment} className="bg-teal-600 hover:bg-teal-700">
              <Save className="w-4 h-4 mr-2" />
              {editingAssignment ? 'Aggiorna' : 'Crea'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Invio Notifica */}
      <Dialog open={showNotifyDialog} onOpenChange={setShowNotifyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-teal-600" />
              {notifyTarget === 'single' ? 'Invia Notifica' : `Invia Notifiche (${selectedAssignments.length})`}
            </DialogTitle>
            <DialogDescription>
              {notifyTarget === 'single' && notifyAssignment ? (
                <span>
                  Invia comunicazione a <strong>{notifyAssignment.client_name}</strong> per{' '}
                  <strong>€{notifyAssignment.amount_due?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</strong>
                </span>
              ) : (
                <span>Invia comunicazione a {selectedAssignments.length} clienti selezionati</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Preview importo per invio singolo */}
            {notifyTarget === 'single' && notifyAssignment && (
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Modello:</span>
                    <p className="font-medium">{notifyAssignment.tax_model_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Periodo:</span>
                    <p className="font-medium">{notifyAssignment.period}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Importo:</span>
                    <p className="font-bold text-lg text-emerald-700">
                      €{notifyAssignment.amount_due?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Scadenza:</span>
                    <p className="font-medium text-amber-700">
                      {new Date(notifyAssignment.due_date).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Canali di invio */}
            <div className="space-y-3">
              <Label>Canali di notifica</Label>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                  <Checkbox 
                    checked={notifyForm.send_email}
                    onCheckedChange={(checked) => setNotifyForm(f => ({ ...f, send_email: checked }))}
                  />
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-xs text-slate-500">Invia email con dettagli completi</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                  <Checkbox 
                    checked={notifyForm.send_push}
                    onCheckedChange={(checked) => setNotifyForm(f => ({ ...f, send_push: checked }))}
                  />
                  <Smartphone className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Push Notification</p>
                    <p className="text-xs text-slate-500">Notifica istantanea su app mobile</p>
                  </div>
                </label>
              </div>
            </div>
            
            {/* Messaggio personalizzato */}
            <div>
              <Label>Messaggio personalizzato (opzionale)</Label>
              <Textarea 
                value={notifyForm.custom_message}
                onChange={(e) => setNotifyForm(f => ({ ...f, custom_message: e.target.value }))}
                placeholder="Aggiungi un messaggio personalizzato che apparirà nella email..."
                rows={3}
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">
                Questo testo verrà inserito nell'email prima dei dettagli dell'importo
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotifyDialog(false)} disabled={sendingNotification}>
              Annulla
            </Button>
            <Button 
              onClick={handleSendNotification} 
              className="bg-teal-600 hover:bg-teal-700"
              disabled={sendingNotification || (!notifyForm.send_email && !notifyForm.send_push)}
            >
              {sendingNotification ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {notifyTarget === 'single' ? 'Invia Notifica' : `Invia a ${selectedAssignments.length} clienti`}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaxPaymentsManagement;
