import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Users, 
  FileText, 
  Wallet,
  StickyNote,
  LogOut,
  Search,
  User,
  ChevronRight,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Circle,
  BarChart3,
  Activity,
  PieChart,
  TrendingUp,
  Eye,
  Check,
  X,
  Sparkles,
  Plus,
  Mail,
  Send,
  RefreshCw,
  HardDrive,
  Briefcase
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import ConsulentiManagement from "@/components/ConsulentiManagement";
import LanguageSelector from "@/components/LanguageSelector";
import EmployeeManagementAdmin from "@/components/EmployeeManagementAdmin";
import { useLanguage } from "@/i18n/LanguageContext";

const CommercialDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState({});
  const [clients, setClients] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [docSearchTerm, setDocSearchTerm] = useState("");
  const [docSearchResults, setDocSearchResults] = useState([]);
  const [searchingDocs, setSearchingDocs] = useState(false);
  const [activeTab, setActiveTab] = useState("clients");
  const [loading, setLoading] = useState(true);
  const [verifyingDoc, setVerifyingDoc] = useState(null);
  
  // Invite client state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", full_name: "", tipo_cliente: "autonomo" });
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteResult, setInviteResult] = useState(null); // Per mostrare il link dopo l'invio
  const [pendingInvitations, setPendingInvitations] = useState([]); // Inviti pendenti
  const [tipoClienteFilter, setTipoClienteFilter] = useState("all"); // Filtro per tipo cliente

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, clientsRes, logsRes, pendingRes, invitationsRes] = await Promise.all([
        axios.get(`${API}/stats`, { headers }),
        axios.get(`${API}/clients`, { headers }),
        axios.get(`${API}/activity-logs?limit=20`, { headers }),
        axios.get(`${API}/documents/pending-verification`, { headers }),
        axios.get(`${API}/invitations`, { headers })
      ]);
      setStats(statsRes.data);
      setClients(clientsRes.data);
      setActivityLogs(logsRes.data);
      setPendingDocs(pendingRes.data);
      setPendingInvitations(invitationsRes.data);
    } catch (error) {
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client => {
    // Filtro per ricerca testuale
    const matchesSearch = client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.codice_fiscale && client.codice_fiscale.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtro per tipo cliente
    const matchesTipo = tipoClienteFilter === "all" || client.tipo_cliente === tipoClienteFilter;
    
    return matchesSearch && matchesTipo;
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getStatusBadge = (stato) => {
    switch (stato) {
      case "attivo":
        return <Badge className="bg-green-50 text-green-700 border border-green-100">Attivo</Badge>;
      case "sospeso":
        return <Badge className="bg-amber-50 text-amber-700 border border-amber-100">Sospeso</Badge>;
      case "cessato":
        return <Badge className="bg-red-50 text-red-700 border border-red-100">Cessato</Badge>;
      case "pending":
        return <Badge className="bg-purple-50 text-purple-700 border border-purple-100">In attesa</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 border border-slate-200">{stato}</Badge>;
    }
  };

  const getTipoClienteBadge = (tipo) => {
    switch (tipo) {
      case "autonomo":
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-100">Autonomo</Badge>;
      case "societa":
        return <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-100">Società</Badge>;
      case "privato":
        return <Badge className="bg-slate-50 text-slate-700 border border-slate-100">Privato</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 border border-slate-200">{tipo || "N/D"}</Badge>;
    }
  };

  // Invita nuovo cliente
  const handleInviteClient = async (e) => {
    e.preventDefault();
    if (!inviteForm.email) {
      toast.error("Inserisci un'email valida");
      return;
    }
    
    setSendingInvite(true);
    setInviteResult(null);
    try {
      const response = await axios.post(`${API}/clients/invite`, inviteForm, { headers });
      toast.success(`Invito inviato a ${inviteForm.email}!`);
      
      // Mostra il link di invito per copiarlo manualmente se necessario
      setInviteResult({
        email: inviteForm.email,
        link: response.data.invitation_link
      });
      
      setInviteForm({ email: "", full_name: "", tipo_cliente: "autonomo" });
      fetchData(); // Ricarica la lista clienti
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'invio dell'invito");
    } finally {
      setSendingInvite(false);
    }
  };

  // Chiudi dialog invito
  const closeInviteDialog = () => {
    setShowInviteDialog(false);
    setInviteResult(null);
    setInviteForm({ email: "", full_name: "" });
  };

  // Reinvia invito - usa invite_id dalla collection invitations
  const handleResendInvite = async (inviteId, email) => {
    try {
      await axios.post(`${API}/clients/resend-invite/${inviteId}`, {}, { headers });
      toast.success(`Invito reinviato a ${email}`);
      fetchData(); // Ricarica per aggiornare la lista
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nel reinvio dell'invito");
    }
  };

  // Ricerca semantica documenti
  const handleDocSearch = async () => {
    if (!docSearchTerm.trim()) return;
    
    setSearchingDocs(true);
    try {
      const response = await axios.get(`${API}/documents/search?q=${encodeURIComponent(docSearchTerm)}`, { headers });
      setDocSearchResults(response.data);
      if (response.data.length === 0) {
        toast.info("Nessun documento trovato");
      }
    } catch (error) {
      toast.error("Errore nella ricerca");
    } finally {
      setSearchingDocs(false);
    }
  };

  // Verifica documento
  const handleVerifyDoc = async (docId, clientId) => {
    if (!clientId) {
      toast.error("Seleziona un cliente");
      return;
    }
    
    setVerifyingDoc(docId);
    try {
      const formData = new FormData();
      formData.append("client_id", clientId);
      
      await axios.put(`${API}/documents/${docId}/verify`, formData, { headers });
      toast.success("Documento verificato!");
      fetchData();
    } catch (error) {
      toast.error("Errore nella verifica");
    } finally {
      setVerifyingDoc(null);
    }
  };

  // Calcola percentuali per grafici
  const totalDeadlines = (stats.deadlines_da_fare || 0) + (stats.deadlines_in_lavorazione || 0) + 
                         (stats.deadlines_completate || 0) + (stats.deadlines_scadute || 0);
  
  const deadlinePercentages = {
    da_fare: totalDeadlines ? ((stats.deadlines_da_fare || 0) / totalDeadlines * 100).toFixed(1) : 0,
    in_lavorazione: totalDeadlines ? ((stats.deadlines_in_lavorazione || 0) / totalDeadlines * 100).toFixed(1) : 0,
    completate: totalDeadlines ? ((stats.deadlines_completate || 0) / totalDeadlines * 100).toFixed(1) : 0,
    scadute: totalDeadlines ? ((stats.deadlines_scadute || 0) / totalDeadlines * 100).toFixed(1) : 0
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg font-heading">FT</span>
            </div>
            <div>
              <span className="font-heading font-bold text-xl text-slate-900">Fiscal Tax Canarie</span>
              <span className="text-xs text-slate-500 block">Pannello Amministratore</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline"
              onClick={() => navigate("/admin/lists")}
              className="border-teal-200 text-teal-600 hover:bg-teal-50"
              data-testid="manage-lists-btn"
            >
              <Users className="h-4 w-4 mr-2" />
              Liste
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/admin/deadlines")}
              className="border-amber-200 text-amber-600 hover:bg-amber-50"
              data-testid="manage-deadlines-btn"
            >
              <Clock className="h-4 w-4 mr-2" />
              Scadenze
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/admin/models")}
              className="border-teal-200 text-teal-600 hover:bg-teal-50"
              data-testid="manage-models-btn"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Modelli
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/admin/signatures")}
              className="border-purple-200 text-purple-600 hover:bg-purple-50"
              data-testid="manage-signatures-btn"
            >
              <FileText className="h-4 w-4 mr-2" />
              Firma Digitale
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/admin/backup")}
              className="border-green-200 text-green-600 hover:bg-green-50"
              data-testid="manage-backup-btn"
            >
              <HardDrive className="h-4 w-4 mr-2" />
              Backup
            </Button>
            <div className="flex items-center gap-2 text-slate-600">
              <User className="h-5 w-5" />
              <span className="font-medium">{user?.full_name}</span>
              <Badge className="bg-teal-500 text-white ml-2">Commercialista</Badge>
            </div>
            <LanguageSelector variant="flags-only" />
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-slate-200 text-slate-600 hover:text-slate-900"
              data-testid="logout-btn"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t("common.logout")}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-slate-900 mb-2">
            {t("dashboard.adminPanel")}
          </h1>
          <p className="text-slate-600">{t("clients.title")}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-white border border-slate-200 card-hover">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.clients_count || 0}</p>
              <p className="text-xs text-slate-500">{t("dashboard.totalClients")}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 card-hover">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center mb-2">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.clients_active || 0}</p>
              <p className="text-xs text-slate-500">{t("dashboard.activeClients")}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 card-hover">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mb-2">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.documents_count || 0}</p>
              <p className="text-xs text-slate-500">{t("dashboard.documents")}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 card-hover">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.deadlines_da_fare || 0}</p>
              <p className="text-xs text-slate-500">{t("dashboard.deadlinesDue")}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 card-hover">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center mb-2">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.deadlines_scadute || 0}</p>
              <p className="text-xs text-slate-500">{t("dashboard.deadlinesOverdue")}</p>
            </CardContent>
          </Card>
          <Card 
            className="bg-white border border-slate-200 card-hover cursor-pointer"
            onClick={() => setActiveTab("pending")}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center mb-2">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{pendingDocs.length}</p>
              <p className="text-xs text-slate-500">{t("dashboard.toVerify")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-lg flex-wrap">
            <TabsTrigger 
              value="clients" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-clients"
            >
              <Users className="h-4 w-4 mr-2" />
              {t("clients.title")}
            </TabsTrigger>
            <TabsTrigger 
              value="pending" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-pending"
            >
              <Eye className="h-4 w-4 mr-2" />
              {t("dashboard.toVerify")}
              {pendingDocs.length > 0 && (
                <Badge className="ml-2 bg-red-500 text-white text-xs">{pendingDocs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="search" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-search"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {t("common.search")} AI
            </TabsTrigger>
            <TabsTrigger 
              value="stats" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-stats"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {t("dashboard.stats")}
            </TabsTrigger>
            <TabsTrigger 
              value="consulenti" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-consulenti"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              {t("consulenti.title")}
            </TabsTrigger>
            <TabsTrigger 
              value="employees" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-employees"
            >
              <Users className="h-4 w-4 mr-2" />
              {t("employees.title")}
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-activity"
            >
              <Activity className="h-4 w-4 mr-2" />
              {t("dashboard.recentActivity")}
            </TabsTrigger>
          </TabsList>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <Card className="bg-white border border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading text-xl">{t("clients.myClients")}</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder={t("clients.searchClients")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-slate-200"
                      data-testid="search-clients-input"
                    />
                  </div>
                  <Select value={tipoClienteFilter} onValueChange={setTipoClienteFilter}>
                    <SelectTrigger className="w-40 border-slate-200" data-testid="filter-tipo-cliente">
                      <SelectValue placeholder="Filtra tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("clients.allTypes")}</SelectItem>
                      <SelectItem value="autonomo">{t("clients.autonomous")}</SelectItem>
                      <SelectItem value="societa">{t("clients.company")}</SelectItem>
                      <SelectItem value="privato">{t("clients.private")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog open={showInviteDialog} onOpenChange={(open) => {
                    if (open) {
                      setShowInviteDialog(true);
                    } else {
                      closeInviteDialog();
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button className="bg-teal-500 hover:bg-teal-600 text-white" data-testid="invite-client-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        Invita Cliente
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Mail className="h-5 w-5 text-teal-500" />
                          {inviteResult ? "Invito Inviato!" : "Invita Nuovo Cliente"}
                        </DialogTitle>
                      </DialogHeader>
                      
                      {inviteResult ? (
                        // Mostra il link dopo l'invio
                        <div className="space-y-4">
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-green-800 font-medium mb-2">
                              ✅ Invito inviato a {inviteResult.email}
                            </p>
                            <p className="text-sm text-green-700">
                              Il cliente riceverà un'email con il link per completare la registrazione.
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-slate-700">Link di invito (copia manualmente se necessario):</Label>
                            <div className="flex gap-2">
                              <Input
                                value={inviteResult.link}
                                readOnly
                                className="text-xs bg-slate-50 border-slate-200"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  navigator.clipboard.writeText(inviteResult.link);
                                  toast.success("Link copiato!");
                                }}
                                className="shrink-0"
                              >
                                Copia
                              </Button>
                            </div>
                            <p className="text-xs text-slate-500">
                              Puoi inviare questo link manualmente via WhatsApp o altro canale.
                            </p>
                          </div>
                          
                          <DialogFooter>
                            <Button onClick={closeInviteDialog} className="bg-teal-500 hover:bg-teal-600 text-white">
                              Chiudi
                            </Button>
                          </DialogFooter>
                        </div>
                      ) : (
                        // Form di invito
                        <form onSubmit={handleInviteClient} className="space-y-4">
                          <p className="text-sm text-slate-600">
                            Inserisci l'email del cliente. Riceverà un invito per completare la registrazione e accedere all'area clienti.
                          </p>
                          <div className="space-y-2">
                            <Label>Email *</Label>
                            <Input
                              type="email"
                              value={inviteForm.email}
                              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                              placeholder="cliente@email.com"
                              required
                              className="border-slate-200"
                              data-testid="invite-email-input"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Nome (opzionale)</Label>
                            <Input
                              type="text"
                              value={inviteForm.full_name}
                              onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                              placeholder="Mario Rossi"
                              className="border-slate-200"
                              data-testid="invite-name-input"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tipo Cliente</Label>
                            <Select
                              value={inviteForm.tipo_cliente}
                              onValueChange={(v) => setInviteForm({ ...inviteForm, tipo_cliente: v })}
                            >
                              <SelectTrigger className="border-slate-200" data-testid="invite-tipo-select">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="autonomo">Autonomo</SelectItem>
                                <SelectItem value="societa">Società</SelectItem>
                                <SelectItem value="privato">Privato</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeInviteDialog}>
                              Annulla
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={sendingInvite}
                              className="bg-teal-500 hover:bg-teal-600 text-white"
                              data-testid="send-invite-btn"
                            >
                              {sendingInvite ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                  Invio...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Invia Invito
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Sezione Inviti Pendenti */}
                {pendingInvitations.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-purple-700 mb-3 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Inviti in attesa di registrazione ({pendingInvitations.length})
                    </h3>
                    <div className="space-y-2 mb-4">
                      {pendingInvitations.map((invitation) => (
                        <div 
                          key={invitation.id} 
                          className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <Mail className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {invitation.suggested_name || "Cliente"}
                              </p>
                              <p className="text-sm text-slate-500">{invitation.notification_email}</p>
                              <p className="text-xs text-slate-400">
                                Invitato il {format(parseISO(invitation.invitation_sent_at), "dd/MM/yyyy HH:mm", { locale: it })}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvite(invitation.id, invitation.notification_email)}
                            className="border-purple-200 text-purple-600 hover:bg-purple-100"
                            data-testid={`resend-invite-${invitation.id}`}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Reinvia
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="border-b border-slate-200"></div>
                  </div>
                )}

                {/* Lista Clienti Registrati */}
                {filteredClients.length > 0 ? (
                  <div className="space-y-3">
                    {filteredClients.map((client) => (
                      <div 
                        key={client.id} 
                        className="flex items-center justify-between p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/admin/client/${client.id}`)}
                        data-testid={`client-row-${client.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center">
                            <User className="h-6 w-6 text-slate-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900">{client.full_name || "In attesa di registrazione"}</p>
                              {getStatusBadge(client.stato)}
                              {getTipoClienteBadge(client.tipo_cliente)}
                            </div>
                            <p className="text-sm text-slate-500">{client.email}</p>
                            {client.codice_fiscale && (
                              <p className="text-xs text-slate-400">CF: {client.codice_fiscale}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex gap-2">
                            <Badge className="bg-blue-50 text-blue-700 border border-blue-100">
                              <FileText className="h-3 w-3 mr-1" />
                              {client.documents_count}
                            </Badge>
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <Wallet className="h-3 w-3 mr-1" />
                              {client.payslips_count}
                            </Badge>
                            <Badge className="bg-amber-50 text-amber-700 border border-amber-100">
                              <StickyNote className="h-3 w-3 mr-1" />
                              {client.notes_count}
                            </Badge>
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">
                      {searchTerm ? "Nessun cliente trovato" : "Nessun cliente registrato"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Documents Tab */}
          <TabsContent value="pending">
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-xl flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-500" />
                  Documenti da Verificare
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingDocs.length > 0 ? (
                  <div className="space-y-4">
                    {pendingDocs.map((doc) => (
                      <PendingDocCard 
                        key={doc.id} 
                        doc={doc} 
                        clients={clients}
                        onVerify={handleVerifyDoc}
                        verifying={verifyingDoc === doc.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessun documento da verificare</p>
                    <p className="text-sm text-slate-400">Tutti i documenti sono stati assegnati correttamente</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Semantic Search Tab */}
          <TabsContent value="search">
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-teal-500" />
                  Ricerca Semantica Documenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <p className="text-slate-600 mb-4">
                    Cerca documenti usando linguaggio naturale. L'AI troverà i documenti più rilevanti.
                  </p>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Es: fatture IGIC del 2024, contratti di lavoro, dichiarazioni IVA..."
                        value={docSearchTerm}
                        onChange={(e) => setDocSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleDocSearch()}
                        className="pl-10 border-slate-200"
                        data-testid="semantic-search-input"
                      />
                    </div>
                    <Button 
                      onClick={handleDocSearch}
                      disabled={searchingDocs || !docSearchTerm.trim()}
                      className="bg-teal-500 hover:bg-teal-600 text-white"
                    >
                      {searchingDocs ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Cerca con AI
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {docSearchResults.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-500 mb-2">
                      Trovati {docSearchResults.length} documenti rilevanti
                    </p>
                    {docSearchResults.map((doc, idx) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center justify-between p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{doc.title}</p>
                            <p className="text-sm text-slate-500">{doc.file_name}</p>
                            {doc.description && (
                              <p className="text-xs text-slate-400 mt-1">{doc.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-slate-100 text-slate-600">{doc.category}</Badge>
                          {doc.relevance_score && (
                            <Badge className="bg-teal-50 text-teal-700">
                              Score: {doc.relevance_score}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {docSearchResults.length === 0 && docSearchTerm && !searchingDocs && (
                  <div className="text-center py-8">
                    <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Inserisci una query e premi "Cerca con AI"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab with Charts */}
          <TabsContent value="stats">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Grafico Scadenze */}
              <Card className="bg-white border border-slate-200">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-teal-500" />
                    Distribuzione Scadenze
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    {/* Visual Chart */}
                    <div className="relative w-32 h-32">
                      <svg viewBox="0 0 100 100" className="transform -rotate-90">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                        <circle 
                          cx="50" cy="50" r="40" fill="none" 
                          stroke="#f59e0b" strokeWidth="12"
                          strokeDasharray={`${deadlinePercentages.da_fare * 2.51} 251`}
                          strokeDashoffset="0"
                        />
                        <circle 
                          cx="50" cy="50" r="40" fill="none" 
                          stroke="#3b82f6" strokeWidth="12"
                          strokeDasharray={`${deadlinePercentages.in_lavorazione * 2.51} 251`}
                          strokeDashoffset={`-${deadlinePercentages.da_fare * 2.51}`}
                        />
                        <circle 
                          cx="50" cy="50" r="40" fill="none" 
                          stroke="#22c55e" strokeWidth="12"
                          strokeDasharray={`${deadlinePercentages.completate * 2.51} 251`}
                          strokeDashoffset={`-${(parseFloat(deadlinePercentages.da_fare) + parseFloat(deadlinePercentages.in_lavorazione)) * 2.51}`}
                        />
                        <circle 
                          cx="50" cy="50" r="40" fill="none" 
                          stroke="#ef4444" strokeWidth="12"
                          strokeDasharray={`${deadlinePercentages.scadute * 2.51} 251`}
                          strokeDashoffset={`-${(parseFloat(deadlinePercentages.da_fare) + parseFloat(deadlinePercentages.in_lavorazione) + parseFloat(deadlinePercentages.completate)) * 2.51}`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-slate-900">{totalDeadlines}</span>
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                          <span className="text-sm text-slate-600">Da fare</span>
                        </div>
                        <span className="font-semibold text-slate-900">{stats.deadlines_da_fare || 0} ({deadlinePercentages.da_fare}%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-sm text-slate-600">In lavorazione</span>
                        </div>
                        <span className="font-semibold text-slate-900">{stats.deadlines_in_lavorazione || 0} ({deadlinePercentages.in_lavorazione}%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-sm text-slate-600">Completate</span>
                        </div>
                        <span className="font-semibold text-slate-900">{stats.deadlines_completate || 0} ({deadlinePercentages.completate}%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-sm text-slate-600">Scadute</span>
                        </div>
                        <span className="font-semibold text-slate-900">{stats.deadlines_scadute || 0} ({deadlinePercentages.scadute}%)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Overview Stats */}
              <Card className="bg-white border border-slate-200">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-teal-500" />
                    Riepilogo Generale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <span className="text-slate-700">Documenti totali</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-700">{stats.documents_count || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 text-emerald-600" />
                        <span className="text-slate-700">Buste paga</span>
                      </div>
                      <span className="text-2xl font-bold text-emerald-700">{stats.payslips_count || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <StickyNote className="h-5 w-5 text-amber-600" />
                        <span className="text-slate-700">Appunti</span>
                      </div>
                      <span className="text-2xl font-bold text-amber-700">{stats.notes_count || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Eye className="h-5 w-5 text-purple-600" />
                        <span className="text-slate-700">Da verificare</span>
                      </div>
                      <span className="text-2xl font-bold text-purple-700">{pendingDocs.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bars */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Stato Complessivo Scadenze</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">Completate</span>
                      <span className="text-sm font-medium text-green-600">{deadlinePercentages.completate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3">
                      <div 
                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${deadlinePercentages.completate}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">In lavorazione</span>
                      <span className="text-sm font-medium text-blue-600">{deadlinePercentages.in_lavorazione}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3">
                      <div 
                        className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${deadlinePercentages.in_lavorazione}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-slate-600">Scadute</span>
                      <span className="text-sm font-medium text-red-600">{deadlinePercentages.scadute}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3">
                      <div 
                        className="bg-red-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${deadlinePercentages.scadute}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-500" />
                  Attività Recenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activityLogs.length > 0 ? (
                  <div className="space-y-3">
                    {activityLogs.map((log, index) => (
                      <div key={log.id || index} className="flex items-start gap-4 p-3 bg-stone-50 rounded-lg">
                        <div className="w-2 h-2 bg-teal-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-slate-700">{log.description}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(log.timestamp).toLocaleString("it-IT")}
                          </p>
                        </div>
                        <Badge className="bg-slate-100 text-slate-600 text-xs">
                          {log.action}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessuna attività registrata</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consulenti Tab */}
          <TabsContent value="consulenti">
            <ConsulentiManagement token={token} />
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees">
            <EmployeeManagementAdmin token={token} userRole="commercialista" />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// Componente per documento da verificare
const PendingDocCard = ({ doc, clients, onVerify, verifying }) => {
  const [selectedClientId, setSelectedClientId] = useState(doc.client_id || "");

  return (
    <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <p className="font-medium text-slate-900">{doc.title || doc.file_name}</p>
          </div>
          {doc.file_name_original && (
            <p className="text-xs text-slate-500 mb-1">File originale: {doc.file_name_original}</p>
          )}
          {doc.ai_description && (
            <p className="text-sm text-slate-600 mb-2">{doc.ai_description}</p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge className="bg-purple-100 text-purple-700">{doc.category}</Badge>
            {doc.modello_tributario && (
              <Badge className="bg-blue-100 text-blue-700">{doc.modello_tributario}</Badge>
            )}
            {doc.client_confidence && (
              <Badge className={`${
                doc.client_confidence === 'alta' ? 'bg-green-100 text-green-700' :
                doc.client_confidence === 'media' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                Confidenza: {doc.client_confidence}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 min-w-[200px]">
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="border-purple-200 bg-white">
              <SelectValue placeholder="Assegna cliente..." />
            </SelectTrigger>
            <SelectContent>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => onVerify(doc.id, selectedClientId)}
            disabled={verifying || !selectedClientId}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            size="sm"
          >
            {verifying ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Verifica
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommercialDashboard;
