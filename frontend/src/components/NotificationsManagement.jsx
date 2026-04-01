import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Bell, Send, Plus, Settings, History, FileText, Calendar,
  Users, User, Building2, Home, Briefcase, Search, X, Check,
  Eye, Trash2, Edit, Clock, AlertTriangle, Info, Palette,
  Image, Mail, Smartphone, Save, RefreshCw
} from "lucide-react";

// Mappa icone disponibili
const ICON_MAP = {
  bell: Bell,
  info: Info,
  calendar: Calendar,
  "file-text": FileText,
  briefcase: Briefcase,
  "alert-triangle": AlertTriangle,
  users: Users,
  mail: Mail,
  clock: Clock
};

// Colori predefiniti corporate
const PRESET_COLORS = [
  { name: "Teal Corporate", value: "#3caca4" },
  { name: "Blu Professionale", value: "#3b82f6" },
  { name: "Viola Elegante", value: "#8b5cf6" },
  { name: "Ambra Avviso", value: "#f59e0b" },
  { name: "Rosso Urgente", value: "#ef4444" },
  { name: "Verde Successo", value: "#22c55e" },
  { name: "Slate Neutro", value: "#64748b" },
  { name: "Indaco", value: "#6366f1" },
];

// Categorie clienti
const CLIENT_CATEGORIES = [
  { id: "societa", label: "Società", icon: Building2 },
  { id: "autonomo", label: "Autonomi", icon: Briefcase },
  { id: "persona_fisica", label: "Persone Fisiche", icon: User },
  { id: "vivienda_vacacional", label: "Case Vacanza", icon: Home },
];

