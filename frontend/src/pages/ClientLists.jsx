import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Users, 
  Plus,
  Upload,
  Trash2,
  Edit,
  Send,
  FileText,
  Sparkles,
  Bot,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Tag,
  Palette,
  ChevronRight,
  Building2,
  Briefcase,
  User,
  Home,
  Search,
  Eye
} from "lucide-react";

const ClientLists = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [lists, setLists] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("lists");
  
  // Client categories state
  const [clientCategories, setClientCategories] = useState([]);
  
  // Stato per vista categoria dettaglio
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  
  // Stato per vista lista dettaglio
  const [selectedList, setSelectedList] = useState(null);
  const [listSearchTerm, setListSearchTerm] = useState("");
  
  // Upload batch state
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const fileInputRef = useRef(null);
  
  // List form
  const [listForm, setListForm] = useState({ name: "", description: "", color: "#3caca4" });
  const [editingList, setEditingList] = useState(null);
  const [savingList, setSavingList] = useState(false);
  
  // Notification form
  const [notificationForm, setNotificationForm] = useState({ subject: "", content: "" });
  const [sendingNotification, setSendingNotification] = useState(false);
  const [selectedListForNotification, setSelectedListForNotification] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  // Icon map for dynamic categories
  const iconMap = {
    briefcase: Briefcase,
    building: Building2,
    user: User,
    home: Home,
    users: Users
  };

  // Color map for dynamic categories
  const colorMap = {
    blue: { bgColor: "bg-blue-50", textColor: "text-blue-600", borderColor: "border-blue-200" },
    purple: { bgColor: "bg-purple-50", textColor: "text-purple-600", borderColor: "border-purple-200" },
    emerald: { bgColor: "bg-emerald-50", textColor: "text-emerald-600", borderColor: "border-emerald-200" },
    amber: { bgColor: "bg-amber-50", textColor: "text-amber-600", borderColor: "border-amber-200" },
    teal: { bgColor: "bg-teal-50", textColor: "text-teal-600", borderColor: "border-teal-200" },
    slate: { bgColor: "bg-slate-50", textColor: "text-slate-600", borderColor: "border-slate-200" },
    red: { bgColor: "bg-red-50", textColor: "text-red-600", borderColor: "border-red-200" },
    orange: { bgColor: "bg-orange-50", textColor: "text-orange-600", borderColor: "border-orange-200" },
    green: { bgColor: "bg-green-50", textColor: "text-green-600", borderColor: "border-green-200" },
    cyan: { bgColor: "bg-cyan-50", textColor: "text-cyan-600", borderColor: "border-cyan-200" },
    pink: { bgColor: "bg-pink-50", textColor: "text-pink-600", borderColor: "border-pink-200" },
    indigo: { bgColor: "bg-indigo-50", textColor: "text-indigo-600", borderColor: "border-indigo-200" }
  };

  // Helper to get category display props
  const getCategoryDisplayProps = (cat) => {
    const colors = colorMap[cat.color] || colorMap.slate;
    const Icon = iconMap[cat.icon] || Users;
    return { ...colors, icon: Icon };
  };

  // Funzione per ottenere clienti per categoria
  const getClientsInCategory = (categoryId) => {
    return clients.filter(c => c.tipo_cliente === categoryId);
  };

  // Funzione per filtrare clienti in categoria con ricerca
  const getFilteredClientsInCategory = (categoryId) => {
    const categoryClients = getClientsInCategory(categoryId);
    if (!categorySearchTerm.trim()) return categoryClients;
    
    const search = categorySearchTerm.toLowerCase();
    return categoryClients.filter(c => 
      c.full_name?.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.telefono?.includes(search)
    );
  };

  useEffect(() => {
    fetchData();
    fetchClientCategories();
  }, []);

  // Fetch client categories
  const fetchClientCategories = async () => {
    try {
      const res = await axios.get(`${API}/client-categories`, { headers });
      setClientCategories(res.data);
    } catch (error) {
      console.error("Errore nel caricamento categorie:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listsRes, clientsRes] = await Promise.all([
        axios.get(`${API}/client-lists`, { headers }),
        axios.get(`${API}/clients`, { headers })
      ]);
      setLists(listsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error("Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  };

  // List management
  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!listForm.name.trim()) {
      toast.error("Inserisci un nome per la lista");
      return;
    }
    
    setSavingList(true);
    try {
      if (editingList) {
        await axios.put(`${API}/client-lists/${editingList.id}`, listForm, { headers });
        toast.success("Lista aggiornata");
      } else {
        await axios.post(`${API}/client-lists`, listForm, { headers });
        toast.success("Lista creata");
      }
      setListForm({ name: "", description: "", color: "#3caca4" });
      setEditingList(null);
      fetchData();
    } catch (error) {
      toast.error("Errore nell'operazione");
    } finally {
      setSavingList(false);
    }
  };

  const handleDeleteList = async (listId) => {
    if (!confirm("Sei sicuro di voler eliminare questa lista?")) return;
    
    try {
      await axios.delete(`${API}/client-lists/${listId}`, { headers });
      toast.success("Lista eliminata");
      fetchData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleAddClientToList = async (listId, clientId) => {
    try {
      await axios.post(`${API}/client-lists/${listId}/clients/${clientId}`, {}, { headers });
      toast.success("Cliente aggiunto alla lista");
      fetchData();
    } catch (error) {
      toast.error("Errore nell'aggiunta del cliente");
    }
  };

  const handleRemoveClientFromList = async (listId, clientId) => {
    try {
      await axios.delete(`${API}/client-lists/${listId}/clients/${clientId}`, { headers });
      toast.success("Cliente rimosso dalla lista");
      fetchData();
    } catch (error) {
      toast.error("Errore nella rimozione del cliente");
    }
  };

  // Send notification to list
  const handleSendNotificationToList = async (e) => {
    e.preventDefault();
    if (!selectedListForNotification) return;
    if (!notificationForm.subject.trim() || !notificationForm.content.trim()) {
      toast.error("Compila tutti i campi");
      return;
    }
    
    setSendingNotification(true);
    try {
      const formData = new FormData();
      formData.append("subject", notificationForm.subject);
      formData.append("content", notificationForm.content);
      
      const response = await axios.post(
        `${API}/client-lists/${selectedListForNotification.id}/send-notification`,
        formData,
        { headers: { ...headers, "Content-Type": "multipart/form-data" } }
      );
      
      if (response.data.success) {
        toast.success(`Email inviate: ${response.data.sent_count}/${response.data.total_clients}`);
        setNotificationForm({ subject: "", content: "" });
        setSelectedListForNotification(null);
      }
    } catch (error) {
      toast.error("Errore nell'invio delle notifiche");
    } finally {
      setSendingNotification(false);
    }
  };

  // Batch document upload
  const handleBatchUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    setUploadResults(null);
    
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      
      const response = await axios.post(`${API}/documents/upload-batch`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      
      setUploadResults(response.data);
      toast.success(`Elaborati ${response.data.results.length} documenti`);
      
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      toast.error("Errore nel caricamento dei documenti");
    } finally {
      setUploading(false);
    }
  };

  const getClientsInList = (listId) => {
    return clients.filter(c => c.lists?.includes(listId));
  };

  const getClientsNotInList = (listId) => {
    return clients.filter(c => !c.lists?.includes(listId));
  };

  // Funzione per filtrare clienti in lista con ricerca
  const getFilteredClientsInList = (listId) => {
    const listClients = getClientsInList(listId);
    if (!listSearchTerm.trim()) return listClients;
    
    const search = listSearchTerm.toLowerCase();
    return listClients.filter(c => 
      c.full_name?.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.telefono?.includes(search)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/admin")}
              className="text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <span className="font-heading font-bold text-xl text-slate-900">Gestione Avanzata</span>
              <span className="text-xs text-slate-500 block">Liste clienti e caricamento documenti</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-lg">
            <TabsTrigger 
              value="lists" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-6"
            >
              <Tag className="h-4 w-4 mr-2" />
              Liste Clienti
            </TabsTrigger>
            <TabsTrigger 
              value="upload" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-6"
            >
              <Upload className="h-4 w-4 mr-2" />
              Caricamento Globale
            </TabsTrigger>
          </TabsList>

          {/* Lists Tab */}
          <TabsContent value="lists" className="space-y-6">
            {/* Create List Form */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5 text-teal-500" />
                  {editingList ? "Modifica Lista" : "Crea Nuova Lista"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateList} className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Lista *</Label>
                      <Input
                        value={listForm.name}
                        onChange={(e) => setListForm({...listForm, name: e.target.value})}
                        placeholder="Es: Autonomi, Società, Nuovi Clienti..."
                        className="border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Descrizione</Label>
                      <Input
                        value={listForm.description}
                        onChange={(e) => setListForm({...listForm, description: e.target.value})}
                        placeholder="Breve descrizione della lista"
                        className="border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Colore</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={listForm.color}
                          onChange={(e) => setListForm({...listForm, color: e.target.value})}
                          className="w-16 h-10 p-1 border-slate-200"
                        />
                        <Input
                          value={listForm.color}
                          onChange={(e) => setListForm({...listForm, color: e.target.value})}
                          className="border-slate-200 flex-1"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={savingList} className="bg-teal-500 hover:bg-teal-600 text-white">
                      {savingList ? "Salvataggio..." : (editingList ? "Aggiorna" : "Crea Lista")}
                    </Button>
                    {editingList && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setEditingList(null);
                          setListForm({ name: "", description: "", color: "#3caca4" });
                        }}
                      >
                        Annulla
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Lists Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lists.map((list) => {
                const clientCount = list.client_count || getClientsInList(list.id).length;
                
                return (
                  <Card 
                    key={list.id} 
                    className="bg-white border border-slate-200 hover:shadow-md hover:border-teal-300 transition-all cursor-pointer group"
                    onClick={() => {
                      setSelectedList(list);
                      setListSearchTerm("");
                    }}
                    data-testid={`list-card-${list.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: list.color }}
                          ></div>
                          <CardTitle className="font-heading text-lg">{list.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingList(list);
                                setListForm({ name: list.name, description: list.description || "", color: list.color });
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteList(list.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                      {list.description && (
                        <p className="text-sm text-slate-500 mt-1">{list.description}</p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${list.color}20` }}
                          >
                            <Users className="h-5 w-5" style={{ color: list.color }} />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-slate-900">{clientCount}</p>
                            <p className="text-xs text-slate-500">clienti</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedListForNotification(list);
                          }}
                          className="text-teal-600 border-teal-200 hover:bg-teal-50"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Notifica
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {lists.length === 0 && (
                <Card className="col-span-full bg-white border border-slate-200">
                  <CardContent className="py-12 text-center">
                    <Tag className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessuna lista creata</p>
                    <p className="text-sm text-slate-400">Crea la tua prima lista per organizzare i clienti</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Default Lists by Type - NUOVA VERSIONE CLICCABILE */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Clienti per Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientCategories.map((category) => {
                    const count = getClientsInCategory(category.id).length;
                    const displayProps = getCategoryDisplayProps(category);
                    const Icon = displayProps.icon;
                    
                    return (
                      <div 
                        key={category.id}
                        onClick={() => setSelectedCategory({...category, ...displayProps})}
                        className={`p-4 ${displayProps.bgColor} rounded-lg border ${displayProps.borderColor} cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] group`}
                        data-testid={`category-card-${category.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`h-5 w-5 ${displayProps.textColor}`} />
                            <h4 className={`font-semibold ${displayProps.textColor}`}>{category.name}</h4>
                          </div>
                          <ChevronRight className={`h-5 w-5 ${displayProps.textColor} opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all`} />
                        </div>
                        <p className="text-xs text-slate-500 mb-3">{category.description}</p>
                        <p className={`text-2xl font-bold ${displayProps.textColor}`}>
                          {count} <span className="text-sm font-normal text-slate-500">clienti</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Vista Dettaglio Categoria (Dialog) */}
            {selectedCategory && (
              <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && setSelectedCategory(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${selectedCategory.bgColor || 'bg-slate-50'} rounded-lg flex items-center justify-center`}>
                        {(() => {
                          const Icon = selectedCategory.icon || iconMap[selectedCategory.icon] || Users;
                          return <Icon className={`h-5 w-5 ${selectedCategory.textColor || 'text-slate-600'}`} />;
                        })()}
                      </div>
                      <div>
                        <span className="text-xl">{selectedCategory.name}</span>
                        <p className="text-sm font-normal text-slate-500">{selectedCategory.description}</p>
                      </div>
                      <Badge className={`${selectedCategory.bgColor || 'bg-slate-50'} ${selectedCategory.textColor || 'text-slate-600'} ml-auto`}>
                        {getClientsInCategory(selectedCategory.id).length} clienti
                      </Badge>
                    </DialogTitle>
                  </DialogHeader>
                  
                  {/* Barra di ricerca */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Cerca cliente per nome, email o telefono..."
                      value={categorySearchTerm}
                      onChange={(e) => setCategorySearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Lista clienti */}
                  <div className="flex-1 overflow-y-auto mt-4 space-y-2">
                    {getFilteredClientsInCategory(selectedCategory.id).length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">
                          {categorySearchTerm ? "Nessun cliente trovato con questa ricerca" : "Nessun cliente in questa categoria"}
                        </p>
                      </div>
                    ) : (
                      getFilteredClientsInCategory(selectedCategory.id).map((client) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-teal-300 hover:bg-teal-50/30 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedCategory(null);
                            navigate(`/admin/clients/${client.id}`);
                          }}
                          data-testid={`category-client-${client.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 ${selectedCategory.bgColor} rounded-full flex items-center justify-center`}>
                              <User className={`h-5 w-5 ${selectedCategory.textColor}`} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{client.full_name}</p>
                              <p className="text-sm text-slate-500">{client.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {client.telefono && (
                              <span className="text-sm text-slate-500">{client.telefono}</span>
                            )}
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Dettagli
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={() => setSelectedCategory(null)}>
                      Chiudi
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Vista Dettaglio Lista (Dialog) */}
            {selectedList && (
              <Dialog open={!!selectedList} onOpenChange={(open) => !open && setSelectedList(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${selectedList.color}20` }}
                      >
                        <Tag className="h-5 w-5" style={{ color: selectedList.color }} />
                      </div>
                      <div>
                        <span className="text-xl">{selectedList.name}</span>
                        {selectedList.description && (
                          <p className="text-sm font-normal text-slate-500">{selectedList.description}</p>
                        )}
                      </div>
                      <Badge 
                        className="ml-auto"
                        style={{ backgroundColor: `${selectedList.color}20`, color: selectedList.color }}
                      >
                        {getClientsInList(selectedList.id).length} clienti
                      </Badge>
                    </DialogTitle>
                  </DialogHeader>
                  
                  {/* Azioni Lista */}
                  <div className="flex items-center gap-3 py-2">
                    {/* Aggiungi cliente */}
                    <Select onValueChange={(clientId) => {
                      handleAddClientToList(selectedList.id, clientId);
                    }}>
                      <SelectTrigger className="w-[250px] border-slate-200">
                        <Plus className="h-4 w-4 mr-2 text-teal-600" />
                        <SelectValue placeholder="Aggiungi cliente alla lista..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getClientsNotInList(selectedList.id).length === 0 ? (
                          <div className="p-3 text-center text-slate-500 text-sm">
                            Tutti i clienti sono già nella lista
                          </div>
                        ) : (
                          getClientsNotInList(selectedList.id).map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.full_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedList(null);
                        setSelectedListForNotification(selectedList);
                      }}
                      className="text-teal-600 border-teal-200 hover:bg-teal-50"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Invia Notifica a Tutti
                    </Button>
                  </div>
                  
                  {/* Barra di ricerca */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Cerca cliente per nome, email o telefono..."
                      value={listSearchTerm}
                      onChange={(e) => setListSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Lista clienti */}
                  <div className="flex-1 overflow-y-auto mt-4 space-y-2">
                    {getFilteredClientsInList(selectedList.id).length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">
                          {listSearchTerm ? "Nessun cliente trovato con questa ricerca" : "Nessun cliente in questa lista"}
                        </p>
                        <p className="text-sm text-slate-400 mt-2">
                          Usa il menu in alto per aggiungere clienti
                        </p>
                      </div>
                    ) : (
                      getFilteredClientsInList(selectedList.id).map((client) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                          data-testid={`list-client-${client.id}`}
                        >
                          <div 
                            className="flex items-center gap-4 flex-1 cursor-pointer"
                            onClick={() => {
                              setSelectedList(null);
                              navigate(`/admin/clients/${client.id}`);
                            }}
                          >
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${selectedList.color}20` }}
                            >
                              <User className="h-5 w-5" style={{ color: selectedList.color }} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{client.full_name}</p>
                              <p className="text-sm text-slate-500">{client.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {client.telefono && (
                              <span className="text-sm text-slate-500">{client.telefono}</span>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedList(null);
                                navigate(`/admin/clients/${client.id}`);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Dettagli
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveClientFromList(selectedList.id, client.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <DialogFooter className="border-t pt-4">
                    <Button variant="outline" onClick={() => setSelectedList(null)}>
                      Chiudi
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-teal-500" />
                  Caricamento Intelligente Multiplo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-slate-600">
                    Carica più documenti contemporaneamente. L'intelligenza artificiale:
                  </p>
                  <ul className="list-disc list-inside text-slate-600 space-y-1">
                    <li>Leggerà il contenuto di ogni file</li>
                    <li>Identificherà automaticamente a quale cliente appartiene</li>
                    <li>Classificherà il tipo di documento</li>
                    <li>Rinominerà il file con formato standardizzato</li>
                    <li>Inserirà il documento nella cartella del cliente corretto</li>
                  </ul>
                  
                  <div className="border-2 border-dashed border-teal-200 rounded-lg p-8 text-center bg-teal-50/30">
                    <Input
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      multiple
                      onChange={handleBatchUpload}
                      disabled={uploading}
                      className="hidden"
                      id="batch-upload"
                    />
                    <label htmlFor="batch-upload" className="cursor-pointer">
                      <Upload className="h-12 w-12 text-teal-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-slate-700 mb-2">
                        {uploading ? "Elaborazione in corso..." : "Clicca o trascina i file qui"}
                      </p>
                      <p className="text-sm text-slate-500">
                        PDF, Word, Excel, Immagini - Max 10 file alla volta
                      </p>
                    </label>
                    
                    {uploading && (
                      <div className="mt-4 flex items-center justify-center gap-2 text-teal-600">
                        <Bot className="h-5 w-5 animate-bounce" />
                        <span>Analisi AI in corso...</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upload Results */}
            {uploadResults && (
              <Card className="bg-white border border-slate-200">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Risultati Caricamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{uploadResults.assigned_count}</p>
                      <p className="text-sm text-green-700">Assegnati automaticamente</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-amber-600">{uploadResults.needs_verification_count}</p>
                      <p className="text-sm text-amber-700">Da verificare</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-slate-600">{uploadResults.results.length}</p>
                      <p className="text-sm text-slate-700">Totale elaborati</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {uploadResults.results.map((result, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-lg ${
                          result.success 
                            ? (result.needs_verification ? "bg-amber-50" : "bg-green-50")
                            : "bg-red-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className={`h-5 w-5 ${
                              result.success 
                                ? (result.needs_verification ? "text-amber-600" : "text-green-600")
                                : "text-red-600"
                            }`} />
                            <div>
                              <p className="font-medium text-slate-900">
                                {result.standardized_filename || result.original_filename}
                              </p>
                              <p className="text-xs text-slate-500">
                                Originale: {result.original_filename}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {result.success ? (
                              <>
                                {result.client_name ? (
                                  <Badge className={`${
                                    result.needs_verification 
                                      ? "bg-amber-100 text-amber-700" 
                                      : "bg-green-100 text-green-700"
                                  }`}>
                                    {result.client_name}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-red-100 text-red-700">
                                    Cliente non identificato
                                  </Badge>
                                )}
                                <p className="text-xs text-slate-500 mt-1">
                                  Confidenza: {result.client_confidence}
                                </p>
                              </>
                            ) : (
                              <Badge className="bg-red-100 text-red-700">
                                Errore: {result.error}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {uploadResults.needs_verification_count > 0 && (
                    <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                      <p className="text-amber-800">
                        <strong>{uploadResults.needs_verification_count}</strong> documenti richiedono verifica manuale.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => navigate("/admin")}
                        className="mt-2 border-amber-300 text-amber-700"
                      >
                        Vai a "Da Verificare"
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Notification Dialog */}
        <Dialog open={!!selectedListForNotification} onOpenChange={(open) => !open && setSelectedListForNotification(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Invia Notifica a "{selectedListForNotification?.name}"
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSendNotificationToList} className="space-y-4">
              <div className="space-y-2">
                <Label>Oggetto</Label>
                <Input
                  value={notificationForm.subject}
                  onChange={(e) => setNotificationForm({...notificationForm, subject: e.target.value})}
                  placeholder="Oggetto dell'email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Messaggio</Label>
                <Textarea
                  value={notificationForm.content}
                  onChange={(e) => setNotificationForm({...notificationForm, content: e.target.value})}
                  placeholder="Contenuto dell'email..."
                  rows={6}
                  required
                />
              </div>
              <div className="bg-stone-50 p-3 rounded-lg text-sm">
                <p className="text-slate-600">
                  L'email verrà inviata a tutti i <strong>{selectedListForNotification?.client_count || 0}</strong> clienti 
                  attivi nella lista "{selectedListForNotification?.name}".
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedListForNotification(null)}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={sendingNotification}
                  className="bg-teal-500 hover:bg-teal-600 text-white"
                >
                  {sendingNotification ? "Invio..." : "Invia a tutti"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ClientLists;
