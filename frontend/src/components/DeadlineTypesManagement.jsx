import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from '@/components/ui/sonner';
import { 
  Calendar, Plus, Settings, FileText, Trash2, Edit, Check, X,
  Users, User, Building2, Home, Briefcase, Search, Clock,
  AlertTriangle, RefreshCw, Repeat, ChevronRight, Eye,
  ListChecks, BookOpen, Sparkles, Bell, Mail, CalendarDays
} from "lucide-react";

// Categorie clienti
const CLIENT_CATEGORIES = [
  { id: "societa", label: "Società", icon: Building2, color: "bg-blue-100 text-blue-700" },
  { id: "autonomo", label: "Autonomi", icon: Briefcase, color: "bg-emerald-100 text-emerald-700" },
  { id: "persona_fisica", label: "Persone Fisiche", icon: User, color: "bg-purple-100 text-purple-700" },
  { id: "vivienda_vacacional", label: "Case Vacanza", icon: Home, color: "bg-amber-100 text-amber-700" },
];

// Frequenze disponibili
const FREQUENCIES = [
  { id: "trimestrale", label: "Trimestrale", description: "4 volte l'anno" },
  { id: "mensile", label: "Mensile", description: "Ogni mese" },
  { id: "annuale", label: "Annuale", description: "Una volta l'anno" },
  { id: "semestrale", label: "Semestrale", description: "2 volte l'anno" },
  { id: "una_tantum", label: "Una Tantum", description: "Singola occorrenza" },
];

// Priorità
const PRIORITIES = [
  { id: "bassa", label: "Bassa", color: "bg-slate-100 text-slate-600" },
  { id: "normale", label: "Normale", color: "bg-blue-100 text-blue-700" },
  { id: "alta", label: "Alta", color: "bg-amber-100 text-amber-700" },
  { id: "urgente", label: "Urgente", color: "bg-red-100 text-red-700" },
];