const NotificationsManagement = ({ token }) => {
  const [activeTab, setActiveTab] = useState("create");
  const [notificationTypes, setNotificationTypes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings] = useState(null);
  const [history, setHistory] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state per creazione notifica
  const [formData, setFormData] = useState({
    type_id: "",
    subject: "",
    body: "",
    target_type: "all",
    target_categories: [],
    target_client_ids: [],
    send_email: true,
    send_inapp: true,
    scheduled_at: null,
    isScheduled: false
  });

  const [clientSearch, setClientSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [sending, setSending] = useState(false);

  // Dialog states
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesRes, templatesRes, settingsRes, historyRes, scheduledRes, clientsRes] = await Promise.all([
        axios.get(`${API}/notifications/types`, { headers }),
        axios.get(`${API}/notifications/templates`, { headers }),
        axios.get(`${API}/notifications/settings`, { headers }),
        axios.get(`${API}/notifications/history?limit=50`, { headers }),
        axios.get(`${API}/notifications/scheduled`, { headers }),
        axios.get(`${API}/clients`, { headers })
      ]);

      setNotificationTypes(typesRes.data);
      setTemplates(templatesRes.data);
      setSettings(settingsRes.data);
      setHistory(historyRes.data.items || historyRes.data);
      setScheduled(scheduledRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error("Errore nel caricamento dati");
    } finally {
      setLoading(false);
    }
  };

  // Filtra clienti per ricerca
  const filteredClients = clients.filter(c => {
    if (!clientSearch.trim()) return true;
    const q = clientSearch.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.codice_fiscale?.toLowerCase().includes(q)
    );
  });

  // Toggle selezione categoria
  const toggleCategory = (catId) => {
    setFormData(prev => ({
      ...prev,
      target_categories: prev.target_categories.includes(catId)
        ? prev.target_categories.filter(c => c !== catId)
        : [...prev.target_categories, catId]
    }));
  };

  // Toggle selezione cliente
  const toggleClient = (clientId) => {
    setFormData(prev => ({
      ...prev,
      target_client_ids: prev.target_client_ids.includes(clientId)
        ? prev.target_client_ids.filter(c => c !== clientId)
        : [...prev.target_client_ids, clientId]
    }));
  };

  // Genera anteprima
  const generatePreview = async () => {
    try {
      const res = await axios.post(`${API}/notifications/preview`, {
        subject: formData.subject,
        body: formData.body,
        styles: settings
      }, { headers });
      setPreviewHtml(res.data.html);
      setShowPreview(true);
    } catch (error) {
      toast.error("Errore generazione anteprima");
    }
  };

  // Conta destinatari
  const getRecipientsCount = () => {
    if (formData.target_type === "all") return clients.length;
    if (formData.target_type === "category") {
      return clients.filter(c => formData.target_categories.includes(c.tipo_cliente)).length;
    }
    return formData.target_client_ids.length;
  };

  // Invia notifica
  const sendNotification = async () => {
    if (!formData.type_id || !formData.subject || !formData.body) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    if (formData.target_type === "category" && formData.target_categories.length === 0) {
      toast.error("Seleziona almeno una categoria");
      return;
    }

    if (formData.target_type === "specific" && formData.target_client_ids.length === 0) {
      toast.error("Seleziona almeno un cliente");
      return;
    }

    setSending(true);
    try {
      const payload = {
        type_id: formData.type_id,
        subject: formData.subject,
        body: formData.body,
        target_type: formData.target_type,
        target_categories: formData.target_type === "category" ? formData.target_categories : null,
        target_client_ids: formData.target_type === "specific" ? formData.target_client_ids : null,
        send_email: formData.send_email,
        send_inapp: formData.send_inapp,
        scheduled_at: formData.isScheduled && formData.scheduled_at ? new Date(formData.scheduled_at).toISOString() : null
      };

      const res = await axios.post(`${API}/notifications/send`, payload, { headers });
      
      if (formData.isScheduled) {
        toast.success(`Notifica programmata per ${getRecipientsCount()} destinatari`);
      } else {
        toast.success(`Invio in corso a ${res.data.recipients_count} destinatari`);
      }

      // Reset form
      setFormData({
        type_id: "",
        subject: "",
        body: "",
        target_type: "all",
        target_categories: [],
        target_client_ids: [],
        send_email: true,
        send_inapp: true,
        scheduled_at: null,
        isScheduled: false
      });

      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'invio");
    } finally {
      setSending(false);
    }
  };

  // Carica template
  const loadTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      type_id: template.type_id,
      subject: template.subject,
      body: template.body
    }));
    toast.success("Template caricato");
  };

  // Salva come template
  const saveAsTemplate = async () => {
    const name = prompt("Nome del template:");
    if (!name) return;

    try {
      await axios.post(`${API}/notifications/templates`, {
        name,
        type_id: formData.type_id,
        subject: formData.subject,
        body: formData.body
      }, { headers });
      toast.success("Template salvato");
      fetchData();
    } catch (error) {
      toast.error("Errore nel salvataggio template");
    }
  };

  // Elimina template
  const deleteTemplate = async (templateId) => {
    if (!confirm("Eliminare questo template?")) return;
    try {
      await axios.delete(`${API}/notifications/templates/${templateId}`, { headers });
      toast.success("Template eliminato");
      fetchData();
    } catch (error) {
      toast.error("Errore eliminazione");
    }
  };

  // Annulla notifica programmata
  const cancelScheduled = async (notificationId) => {
    if (!confirm("Annullare questa notifica programmata?")) return;
    try {
      await axios.delete(`${API}/notifications/scheduled/${notificationId}`, { headers });
      toast.success("Notifica annullata");
      fetchData();
    } catch (error) {
      toast.error("Errore annullamento");
    }
  };

  // Aggiorna impostazioni
  const updateSettings = async (newSettings) => {
    try {
      await axios.put(`${API}/notifications/settings`, newSettings, { headers });
      setSettings(prev => ({ ...prev, ...newSettings }));
      toast.success("Impostazioni salvate");
    } catch (error) {
      toast.error("Errore salvataggio impostazioni");
    }
  };

  // Upload logo
  const uploadLogo = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(`${API}/notifications/settings/logo`, formData, { headers });
      toast.success("Logo caricato");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore upload logo");
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
    <div className="space-y-6" data-testid="notifications-management">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Crea</span>
          </TabsTrigger>
          <TabsTrigger value="types" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Tipi</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Template</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Grafica</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Storico</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB: CREA NOTIFICA */}
        <TabsContent value="create" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Colonna 1: Contenuto */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-teal-500" />
                    Contenuto Notifica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tipo notifica */}
                  <div>
                    <Label>Tipo di Notifica *</Label>
                    <Select value={formData.type_id} onValueChange={(v) => setFormData(p => ({ ...p, type_id: v }))}>
                      <SelectTrigger data-testid="notification-type-select">
                        <SelectValue placeholder="Seleziona tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {notificationTypes.map(type => {
                          const IconComp = ICON_MAP[type.icon] || Bell;
                          return (
                            <SelectItem key={type.id} value={type.id}>
                              <div className="flex items-center gap-2">
                                <IconComp className="h-4 w-4" style={{ color: type.color }} />
                                {type.name}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Oggetto */}
                  <div>
                    <Label>Oggetto *</Label>
                    <Input
                      placeholder="Es: Scadenza imminente - Dichiarazione IVA"
                      value={formData.subject}
                      onChange={(e) => setFormData(p => ({ ...p, subject: e.target.value }))}
                      data-testid="notification-subject"
                    />
                  </div>

                  {/* Testo */}
                  <div>
                    <Label>Testo della Notifica *</Label>
                    <Textarea
                      placeholder="Gentile Cliente,&#10;&#10;La informiamo che...&#10;&#10;Cordiali saluti,&#10;Fiscal Tax Canarie"
                      value={formData.body}
                      onChange={(e) => setFormData(p => ({ ...p, body: e.target.value }))}
                      rows={8}
                      className="resize-none"
                      data-testid="notification-body"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Usa doppio invio per creare paragrafi separati
                    </p>
                  </div>

                  {/* Azioni template */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={saveAsTemplate}
                      disabled={!formData.subject || !formData.body}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Salva come Template
                    </Button>
                    {templates.length > 0 && (
                      <Select onValueChange={(id) => {
                        const t = templates.find(t => t.id === id);
                        if (t) loadTemplate(t);
                      }}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Carica template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Opzioni invio */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5 text-teal-500" />
                    Opzioni di Invio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.send_email}
                        onCheckedChange={(c) => setFormData(p => ({ ...p, send_email: c }))}
                      />
                      <Mail className="h-4 w-4 text-blue-500" />
                      <span>Invia Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={formData.send_inapp}
                        onCheckedChange={(c) => setFormData(p => ({ ...p, send_inapp: c }))}
                      />
                      <Smartphone className="h-4 w-4 text-green-500" />
                      <span>Notifica In-App</span>
                    </label>
                  </div>

                  <div className="border-t pt-4">
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                      <Checkbox
                        checked={formData.isScheduled}
                        onCheckedChange={(c) => setFormData(p => ({ ...p, isScheduled: c }))}
                      />
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span>Programma invio</span>
                    </label>
                    {formData.isScheduled && (
                      <Input
                        type="datetime-local"
                        value={formData.scheduled_at || ""}
                        onChange={(e) => setFormData(p => ({ ...p, scheduled_at: e.target.value }))}
                        min={new Date().toISOString().slice(0, 16)}
                        className="max-w-xs"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Colonna 2: Destinatari */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-teal-500" />
                    Destinatari
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tipo destinatari */}
                  <div className="space-y-2">
                    {["all", "category", "specific"].map(type => (
                      <label
                        key={type}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          formData.target_type === type ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="target_type"
                          value={type}
                          checked={formData.target_type === type}
                          onChange={(e) => setFormData(p => ({ ...p, target_type: e.target.value }))}
                          className="sr-only"
                        />
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          formData.target_type === type ? "border-teal-500" : "border-slate-300"
                        }`}>
                          {formData.target_type === type && (
                            <div className="w-2 h-2 rounded-full bg-teal-500" />
                          )}
                        </div>
                        <span className="font-medium">
                          {type === "all" && "Tutti i clienti"}
                          {type === "category" && "Per categoria"}
                          {type === "specific" && "Clienti specifici"}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Selezione categorie */}
                  {formData.target_type === "category" && (
                    <div className="space-y-2 pt-2">
                      <Label>Seleziona Categorie</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {CLIENT_CATEGORIES.map(cat => {
                          const IconComp = cat.icon;
                          const isSelected = formData.target_categories.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              onClick={() => toggleCategory(cat.id)}
                              className={`p-3 rounded-lg border text-left transition-colors ${
                                isSelected ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <IconComp className={`h-5 w-5 mb-1 ${isSelected ? "text-teal-600" : "text-slate-400"}`} />
                              <span className="text-sm font-medium">{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selezione clienti specifici */}
                  {formData.target_type === "specific" && (
                    <div className="space-y-3 pt-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Cerca cliente..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      {formData.target_client_ids.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {formData.target_client_ids.map(id => {
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

                      <ScrollArea className="h-48 border rounded-lg">
                        <div className="p-2 space-y-1">
                          {filteredClients.map(client => (
                            <button
                              key={client.id}
                              onClick={() => toggleClient(client.id)}
                              className={`w-full p-2 rounded text-left flex items-center gap-2 ${
                                formData.target_client_ids.includes(client.id)
                                  ? "bg-teal-50 text-teal-700"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                formData.target_client_ids.includes(client.id)
                                  ? "bg-teal-500 text-white"
                                  : "bg-slate-200 text-slate-600"
                              }`}>
                                {client.full_name?.charAt(0) || "?"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{client.full_name}</p>
                                <p className="text-xs text-slate-500 truncate">{client.email}</p>
                              </div>
                              {formData.target_client_ids.includes(client.id) && (
                                <Check className="h-4 w-4 text-teal-500" />
                              )}
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Conteggio destinatari */}
                  <div className="p-3 bg-slate-100 rounded-lg text-center">
                    <p className="text-2xl font-bold text-slate-800">{getRecipientsCount()}</p>
                    <p className="text-sm text-slate-600">destinatari selezionati</p>
                  </div>
                </CardContent>
              </Card>

              {/* Azioni */}
              <div className="space-y-3">
                <Button
                  onClick={generatePreview}
                  variant="outline"
                  className="w-full"
                  disabled={!formData.subject || !formData.body}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Anteprima
                </Button>
                <Button
                  onClick={sendNotification}
                  className="w-full bg-teal-500 hover:bg-teal-600"
                  disabled={sending || !formData.type_id || !formData.subject || !formData.body}
                  data-testid="send-notification-btn"
                >
                  {sending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {formData.isScheduled ? "Programma Invio" : "Invia Notifica"}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB: TIPI NOTIFICA */}
        <TabsContent value="types">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Tipi di Notifica</CardTitle>
              <Button size="sm" onClick={() => { setEditingType(null); setShowTypeDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Nuovo Tipo
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {notificationTypes.map(type => {
                  const IconComp = ICON_MAP[type.icon] || Bell;
                  return (
                    <div
                      key={type.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${type.color}20` }}>
                          <IconComp className="h-5 w-5" style={{ color: type.color }} />
                        </div>
                        {!type.is_default && (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => { setEditingType(type); setShowTypeDialog(true); }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={async () => {
                                if (!confirm("Eliminare questo tipo?")) return;
                                try {
                                  await axios.delete(`${API}/notifications/types/${type.id}`, { headers });
                                  toast.success("Tipo eliminato");
                                  fetchData();
                                } catch (e) {
                                  toast.error(e.response?.data?.detail || "Errore");
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900">{type.name}</h3>
                      {type.description && (
                        <p className="text-sm text-slate-500 mt-1">{type.description}</p>
                      )}
                      {type.is_default && (
                        <Badge className="mt-2 bg-slate-100 text-slate-600">Predefinito</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: TEMPLATES */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Salvati</CardTitle>
            </CardHeader>
            <CardContent>
              {templates.length > 0 ? (
                <div className="space-y-3">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="p-4 border rounded-lg flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-sm text-slate-600">{template.subject}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Creato: {new Date(template.created_at).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => loadTemplate(template)}>
                          Usa
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessun template salvato</p>
                  <p className="text-sm text-slate-400">Crea una notifica e salvala come template</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: IMPOSTAZIONI GRAFICHE */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="h-5 w-5 text-teal-500" />
                Personalizzazione Grafica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {settings && (
                <>
                  {/* Colori */}
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Colore Primario</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          type="color"
                          value={settings.primary_color}
                          onChange={(e) => updateSettings({ primary_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={settings.primary_color}
                          onChange={(e) => updateSettings({ primary_color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Colore Secondario</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          type="color"
                          value={settings.secondary_color}
                          onChange={(e) => updateSettings({ secondary_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={settings.secondary_color}
                          onChange={(e) => updateSettings({ secondary_color: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Colore Accento</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          type="color"
                          value={settings.accent_color}
                          onChange={(e) => updateSettings({ accent_color: e.target.value })}
                          className="w-12 h-10 p-1 cursor-pointer"
                        />
                        <Input
                          value={settings.accent_color}
                          onChange={(e) => updateSettings({ accent_color: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preset colori */}
                  <div>
                    <Label>Colori Predefiniti</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color.value}
                          onClick={() => updateSettings({ primary_color: color.value })}
                          className="w-8 h-8 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Logo */}
                  <div>
                    <Label>Logo</Label>
                    <div className="flex items-center gap-4 mt-2">
                      {settings.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" className="h-16 object-contain" />
                      ) : (
                        <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center">
                          <Image className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                          className="hidden"
                          id="logo-upload"
                        />
                        <label htmlFor="logo-upload">
                          <Button variant="outline" size="sm" asChild>
                            <span className="cursor-pointer">
                              <Image className="h-4 w-4 mr-1" />
                              Carica Logo
                            </span>
                          </Button>
                        </label>
                        <p className="text-xs text-slate-500 mt-1">Max 2MB, formato immagine</p>
                      </div>
                    </div>
                  </div>

                  {/* Testi */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Intestazione</Label>
                      <Input
                        value={settings.header_text}
                        onChange={(e) => updateSettings({ header_text: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Nome Azienda</Label>
                      <Input
                        value={settings.company_name}
                        onChange={(e) => updateSettings({ company_name: e.target.value })}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Footer</Label>
                    <Input
                      value={settings.footer_text}
                      onChange={(e) => updateSettings({ footer_text: e.target.value })}
                      className="mt-2"
                    />
                  </div>

                  {/* Anteprima */}
                  <Button onClick={generatePreview} variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizza Anteprima Email
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: STORICO */}
        <TabsContent value="history">
          <div className="space-y-6">
            {/* Notifiche programmate */}
            {scheduled.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    Notifiche Programmate ({scheduled.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {scheduled.map(n => (
                      <div key={n.id} className="p-3 bg-white rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-medium">{n.subject}</p>
                          <p className="text-sm text-slate-600">
                            Programmata per: {new Date(n.scheduled_at).toLocaleString("it-IT")}
                          </p>
                          <p className="text-xs text-slate-500">{n.recipients_count} destinatari</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => cancelScheduled(n.id)}
                        >
                          Annulla
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Storico invii */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-teal-500" />
                  Storico Notifiche
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length > 0 ? (
                  <div className="space-y-3">
                    {history.map(n => (
                      <div key={n.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{n.subject}</p>
                            <p className="text-sm text-slate-600 line-clamp-1">{n.body}</p>
                          </div>
                          <Badge className={
                            n.status === "completed" ? "bg-green-100 text-green-700" :
                            n.status === "sending" ? "bg-blue-100 text-blue-700" :
                            n.status === "cancelled" ? "bg-red-100 text-red-700" :
                            "bg-slate-100 text-slate-700"
                          }>
                            {n.status === "completed" ? "Completata" :
                             n.status === "sending" ? "In corso" :
                             n.status === "cancelled" ? "Annullata" :
                             n.status}
                          </Badge>
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-slate-500">
                          <span>Destinatari: {n.recipients_count}</span>
                          <span>Inviate: {n.sent_count || 0}</span>
                          <span>Fallite: {n.failed_count || 0}</span>
                          <span>{new Date(n.created_at).toLocaleString("it-IT")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessuna notifica inviata</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Anteprima */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Anteprima Email</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[500px]"
              title="Anteprima Email"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tipo Notifica */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType ? "Modifica Tipo" : "Nuovo Tipo"}</DialogTitle>
          </DialogHeader>
          <TypeForm
            initialData={editingType}
            onSubmit={async (data) => {
              try {
                if (editingType) {
                  await axios.put(`${API}/notifications/types/${editingType.id}`, data, { headers });
                  toast.success("Tipo aggiornato");
                } else {
                  await axios.post(`${API}/notifications/types`, data, { headers });
                  toast.success("Tipo creato");
                }
                setShowTypeDialog(false);
                fetchData();
              } catch (e) {
                toast.error(e.response?.data?.detail || "Errore");
              }
            }}
            onCancel={() => setShowTypeDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Form per tipo notifica
const TypeForm = ({ initialData, onSubmit, onCancel }) => {
  const [data, setData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    icon: initialData?.icon || "bell",
    color: initialData?.color || "#3caca4"
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>Nome *</Label>
        <Input
          value={data.name}
          onChange={(e) => setData(p => ({ ...p, name: e.target.value }))}
          placeholder="Es: Notifica Urgente"
        />
      </div>
      <div>
        <Label>Descrizione</Label>
        <Input
          value={data.description}
          onChange={(e) => setData(p => ({ ...p, description: e.target.value }))}
          placeholder="Breve descrizione..."
        />
      </div>
      <div>
        <Label>Icona</Label>
        <Select value={data.icon} onValueChange={(v) => setData(p => ({ ...p, icon: v }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ICON_MAP).map(([key, Icon]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {key}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Colore</Label>
        <div className="flex gap-2 mt-2">
          <Input
            type="color"
            value={data.color}
            onChange={(e) => setData(p => ({ ...p, color: e.target.value }))}
            className="w-12 h-10 p-1"
          />
          <Input
            value={data.color}
            onChange={(e) => setData(p => ({ ...p, color: e.target.value }))}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Annulla</Button>
        <Button onClick={() => onSubmit(data)} disabled={!data.name}>
          {initialData ? "Salva" : "Crea"}
        </Button>
      </DialogFooter>
    </div>
  );
};

export default NotificationsManagement;