const DeadlineTypesManagement = ({ token }) => {
  const [activeTab, setActiveTab] = useState("types");
  const [deadlineTypes, setDeadlineTypes] = useState([]);
  const [taxModels, setTaxModels] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [editingModel, setEditingModel] = useState(null);
  const [generatingFor, setGeneratingFor] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesRes, modelsRes, clientsRes] = await Promise.all([
        axios.get(`${API}/deadline-types`, { headers }),
        axios.get(`${API}/tax-models`, { headers }),
        axios.get(`${API}/clients`, { headers })
      ]);
      setDeadlineTypes(typesRes.data);
      setTaxModels(modelsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error("Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  };

  // Delete deadline type
  const deleteDeadlineType = async (typeId) => {
    if (!confirm("Eliminare questo tipo di scadenza?")) return;
    try {
      await axios.delete(`${API}/deadline-types/${typeId}`, { headers });
      toast.success("Tipo eliminato");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore eliminazione");
    }
  };

  // Delete tax model
  const deleteTaxModel = async (modelId) => {
    if (!confirm("Eliminare questo modello tributario?")) return;
    try {
      await axios.delete(`${API}/tax-models/${modelId}`, { headers });
      toast.success("Modello eliminato");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore eliminazione");
    }
  };

  // Generate deadlines
  const generateDeadlines = async (typeId, year) => {
    try {
      const res = await axios.post(
        `${API}/deadline-types/${typeId}/generate-deadlines?year=${year}`,
        {},
        { headers }
      );
      toast.success(res.data.message);
      setShowGenerateDialog(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore generazione");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="deadline-types-management">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="types" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Tipi Scadenza
          </TabsTrigger>
          <TabsTrigger value="models" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Modelli Tributari
          </TabsTrigger>
        </TabsList>

        {/* TAB: TIPI SCADENZA */}
        <TabsContent value="types" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Tipi di Scadenza Standard</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Definisci scadenze ricorrenti per categoria cliente o clienti specifici
                </p>
              </div>
              <Button onClick={() => { setEditingType(null); setShowTypeDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Tipo
              </Button>
            </CardHeader>
            <CardContent>
              {deadlineTypes.length > 0 ? (
                <div className="space-y-4">
                  {deadlineTypes.map(dt => (
                    <DeadlineTypeCard
                      key={dt.id}
                      type={dt}
                      onEdit={() => { setEditingType(dt); setShowTypeDialog(true); }}
                      onDelete={() => deleteDeadlineType(dt.id)}
                      onGenerate={() => { setGeneratingFor(dt); setShowGenerateDialog(true); }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessun tipo di scadenza definito</p>
                  <p className="text-sm text-slate-400">Crea il primo tipo per iniziare</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: MODELLI TRIBUTARI */}
        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Modelli Tributari</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Gestisci i modelli fiscali disponibili per le scadenze
                </p>
              </div>
              <Button onClick={() => { setEditingModel(null); setShowModelDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Modello
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {taxModels.map(model => (
                  <TaxModelCard
                    key={model.id}
                    model={model}
                    onEdit={() => { setEditingModel(model); setShowModelDialog(true); }}
                    onDelete={() => deleteTaxModel(model.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Tipo Scadenza */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Modifica Tipo Scadenza" : "Nuovo Tipo Scadenza"}
            </DialogTitle>
          </DialogHeader>
          <DeadlineTypeForm
            initialData={editingType}
            taxModels={taxModels}
            clients={clients}
            token={token}
            onSuccess={() => { setShowTypeDialog(false); fetchData(); }}
            onCancel={() => setShowTypeDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Modello Tributario */}
      <Dialog open={showModelDialog} onOpenChange={setShowModelDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModel ? "Modifica Modello Tributario" : "Nuovo Modello Tributario"}
            </DialogTitle>
          </DialogHeader>
          <TaxModelForm
            initialData={editingModel}
            token={token}
            onSuccess={() => { setShowModelDialog(false); fetchData(); }}
            onCancel={() => setShowModelDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: Genera Scadenze */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Genera Scadenze</DialogTitle>
          </DialogHeader>
          {generatingFor && (
            <GenerateDeadlinesForm
              deadlineType={generatingFor}
              onGenerate={generateDeadlines}
              onCancel={() => setShowGenerateDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Card per tipo scadenza
const DeadlineTypeCard = ({ type, onEdit, onDelete, onGenerate }) => {
  const frequency = FREQUENCIES.find(f => f.id === type.frequency);
  const priority = PRIORITIES.find(p => p.id === type.priority);

  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: type.color || "#3caca4" }}
            />
            <h3 className="font-semibold text-slate-900">{type.name}</h3>
            {!type.is_active && (
              <Badge className="bg-slate-100 text-slate-500">Disattivato</Badge>
            )}
          </div>
          
          {type.description && (
            <p className="text-sm text-slate-600 mb-3">{type.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            {/* Modello tributario */}
            {type.tax_model && (
              <Badge className="bg-indigo-100 text-indigo-700">
                <FileText className="h-3 w-3 mr-1" />
                {type.tax_model.codice}
              </Badge>
            )}
            
            {/* Frequenza */}
            {frequency && (
              <Badge className="bg-teal-100 text-teal-700">
                <Repeat className="h-3 w-3 mr-1" />
                {frequency.label}
              </Badge>
            )}
            
            {/* Priorità */}
            {priority && (
              <Badge className={priority.color}>{priority.label}</Badge>
            )}
          </div>

          {/* Categorie assegnate */}
          {type.assigned_category_ids?.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              <span className="text-xs text-slate-500 mr-1">Categorie:</span>
              {type.assigned_category_ids.map(catId => {
                const cat = CLIENT_CATEGORIES.find(c => c.id === catId);
                return cat ? (
                  <Badge key={catId} className={`text-xs ${cat.color}`}>
                    {cat.label}
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          {/* Clienti specifici */}
          {type.assigned_client_ids?.length > 0 && (
            <p className="text-xs text-slate-500">
              <Users className="h-3 w-3 inline mr-1" />
              {type.assigned_client_ids.length} clienti specifici assegnati
            </p>
          )}

          {/* Date scadenza */}
          {type.due_dates_description && (
            <p className="text-xs text-slate-400 mt-2">
              <Clock className="h-3 w-3 inline mr-1" />
              {type.due_dates_description}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button size="sm" variant="outline" onClick={onGenerate}>
            <Sparkles className="h-4 w-4 mr-1" />
            Genera
          </Button>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-red-500 hover:text-red-600" 
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Card per modello tributario
const TaxModelCard = ({ model, onEdit, onDelete }) => {
  return (
    <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <Badge className="bg-indigo-100 text-indigo-700 mb-2">{model.codice}</Badge>
          <h3 className="font-semibold text-slate-900">{model.nome}</h3>
        </div>
        {model.is_custom && (
          <Badge className="bg-amber-100 text-amber-700 text-xs">Custom</Badge>
        )}
      </div>

      {model.descrizione && (
        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{model.descrizione}</p>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
        <Repeat className="h-3 w-3" />
        {model.periodicita}
      </div>

      {model.scadenza_tipica && (
        <p className="text-xs text-slate-400 mb-3">
          <Clock className="h-3 w-3 inline mr-1" />
          {model.scadenza_tipica}
        </p>
      )}

      <div className="flex gap-1 pt-2 border-t">
        <Button size="sm" variant="ghost" className="flex-1" onClick={onEdit}>
          <Edit className="h-4 w-4 mr-1" />
          Modifica
        </Button>
        {model.is_custom && (
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-red-500 hover:text-red-600"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

// Form per tipo scadenza
const DeadlineTypeForm = ({ initialData, taxModels, clients, token, onSuccess, onCancel }) => {
  const [data, setData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    tax_model_id: initialData?.tax_model_id || "",
    frequency: initialData?.frequency || "trimestrale",
    due_day: initialData?.due_day || 20,
    due_month: initialData?.due_month || null,
    due_rule: initialData?.due_rule || "giorno_specifico",
    due_dates_description: initialData?.due_dates_description || "",
    reminder_days: initialData?.reminder_days || [7, 3, 1, 0],
    assigned_category_ids: initialData?.assigned_category_ids || [],
    assigned_client_ids: initialData?.assigned_client_ids || [],
    is_active: initialData?.is_active ?? true,
    priority: initialData?.priority || "normale",
    color: initialData?.color || "#3caca4",
    auto_assign_to_category: initialData?.auto_assign_to_category ?? true,
    notification_config: initialData?.notification_config || {
      enabled: true,
      channels: ["push", "email"],
      relative_reminders: [20, 15, 7, 3, 1, 0],
      fixed_dates: [],
      message_template: "Promemoria: {deadline_name} scade il {due_date}"
    }
  });

  const [clientSearch, setClientSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [showFixedDateInput, setShowFixedDateInput] = useState(false);
  const [newFixedDate, setNewFixedDate] = useState("");

  // Opzioni promemoria relativi
  const REMINDER_OPTIONS = [
    { days: 30, label: "30 giorni prima" },
    { days: 20, label: "20 giorni prima" },
    { days: 15, label: "15 giorni prima" },
    { days: 10, label: "10 giorni prima" },
    { days: 7, label: "7 giorni prima" },
    { days: 5, label: "5 giorni prima" },
    { days: 3, label: "3 giorni prima" },
    { days: 2, label: "2 giorni prima" },
    { days: 1, label: "1 giorno prima" },
    { days: 0, label: "Il giorno stesso" },
  ];

  const headers = { Authorization: `Bearer ${token}` };

  const toggleCategory = (catId) => {
    setData(prev => ({
      ...prev,
      assigned_category_ids: prev.assigned_category_ids.includes(catId)
        ? prev.assigned_category_ids.filter(c => c !== catId)
        : [...prev.assigned_category_ids, catId]
    }));
  };

  const toggleClient = (clientId) => {
    setData(prev => ({
      ...prev,
      assigned_client_ids: prev.assigned_client_ids.includes(clientId)
        ? prev.assigned_client_ids.filter(c => c !== clientId)
        : [...prev.assigned_client_ids, clientId]
    }));
  };

  const filteredClients = clients.filter(c => {
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    return c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  // Toggle promemoria relativo
  const toggleRelativeReminder = (days) => {
    setData(prev => {
      const current = prev.notification_config?.relative_reminders || [];
      const updated = current.includes(days)
        ? current.filter(d => d !== days)
        : [...current, days].sort((a, b) => b - a);
      return {
        ...prev,
        notification_config: {
          ...prev.notification_config,
          relative_reminders: updated
        }
      };
    });
  };

  // Aggiungi data fissa
  const addFixedDate = () => {
    if (!newFixedDate) return;
    setData(prev => {
      const current = prev.notification_config?.fixed_dates || [];
      if (current.includes(newFixedDate)) return prev;
      return {
        ...prev,
        notification_config: {
          ...prev.notification_config,
          fixed_dates: [...current, newFixedDate].sort()
        }
      };
    });
    setNewFixedDate("");
    setShowFixedDateInput(false);
  };

  // Rimuovi data fissa
  const removeFixedDate = (date) => {
    setData(prev => ({
      ...prev,
      notification_config: {
        ...prev.notification_config,
        fixed_dates: (prev.notification_config?.fixed_dates || []).filter(d => d !== date)
      }
    }));
  };

  // Toggle canale notifica
  const toggleChannel = (channel) => {
    setData(prev => {
      const current = prev.notification_config?.channels || [];
      const updated = current.includes(channel)
        ? current.filter(c => c !== channel)
        : [...current, channel];
      return {
        ...prev,
        notification_config: {
          ...prev.notification_config,
          channels: updated
        }
      };
    });
  };

  const handleSubmit = async () => {
    if (!data.name.trim()) {
      toast.error("Il nome è obbligatorio");
      return;
    }

    if (data.assigned_category_ids.length === 0 && data.assigned_client_ids.length === 0) {
      toast.error("Seleziona almeno una categoria o un cliente");
      return;
    }

    setSaving(true);
    try {
      if (initialData) {
        await axios.put(`${API}/deadline-types/${initialData.id}`, data, { headers });
        toast.success("Tipo aggiornato");
      } else {
        await axios.post(`${API}/deadline-types`, data, { headers });
        toast.success("Tipo creato");
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info base */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Nome *</Label>
          <Input
            value={data.name}
            onChange={(e) => setData(p => ({ ...p, name: e.target.value }))}
            placeholder="Es: IVA Trimestrale"
          />
        </div>
        <div>
          <Label>Modello Tributario</Label>
          <Select 
            value={data.tax_model_id || "none"} 
            onValueChange={(v) => setData(p => ({ ...p, tax_model_id: v === "none" ? "" : v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona modello..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nessuno</SelectItem>
              {taxModels.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {m.codice} - {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Descrizione</Label>
        <Textarea
          value={data.description}
          onChange={(e) => setData(p => ({ ...p, description: e.target.value }))}
          placeholder="Descrizione della scadenza..."
          rows={2}
        />
      </div>

      {/* Frequenza e priorità */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label>Frequenza</Label>
          <Select 
            value={data.frequency} 
            onValueChange={(v) => setData(p => ({ ...p, frequency: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map(f => (
                <SelectItem key={f.id} value={f.id}>
                  {f.label} ({f.description})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Priorità</Label>
          <Select 
            value={data.priority} 
            onValueChange={(v) => setData(p => ({ ...p, priority: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Colore</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={data.color}
              onChange={(e) => setData(p => ({ ...p, color: e.target.value }))}
              className="w-12 h-10 p-1"
            />
            <Input
              value={data.color}
              onChange={(e) => setData(p => ({ ...p, color: e.target.value }))}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Regola scadenza */}
      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <Label>Giorno del mese</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={data.due_day || ""}
            onChange={(e) => setData(p => ({ ...p, due_day: parseInt(e.target.value) || null }))}
            placeholder="Es: 20"
          />
        </div>
        {(data.frequency === "annuale" || data.frequency === "una_tantum") && (
          <div>
            <Label>Mese</Label>
            <Select 
              value={String(data.due_month || "")} 
              onValueChange={(v) => setData(p => ({ ...p, due_month: parseInt(v) || null }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona mese..." />
              </SelectTrigger>
              <SelectContent>
                {["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
                  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"
                ].map((m, i) => (
                  <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="md:col-span-2">
          <Label>Date tipiche (descrizione)</Label>
          <Input
            value={data.due_dates_description}
            onChange={(e) => setData(p => ({ ...p, due_dates_description: e.target.value }))}
            placeholder="Es: 20 aprile, 20 luglio, 20 ottobre, 30 gennaio"
          />
        </div>
      </div>

      {/* Assegnazione categorie */}
      <div>
        <Label className="mb-3 block">Categorie Clienti</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CLIENT_CATEGORIES.map(cat => {
            const IconComp = cat.icon;
            const isSelected = data.assigned_category_ids.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  isSelected 
                    ? "border-teal-500 bg-teal-50 ring-2 ring-teal-200" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <IconComp className={`h-6 w-6 mb-2 ${isSelected ? "text-teal-600" : "text-slate-400"}`} />
                <span className="font-medium text-sm">{cat.label}</span>
                {isSelected && <Check className="h-4 w-4 text-teal-600 float-right" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Assegnazione clienti specifici */}
      <div>
        <Label className="mb-3 block">Clienti Specifici (opzionale)</Label>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cerca cliente..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {data.assigned_client_ids.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {data.assigned_client_ids.map(id => {
              const client = clients.find(c => c.id === id);
              return (
                <Badge key={id} className="bg-teal-100 text-teal-700 pr-1">
                  {client?.full_name || id}
                  <button onClick={() => toggleClient(id)} className="ml-1 hover:text-teal-900">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        <ScrollArea className="h-40 border rounded-lg">
          <div className="p-2 space-y-1">
            {filteredClients.slice(0, 20).map(client => (
              <button
                key={client.id}
                type="button"
                onClick={() => toggleClient(client.id)}
                className={`w-full p-2 rounded text-left flex items-center gap-2 ${
                  data.assigned_client_ids.includes(client.id)
                    ? "bg-teal-50 text-teal-700"
                    : "hover:bg-slate-50"
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  data.assigned_client_ids.includes(client.id)
                    ? "bg-teal-500 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}>
                  {client.full_name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{client.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{client.email}</p>
                </div>
                {data.assigned_client_ids.includes(client.id) && (
                  <Check className="h-4 w-4 text-teal-500" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* ====== SEZIONE NOTIFICHE ====== */}
      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">Configurazione Notifiche</h3>
          <Switch
            checked={data.notification_config?.enabled ?? true}
            onCheckedChange={(c) => setData(p => ({
              ...p,
              notification_config: { ...p.notification_config, enabled: c }
            }))}
          />
        </div>

        {data.notification_config?.enabled && (
          <div className="space-y-4">
            {/* Canali di notifica */}
            <div>
              <Label className="text-sm text-slate-600 mb-2 block">Canali di Notifica</Label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => toggleChannel("push")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    data.notification_config?.channels?.includes("push")
                      ? "bg-blue-100 border-blue-300 text-blue-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Bell className="h-4 w-4" />
                  <span className="text-sm">Push</span>
                  {data.notification_config?.channels?.includes("push") && (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => toggleChannel("email")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    data.notification_config?.channels?.includes("email")
                      ? "bg-blue-100 border-blue-300 text-blue-700"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Mail className="h-4 w-4" />
                  <span className="text-sm">Email</span>
                  {data.notification_config?.channels?.includes("email") && (
                    <Check className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Promemoria Relativi */}
            <div>
              <Label className="text-sm text-slate-600 mb-2 block">
                Promemoria Relativi alla Scadenza
              </Label>
              <p className="text-xs text-slate-500 mb-3">
                Seleziona quando inviare i promemoria rispetto alla data di scadenza
              </p>
              <div className="grid grid-cols-5 gap-2">
                {REMINDER_OPTIONS.map(({ days, label }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => toggleRelativeReminder(days)}
                    className={`px-2 py-1.5 text-xs rounded border transition-all ${
                      data.notification_config?.relative_reminders?.includes(days)
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {data.notification_config?.relative_reminders?.length > 0 && (
                <p className="text-xs text-blue-600 mt-2">
                  ✓ {data.notification_config.relative_reminders.length} promemoria configurati
                </p>
              )}
            </div>

            {/* Date Fisse */}
            <div>
              <Label className="text-sm text-slate-600 mb-2 block">
                Date Fisse Personalizzate
              </Label>
              <p className="text-xs text-slate-500 mb-3">
                Aggiungi date specifiche per promemoria extra (opzionale)
              </p>
              
              {data.notification_config?.fixed_dates?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {data.notification_config.fixed_dates.map(date => (
                    <Badge key={date} className="bg-purple-100 text-purple-700 pr-1">
                      <CalendarDays className="h-3 w-3 mr-1" />
                      {new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                      <button onClick={() => removeFixedDate(date)} className="ml-1 hover:text-purple-900">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {showFixedDateInput ? (
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={newFixedDate}
                    onChange={(e) => setNewFixedDate(e.target.value)}
                    className="w-40"
                  />
                  <Button size="sm" onClick={addFixedDate} disabled={!newFixedDate}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowFixedDateInput(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFixedDateInput(true)}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Aggiungi data
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ====== AUTO-ASSEGNAZIONE ====== */}
      <div className="border border-green-200 rounded-lg p-4 bg-green-50/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">Assegnazione Automatica</h3>
              <p className="text-xs text-green-700">
                Genera automaticamente le scadenze per tutti i clienti delle categorie selezionate
              </p>
            </div>
          </div>
          <Switch
            checked={data.auto_assign_to_category}
            onCheckedChange={(c) => setData(p => ({ ...p, auto_assign_to_category: c }))}
          />
        </div>
        {data.auto_assign_to_category && data.assigned_category_ids.length > 0 && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
            <p className="text-sm text-green-700">
              <Sparkles className="h-4 w-4 inline mr-1" />
              Quando crei questo tipo, le scadenze verranno generate automaticamente per:
            </p>
            <ul className="mt-2 space-y-1">
              {data.assigned_category_ids.map(catId => {
                const cat = CLIENT_CATEGORIES.find(c => c.id === catId);
                return cat ? (
                  <li key={catId} className="text-sm text-slate-600 flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-500" />
                    Tutti i clienti <strong>{cat.label}</strong>
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Attivo */}
      <div className="flex items-center gap-3">
        <Switch
          checked={data.is_active}
          onCheckedChange={(c) => setData(p => ({ ...p, is_active: c }))}
        />
        <Label>Tipo attivo</Label>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Annulla</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
          {initialData ? "Salva Modifiche" : "Crea Tipo"}
        </Button>
      </DialogFooter>
    </div>
  );
};

// Form per modello tributario
const TaxModelForm = ({ initialData, token, onSuccess, onCancel }) => {
  const [data, setData] = useState({
    codice: initialData?.codice || "",
    nome: initialData?.nome || "",
    descrizione: initialData?.descrizione || "",
    a_cosa_serve: initialData?.a_cosa_serve || "",
    chi_deve_presentarlo: initialData?.chi_deve_presentarlo || "",
    periodicita: initialData?.periodicita || "Trimestrale",
    scadenza_tipica: initialData?.scadenza_tipica || "",
    documenti_necessari: initialData?.documenti_necessari || [],
    conseguenze_mancata_presentazione: initialData?.conseguenze_mancata_presentazione || "",
    note_operative: initialData?.note_operative || ""
  });

  const [newDoc, setNewDoc] = useState("");
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const addDocument = () => {
    if (newDoc.trim()) {
      setData(p => ({ ...p, documenti_necessari: [...p.documenti_necessari, newDoc.trim()] }));
      setNewDoc("");
    }
  };

  const removeDocument = (idx) => {
    setData(p => ({ 
      ...p, 
      documenti_necessari: p.documenti_necessari.filter((_, i) => i !== idx) 
    }));
  };

  const handleSubmit = async () => {
    if (!data.codice.trim() || !data.nome.trim()) {
      toast.error("Codice e nome sono obbligatori");
      return;
    }

    setSaving(true);
    try {
      if (initialData) {
        await axios.put(`${API}/tax-models/${initialData.id}`, data, { headers });
        toast.success("Modello aggiornato");
      } else {
        await axios.post(`${API}/tax-models`, data, { headers });
        toast.success("Modello creato");
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Codice *</Label>
          <Input
            value={data.codice}
            onChange={(e) => setData(p => ({ ...p, codice: e.target.value }))}
            placeholder="Es: Modelo-720"
          />
        </div>
        <div>
          <Label>Periodicità</Label>
          <Select 
            value={data.periodicita} 
            onValueChange={(v) => setData(p => ({ ...p, periodicita: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Mensile">Mensile</SelectItem>
              <SelectItem value="Trimestrale">Trimestrale</SelectItem>
              <SelectItem value="Semestrale">Semestrale</SelectItem>
              <SelectItem value="Annuale">Annuale</SelectItem>
              <SelectItem value="Una Tantum">Una Tantum</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Nome *</Label>
        <Input
          value={data.nome}
          onChange={(e) => setData(p => ({ ...p, nome: e.target.value }))}
          placeholder="Es: Dichiarazione Beni Esteri"
        />
      </div>

      <div>
        <Label>Descrizione</Label>
        <Textarea
          value={data.descrizione}
          onChange={(e) => setData(p => ({ ...p, descrizione: e.target.value }))}
          rows={2}
        />
      </div>

      <div>
        <Label>A cosa serve</Label>
        <Textarea
          value={data.a_cosa_serve}
          onChange={(e) => setData(p => ({ ...p, a_cosa_serve: e.target.value }))}
          rows={2}
        />
      </div>

      <div>
        <Label>Chi deve presentarlo</Label>
        <Textarea
          value={data.chi_deve_presentarlo}
          onChange={(e) => setData(p => ({ ...p, chi_deve_presentarlo: e.target.value }))}
          rows={2}
        />
      </div>

      <div>
        <Label>Scadenza tipica</Label>
        <Input
          value={data.scadenza_tipica}
          onChange={(e) => setData(p => ({ ...p, scadenza_tipica: e.target.value }))}
          placeholder="Es: 31 marzo"
        />
      </div>

      <div>
        <Label>Documenti necessari</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={newDoc}
            onChange={(e) => setNewDoc(e.target.value)}
            placeholder="Aggiungi documento..."
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDocument())}
          />
          <Button type="button" variant="outline" onClick={addDocument}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {data.documenti_necessari.map((doc, idx) => (
            <Badge key={idx} className="bg-slate-100 text-slate-700 pr-1">
              {doc}
              <button onClick={() => removeDocument(idx)} className="ml-1">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Conseguenze mancata presentazione</Label>
        <Textarea
          value={data.conseguenze_mancata_presentazione}
          onChange={(e) => setData(p => ({ ...p, conseguenze_mancata_presentazione: e.target.value }))}
          rows={2}
        />
      </div>

      <div>
        <Label>Note operative</Label>
        <Textarea
          value={data.note_operative}
          onChange={(e) => setData(p => ({ ...p, note_operative: e.target.value }))}
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Annulla</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
          {initialData ? "Salva Modifiche" : "Crea Modello"}
        </Button>
      </DialogFooter>
    </div>
  );
};

// Form per generare scadenze
const GenerateDeadlinesForm = ({ deadlineType, onGenerate, onCancel }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    await onGenerate(deadlineType.id, year);
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-slate-600">
        Genera automaticamente le scadenze per "{deadlineType.name}" per l'anno selezionato.
      </p>

      <div>
        <Label>Anno</Label>
        <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2025, 2026, 2027, 2028].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
        <p><strong>Frequenza:</strong> {deadlineType.frequency}</p>
        {deadlineType.assigned_category_ids?.length > 0 && (
          <p><strong>Categorie:</strong> {deadlineType.assigned_category_ids.join(", ")}</p>
        )}
        {deadlineType.assigned_client_ids?.length > 0 && (
          <p><strong>Clienti specifici:</strong> {deadlineType.assigned_client_ids.length}</p>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Annulla</Button>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Genera Scadenze
        </Button>
      </DialogFooter>
    </div>
  );
};

export default DeadlineTypesManagement;
