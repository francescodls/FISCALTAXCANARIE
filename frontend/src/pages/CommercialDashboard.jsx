import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from '@/components/ui/sonner';
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
  Briefcase,
  Upload,
  FolderUp,
  Trash2,
  Euro,
  MessageSquare,
  Building2,
  Home,
  Bell,
  UserCog
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import ConsulentiManagement from "@/components/ConsulentiManagement";
import LanguageSelector from "@/components/LanguageSelector";
import EmployeeManagementAdmin from "@/components/EmployeeManagementAdmin";
import GlobalFeesManagement from "@/components/GlobalFeesManagement";
import GlobalTicketManagement from "@/components/GlobalTicketManagement";
import AdminProfileDialog from "@/components/AdminProfileDialog";
import NotificationsManagement from "@/components/NotificationsManagement";
import { useLanguage } from "@/i18n/LanguageContext";

const CommercialDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState({});
  const [clients, setClients] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [scheduledNotifications, setScheduledNotifications] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [docSearchTerm, setDocSearchTerm] = useState("");
  const [docSearchResults, setDocSearchResults] = useState([]);
  const [searchingDocs, setSearchingDocs] = useState(false);
  const [activeTab, setActiveTab] = useState("clients");
  const [loading, setLoading] = useState(true);
  const [verifyingDoc, setVerifyingDoc] = useState(null);
  
  // Create client state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ 
    full_name: "", 
    email: "", 
    tipo_cliente: "autonomo",
    phone: "",
    nie: "",
    citta: "",
    send_invite: true
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [pendingInvitations, setPendingInvitations] = useState([]); // Inviti pendenti
  const [tipoClienteFilter, setTipoClienteFilter] = useState("all"); // Filtro per tipo cliente
  const [clientLists, setClientLists] = useState([]); // Liste/Categorie clienti
  const [showGlobalUpload, setShowGlobalUpload] = useState(false); // Dialog caricamento globale
  const [employeeNotifications, setEmployeeNotifications] = useState([]); // Notifiche dipendenti
  const [employeeNotifCount, setEmployeeNotifCount] = useState(0); // Conteggio notifiche non lette
  const [showProfileDialog, setShowProfileDialog] = useState(false); // Dialog profilo personale
  const [teamCount, setTeamCount] = useState(0); // Conteggio membri team

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
    fetchClientLists();
    fetchEmployeeNotifications();
    fetchTeamCount();
  }, []);

  const fetchTeamCount = async () => {
    try {
      // Fetch consulenti + dipendenti per conteggio team
      const [consulentiRes, employeesRes] = await Promise.all([
        axios.get(`${API}/consulenti`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/employees`, { headers }).catch(() => ({ data: [] }))
      ]);
      const consulentiCount = Array.isArray(consulentiRes.data) ? consulentiRes.data.length : 0;
      const employeesCount = Array.isArray(employeesRes.data) ? employeesRes.data.length : 0;
      setTeamCount(consulentiCount + employeesCount);
    } catch (error) {
      console.error("Errore nel caricamento conteggio team:", error);
    }
  };

  const fetchClientLists = async () => {
    try {
      const response = await axios.get(`${API}/client-lists`, { headers });
      setClientLists(response.data);
    } catch (error) {
      console.error("Errore nel caricamento categorie:", error);
    }
  };

  const fetchEmployeeNotifications = async () => {
    try {
      const [countRes, notifsRes] = await Promise.all([
        axios.get(`${API}/employee-notifications/count`, { headers }),
        axios.get(`${API}/employee-notifications?unread_only=false`, { headers })
      ]);
      setEmployeeNotifCount(countRes.data.unread_count);
      setEmployeeNotifications(notifsRes.data);
    } catch (error) {
      console.error("Errore nel caricamento notifiche dipendenti:", error);
    }
  };

  const markEmployeeNotificationRead = async (notificationId) => {
    try {
      await axios.put(`${API}/employee-notifications/${notificationId}/read`, {}, { headers });
      fetchEmployeeNotifications();
    } catch (error) {
      toast.error("Errore nell'aggiornamento della notifica");
    }
  };

  const markAllEmployeeNotificationsRead = async () => {
    try {
      await axios.put(`${API}/employee-notifications/read-all`, {}, { headers });
      fetchEmployeeNotifications();
      toast.success("Tutte le notifiche segnate come lette");
    } catch (error) {
      toast.error("Errore nell'aggiornamento delle notifiche");
    }
  };

  const deleteEmployeeNotification = async (notificationId) => {
    try {
      await axios.delete(`${API}/employee-notifications/${notificationId}`, { headers });
      fetchEmployeeNotifications();
      toast.success("Notifica eliminata");
    } catch (error) {
      toast.error("Errore nell'eliminazione della notifica");
    }
  };

  const deleteAllEmployeeNotifications = async () => {
    if (!window.confirm("Sei sicuro di voler eliminare tutte le notifiche? Questa azione non può essere annullata.")) {
      return;
    }
    try {
      await axios.delete(`${API}/employee-notifications`, { headers });
      fetchEmployeeNotifications();
      toast.success("Tutte le notifiche eliminate");
    } catch (error) {
      toast.error("Errore nell'eliminazione delle notifiche");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, clientsRes, logsRes, pendingRes, invitationsRes, scheduledRes] = await Promise.all([
        axios.get(`${API}/stats`, { headers }),
        axios.get(`${API}/clients`, { headers }),
        axios.get(`${API}/activity-logs?limit=20`, { headers }),
        axios.get(`${API}/documents/pending-verification`, { headers }),
        axios.get(`${API}/invitations`, { headers }),
        axios.get(`${API}/notifications/scheduled`, { headers }).catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setClients(clientsRes.data);
      setActivityLogs(logsRes.data);
      setPendingDocs(pendingRes.data);
      setPendingInvitations(invitationsRes.data);
      setScheduledNotifications(scheduledRes.data);
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
        return <Badge className="bg-green-50 text-green-700 border border-green-100">{t('profile.active')}</Badge>;
      case "invitato":
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-100">{t('clients.inviteSent')}</Badge>;
      case "sospeso":
        return <Badge className="bg-amber-50 text-amber-700 border border-amber-100">{t('profile.suspended')}</Badge>;
      case "cessato":
        return <Badge className="bg-red-50 text-red-700 border border-red-100">{t('profile.ceased')}</Badge>;
      case "pending":
        return <Badge className="bg-purple-50 text-purple-700 border border-purple-100">{t('deadlines.pending')}</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 border border-slate-200">{stato}</Badge>;
    }
  };

  const getTipoClienteBadge = (tipo) => {
    switch (tipo) {
      case "autonomo":
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-100">{t('clients.autonomous')}</Badge>;
      case "societa":
        return <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-100">{t('clients.company')}</Badge>;
      case "privato":
        return <Badge className="bg-slate-50 text-slate-700 border border-slate-100">{t('clients.private')}</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 border border-slate-200">{tipo || "N/D"}</Badge>;
    }
  };

  // Crea nuovo cliente
  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!createForm.full_name.trim()) {
      toast.error("Inserisci il nome del cliente");
      return;
    }
    
    setCreatingClient(true);
    setCreateResult(null);
    try {
      // Filtra i campi vuoti per evitare errori di validazione
      const payload = {
        full_name: createForm.full_name.trim(),
        tipo_cliente: createForm.tipo_cliente || "autonomo",
        send_invite: createForm.send_invite
      };
      
      // Aggiungi solo i campi con valore
      if (createForm.email?.trim()) payload.email = createForm.email.trim();
      if (createForm.phone?.trim()) payload.phone = createForm.phone.trim();
      if (createForm.nie?.trim()) payload.nie = createForm.nie.trim();
      if (createForm.citta?.trim()) payload.citta = createForm.citta.trim();
      
      const response = await axios.post(`${API}/clients/create`, payload, { headers });
      
      // Mostra il risultato
      setCreateResult({
        client_id: response.data.client_id,
        full_name: createForm.full_name,
        email: createForm.email,
        invitation_link: response.data.invitation_link,
        email_sent: response.data.email_sent
      });
      
      toast.success(response.data.message);
      fetchData(); // Ricarica la lista clienti
    } catch (error) {
      // Gestisce gli errori di validazione Pydantic che restituiscono un array o oggetto
      const detail = error.response?.data?.detail;
      let errorMessage = "Errore nella creazione del cliente";
      if (typeof detail === "string") {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail.map(d => d.msg || d).join(", ");
      } else if (detail?.msg) {
        errorMessage = detail.msg;
      }
      toast.error(errorMessage);
    } finally {
      setCreatingClient(false);
    }
  };

  // Chiudi dialog creazione e vai alla cartella
  const closeCreateDialogAndNavigate = (clientId) => {
    setShowCreateDialog(false);
    setCreateResult(null);
    setCreateForm({ 
      full_name: "", 
      email: "", 
      tipo_cliente: "autonomo",
      phone: "",
      nie: "",
      citta: "",
      send_invite: true
    });
    if (clientId) {
      navigate(`/admin/client/${clientId}`);
    }
  };

  // Chiudi dialog creazione
  const closeCreateDialog = () => {
    setShowCreateDialog(false);
    setCreateResult(null);
    setCreateForm({ 
      full_name: "", 
      email: "", 
      tipo_cliente: "autonomo",
      phone: "",
      nie: "",
      citta: "",
      send_invite: true
    });
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

  // Elimina invito cliente
  const handleDeleteInvite = async (inviteId, name) => {
    if (!window.confirm(`Sei sicuro di voler eliminare l'invito per "${name}"? Questa azione non può essere annullata.`)) {
      return;
    }
    try {
      await axios.delete(`${API}/invitations/${inviteId}`, { headers });
      toast.success("Invito eliminato con successo");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'eliminazione dell'invito");
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
              {t('admin.categories')}
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/admin/deadlines")}
              className="border-amber-200 text-amber-600 hover:bg-amber-50"
              data-testid="manage-deadlines-btn"
            >
              <Clock className="h-4 w-4 mr-2" />
              {t('deadlines.title')}
            </Button>
            <Button 
              variant="outline"
              onClick={() => setShowGlobalUpload(true)}
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
              data-testid="global-upload-btn"
            >
              <FolderUp className="h-4 w-4 mr-2" />
              {t('documents.uploadDocument')}
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/admin/models")}
              className="border-teal-200 text-teal-600 hover:bg-teal-50"
              data-testid="manage-models-btn"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {t('admin.models')}
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate("/admin/backup")}
              className="border-green-200 text-green-600 hover:bg-green-50"
              data-testid="manage-backup-btn"
            >
              <HardDrive className="h-4 w-4 mr-2" />
              {t('admin.backup')}
            </Button>
            <div 
              className="flex items-center gap-2 text-slate-600 cursor-pointer hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors"
              onClick={() => setShowProfileDialog(true)}
              data-testid="profile-button"
            >
              <Avatar className="h-8 w-8 border border-slate-200">
                {user?.profile_image ? (
                  <AvatarImage src={user.profile_image} alt={user.full_name} />
                ) : null}
                <AvatarFallback className="bg-purple-100 text-purple-700 text-sm font-semibold">
                  {user?.first_name?.[0] || user?.full_name?.[0] || ''}{user?.last_name?.[0] || ''}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{user?.first_name || user?.full_name?.split(' ')[0]} {user?.last_name || ''}</span>
              <Badge className={user?.role === 'super_admin' ? 'bg-purple-500 text-white ml-1' : 'bg-teal-500 text-white ml-1'}>
                {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </Badge>
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
          <Card 
            className="bg-white border border-slate-200 card-hover cursor-pointer"
            onClick={() => setActiveTab("clients")}
            data-testid="stats-total-clients"
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.clients_count || 0}</p>
              <p className="text-xs text-slate-500">{t("dashboard.totalClients")}</p>
            </CardContent>
          </Card>
          <Card 
            className="bg-white border border-slate-200 card-hover cursor-pointer"
            onClick={() => setActiveTab("consulenti")}
            data-testid="stats-team"
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center mb-2">
                <UserCog className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{teamCount}</p>
              <p className="text-xs text-slate-500">Team</p>
            </CardContent>
          </Card>
          <Card 
            className="bg-white border border-slate-200 card-hover cursor-pointer"
            onClick={() => navigate("/admin/deadlines")}
            data-testid="stats-deadlines-due"
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.deadlines_da_fare || 0}</p>
              <p className="text-xs text-slate-500">{t("dashboard.deadlinesDue")}</p>
            </CardContent>
          </Card>
          <Card 
            className="bg-white border border-slate-200 card-hover cursor-pointer"
            onClick={() => setActiveTab("notifications")}
            data-testid="stats-notifications"
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center mb-2">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{scheduledNotifications.length}</p>
              <p className="text-xs text-slate-500">Notifiche Programmate</p>
            </CardContent>
          </Card>
          <Card 
            className="bg-white border border-slate-200 card-hover cursor-pointer"
            onClick={() => setActiveTab("pending")}
            data-testid="stats-to-verify"
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center mb-2">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{pendingDocs.length}</p>
              <p className="text-xs text-slate-500">{t("dashboard.toVerify")}</p>
            </CardContent>
          </Card>
          <Card 
            className="bg-white border border-slate-200 card-hover cursor-pointer"
            onClick={() => navigate("/admin/declarations")}
            data-testid="stats-declarations"
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center mb-2">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">Redditi</p>
              <p className="text-xs text-slate-500">Dichiarazioni</p>
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
              value="notifications" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-notifications"
            >
              <Send className="h-4 w-4 mr-2" />
              Notifiche
              {scheduledNotifications.length > 0 && (
                <Badge className="ml-2 bg-amber-500 text-white text-xs">{scheduledNotifications.length}</Badge>
              )}
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
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4 relative"
              data-testid="tab-employees"
            >
              <Users className="h-4 w-4 mr-2" />
              {t("employees.title")}
              {employeeNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {employeeNotifCount > 9 ? '9+' : employeeNotifCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="fees" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-fees"
            >
              <Euro className="h-4 w-4 mr-2" />
              {t('fees.title')}
            </TabsTrigger>
            <TabsTrigger 
              value="tickets" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-tickets"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('tickets.title')}
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
                  <Dialog open={showCreateDialog} onOpenChange={(open) => {
                    if (open) {
                      setShowCreateDialog(true);
                    } else {
                      closeCreateDialog();
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button className="bg-teal-500 hover:bg-teal-600 active:bg-slate-900 active:scale-95 text-white transition-all" data-testid="create-client-btn">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('clients.newClient')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <User className="h-5 w-5 text-teal-500" />
                          {createResult ? t('messages.saveSuccess') : t('clients.newClient')}
                        </DialogTitle>
                      </DialogHeader>
                      
                      {createResult ? (
                        // Mostra risultato dopo la creazione
                        <div className="space-y-4">
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-green-800 font-medium mb-2">
                              Cliente "{createResult.full_name}" creato con successo
                            </p>
                            {createResult.email_sent && (
                              <p className="text-sm text-green-700">
                                Invito inviato a {createResult.email}
                              </p>
                            )}
                          </div>
                          
                          {createResult.invitation_link && (
                            <div className="space-y-2">
                              <Label className="text-slate-700">Link di registrazione:</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={createResult.invitation_link}
                                  readOnly
                                  className="text-xs bg-slate-50 border-slate-200"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    navigator.clipboard.writeText(createResult.invitation_link);
                                    toast.success("Link copiato!");
                                  }}
                                  className="shrink-0"
                                >
                                  Copia
                                </Button>
                              </div>
                              <p className="text-xs text-slate-500">
                                Invia questo link al cliente via WhatsApp o altro canale.
                              </p>
                            </div>
                          )}
                          
                          <DialogFooter className="flex gap-2">
                            <Button variant="outline" onClick={closeCreateDialog}>
                              Chiudi
                            </Button>
                            <Button 
                              onClick={() => closeCreateDialogAndNavigate(createResult.client_id)} 
                              className="bg-teal-500 hover:bg-teal-600 active:bg-slate-900 active:scale-95 text-white transition-all"
                            >
                              <ChevronRight className="h-4 w-4 mr-2" />
                              Vai alla Cartella
                            </Button>
                          </DialogFooter>
                        </div>
                      ) : (
                        // Form di creazione
                        <form onSubmit={handleCreateClient} className="space-y-4">
                          <p className="text-sm text-slate-600">
                            Crea la cartella del cliente. Potrai subito caricare documenti e gestire l'anagrafica.
                          </p>
                          
                          {/* Nome - obbligatorio */}
                          <div className="space-y-2">
                            <Label>Nome / Ragione Sociale *</Label>
                            <Input
                              type="text"
                              value={createForm.full_name}
                              onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                              placeholder="Mario Rossi / Azienda SRL"
                              required
                              className="border-slate-200"
                              data-testid="create-name-input"
                            />
                          </div>
                          
                          {/* Tipo Cliente */}
                          <div className="space-y-2">
                            <Label>Tipo Cliente</Label>
                            <Select
                              value={createForm.tipo_cliente}
                              onValueChange={(v) => setCreateForm({ ...createForm, tipo_cliente: v })}
                            >
                              <SelectTrigger className="border-slate-200" data-testid="create-tipo-select">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="autonomo">{t('clients.autonomous')}</SelectItem>
                                <SelectItem value="societa">{t('clients.company')}</SelectItem>
                                <SelectItem value="privato">{t('clients.private')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Campi opzionali in grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label>{t('profile.phone')}</Label>
                              <Input
                                type="tel"
                                value={createForm.phone}
                                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                                placeholder="+34 666 123 456"
                                className="border-slate-200"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>NIE</Label>
                              <Input
                                type="text"
                                value={createForm.nie}
                                onChange={(e) => setCreateForm({ ...createForm, nie: e.target.value })}
                                placeholder="X1234567A"
                                className="border-slate-200"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>{t('profile.city')}</Label>
                            <Input
                              type="text"
                              value={createForm.citta}
                              onChange={(e) => setCreateForm({ ...createForm, citta: e.target.value })}
                              placeholder="Las Palmas"
                              className="border-slate-200"
                            />
                          </div>
                          
                          {/* Sezione Email e Invito */}
                          <div className="border-t pt-4 mt-4">
                            <div className="space-y-2">
                              <Label>Email ({t('common.optional')})</Label>
                              <Input
                                type="email"
                                value={createForm.email}
                                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                placeholder="cliente@email.com"
                                className="border-slate-200"
                                data-testid="create-email-input"
                              />
                              <p className="text-xs text-slate-500">
                                Se inserisci l'email, il cliente potrà registrarsi e accedere alla propria area.
                              </p>
                            </div>
                            
                            {createForm.email && (
                              <div className="flex items-center gap-2 mt-3 p-3 bg-blue-50 rounded-lg">
                                <input
                                  type="checkbox"
                                  id="send_invite"
                                  checked={createForm.send_invite}
                                  onChange={(e) => setCreateForm({ ...createForm, send_invite: e.target.checked })}
                                  className="h-4 w-4 rounded border-slate-300"
                                />
                                <label htmlFor="send_invite" className="text-sm text-blue-700">
                                  Invia email di invito alla registrazione
                                </label>
                              </div>
                            )}
                          </div>
                          
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={closeCreateDialog}>
                              Annulla
                            </Button>
                            <Button 
                              type="submit" 
                              disabled={creatingClient}
                              className="bg-teal-500 hover:bg-teal-600 active:bg-slate-900 active:scale-95 text-white transition-all"
                              data-testid="create-client-submit-btn"
                            >
                              {creatingClient ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                  Creazione...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Crea Cliente
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
                {/* Sezione Inviti Pendenti - Solo per inviti senza cartella cliente */}
                {pendingInvitations.filter(inv => !inv.has_client_folder).length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-purple-700 mb-3 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Inviti in attesa di registrazione ({pendingInvitations.filter(inv => !inv.has_client_folder).length})
                    </h3>
                    <div className="space-y-2 mb-4">
                      {pendingInvitations.filter(inv => !inv.has_client_folder).map((invitation) => (
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
                          <div className="flex items-center gap-2">
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteInvite(invitation.id, invitation.suggested_name || invitation.notification_email)}
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              data-testid={`delete-invite-${invitation.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
                            <p className="text-sm text-slate-500">
                              {client.email || client.email_notifica || "Nessuna email"}
                              {!client.email && client.email_notifica && (
                                <span className="text-xs text-blue-500 ml-2">(invito)</span>
                              )}
                            </p>
                            {client.codice_fiscale && (
                              <p className="text-xs text-slate-400">CF: {client.codice_fiscale}</p>
                            )}
                            {client.nie && (
                              <p className="text-xs text-slate-400">NIE: {client.nie}</p>
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
            <div className="space-y-6">
              {/* Header con statistiche */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-heading font-semibold text-slate-900 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-purple-500" />
                    Documenti da Verificare
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Documenti che l'AI non è riuscita a classificare correttamente
                  </p>
                </div>
                {pendingDocs.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-purple-100 rounded-lg">
                      <span className="text-2xl font-bold text-purple-700">{pendingDocs.length}</span>
                      <span className="text-sm text-purple-600 ml-2">in attesa</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Guida rapida */}
              {pendingDocs.length > 0 && (
                <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-purple-900">Come gestire i documenti sospesi</p>
                        <ul className="text-sm text-purple-700 mt-1 space-y-1">
                          <li>1. Cerca il cliente corretto usando nome, email, codice fiscale, NIE o CIF</li>
                          <li>2. Seleziona il cliente dalla lista dei risultati</li>
                          <li>3. Clicca "Assegna a Cliente" per completare la verifica</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lista documenti */}
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
                <Card className="bg-white border border-slate-200">
                  <CardContent className="py-16">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Tutto in ordine!</h3>
                      <p className="text-slate-500">Nessun documento da verificare</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Tutti i documenti sono stati assegnati correttamente ai clienti
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
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
                      className="bg-teal-500 hover:bg-teal-600 active:bg-slate-900 active:scale-95 text-white transition-all"
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

            {/* Clienti per Categoria */}
            <Card className="bg-white border border-slate-200 mb-6">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-500" />
                  Clienti per Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Società */}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Building2 className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-blue-800">Società</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-blue-700">{stats.clients_by_category?.societa || 0}</span>
                      <span className="text-xs text-blue-600">
                        ({stats.clients_active_by_category?.societa || 0} attive)
                      </span>
                    </div>
                  </div>

                  {/* Autonomi */}
                  <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-emerald-500 rounded-lg">
                        <Briefcase className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-emerald-800">Autonomi</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-emerald-700">{stats.clients_by_category?.autonomo || 0}</span>
                      <span className="text-xs text-emerald-600">
                        ({stats.clients_active_by_category?.autonomo || 0} attivi)
                      </span>
                    </div>
                  </div>

                  {/* Persone Fisiche */}
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-purple-800">Persone Fisiche</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-purple-700">{stats.clients_by_category?.persona_fisica || 0}</span>
                      <span className="text-xs text-purple-600">
                        ({stats.clients_active_by_category?.persona_fisica || 0} attive)
                      </span>
                    </div>
                  </div>

                  {/* Case Vacanza */}
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-amber-500 rounded-lg">
                        <Home className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-sm font-medium text-amber-800">Case Vacanza</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-amber-700">{stats.clients_by_category?.vivienda_vacacional || 0}</span>
                      <span className="text-xs text-amber-600">
                        ({stats.clients_active_by_category?.vivienda_vacacional || 0} attive)
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Totale */}
                <div className="mt-4 p-3 bg-slate-100 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Totale Clienti</span>
                  <span className="text-xl font-bold text-slate-800">{stats.clients_by_category?.totale || 0}</span>
                </div>
              </CardContent>
            </Card>

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

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <NotificationsManagement token={token} />
          </TabsContent>

          {/* Consulenti Tab */}
          <TabsContent value="consulenti">
            <ConsulentiManagement token={token} />
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            {/* Notifiche Dipendenti */}
            {employeeNotifications.length > 0 && (
              <Card className={`border ${employeeNotifCount > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading text-lg flex items-center gap-2">
                      {employeeNotifCount > 0 && (
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      )}
                      Notifiche Dipendenti
                      {employeeNotifCount > 0 && (
                        <Badge className="bg-red-500 text-white ml-2">{employeeNotifCount} non lette</Badge>
                      )}
                    </CardTitle>
                    {employeeNotifCount > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={markAllEmployeeNotificationsRead}
                        className="border-red-200 text-red-600 hover:bg-red-100"
                      >
                        Segna tutte come lette
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deleteAllEmployeeNotifications}
                      className="border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Elimina tutte
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {employeeNotifications.slice(0, 10).map((notif) => (
                      <div 
                        key={notif.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          notif.is_read 
                            ? 'bg-white border-slate-100' 
                            : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {!notif.is_read && (
                                <span className="h-2 w-2 bg-red-500 rounded-full flex-shrink-0"></span>
                              )}
                              <p className={`font-medium ${notif.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
                                {notif.title}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {notif.notification_type === 'hire_request' ? 'Assunzione' : 
                                 notif.notification_type === 'termination_request' ? 'Licenziamento' : 
                                 notif.notification_type === 'document_upload' ? 'Documento' :
                                 notif.notification_type === 'consulente_document_upload' ? 'Doc. Consulente' :
                                 notif.notification_type}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600">{notif.message}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                              {notif.client_name && (
                                <span>Cliente: {notif.client_name}</span>
                              )}
                              {notif.employee_name && (
                                <span>Dipendente: {notif.employee_name}</span>
                              )}
                              <span>{new Date(notif.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          {!notif.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markEmployeeNotificationRead(notif.id)}
                              className="text-slate-500 hover:text-slate-700"
                            >
                              Segna letta
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEmployeeNotification(notif.id)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Gestione Dipendenti */}
            <EmployeeManagementAdmin token={token} userRole="commercialista" />
          </TabsContent>

          {/* Fees Tab */}
          <TabsContent value="fees" className="space-y-6">
            <GlobalFeesManagement token={token} />
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <GlobalTicketManagement token={token} />
          </TabsContent>
        </Tabs>

        {/* Global Upload Dialog */}
        <Dialog open={showGlobalUpload} onOpenChange={setShowGlobalUpload}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-xl flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-500" />
                Caricamento Intelligente Documenti
              </DialogTitle>
            </DialogHeader>
            <SmartDocumentUpload 
              token={token} 
              onClose={() => setShowGlobalUpload(false)}
              onSuccess={() => fetchData()}
            />
          </DialogContent>
        </Dialog>

        {/* Admin Profile Dialog */}
        <AdminProfileDialog 
          open={showProfileDialog} 
          onOpenChange={setShowProfileDialog} 
          token={token} 
        />
      </main>
    </div>
  );
};

// Componente per documento da verificare
const PendingDocCard = ({ doc, clients, onVerify, verifying, onPreview }) => {
  const [selectedClientId, setSelectedClientId] = useState(doc.client_id && doc.client_id !== "unassigned" ? doc.client_id : "");
  const [searchQuery, setSearchQuery] = useState("");
  const [showClientSearch, setShowClientSearch] = useState(false);
  const { t } = useLanguage();

  // Filtra clienti in base alla ricerca
  const filteredClients = clients.filter(client => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (client.full_name && client.full_name.toLowerCase().includes(query)) ||
      (client.email && client.email.toLowerCase().includes(query)) ||
      (client.codice_fiscale && client.codice_fiscale.toLowerCase().includes(query)) ||
      (client.nie && client.nie.toLowerCase().includes(query)) ||
      (client.nif && client.nif.toLowerCase().includes(query)) ||
      (client.cif && client.cif.toLowerCase().includes(query)) ||
      (client.company_name && client.company_name.toLowerCase().includes(query))
    );
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Mappa motivi sospensione a etichette
  const getReasonLabel = (reason) => {
    const labels = {
      verifica_richiesta: { text: "Verifica richiesta", color: "bg-amber-100 text-amber-700" },
      cliente_non_assegnato: { text: "Cliente non assegnato", color: "bg-red-100 text-red-700" },
      confidenza_bassa: { text: "Confidenza AI bassa", color: "bg-orange-100 text-orange-700" },
      ai_non_classificato: { text: "AI non ha classificato", color: "bg-slate-100 text-slate-700" }
    };
    return labels[reason] || { text: reason, color: "bg-slate-100 text-slate-600" };
  };

  const handleSelectClient = (clientId) => {
    setSelectedClientId(clientId);
    setShowClientSearch(false);
    setSearchQuery("");
  };

  return (
    <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid={`pending-doc-${doc.id}`}>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Info documento */}
        <div className="flex-1">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate">{doc.title || doc.file_name}</p>
              {doc.file_name_original && doc.file_name_original !== doc.file_name && (
                <p className="text-xs text-slate-400 truncate">Originale: {doc.file_name_original}</p>
              )}
            </div>
          </div>

          {/* Descrizione AI */}
          {doc.ai_description && (
            <p className="text-sm text-slate-600 mb-3 line-clamp-2">{doc.ai_description}</p>
          )}

          {/* Badge motivi sospensione */}
          <div className="flex flex-wrap gap-2 mb-3">
            {doc.suspension_reasons?.map((reason, idx) => {
              const { text, color } = getReasonLabel(reason);
              return (
                <Badge key={idx} className={`${color} text-xs`}>
                  {text}
                </Badge>
              );
            })}
            {doc.category && (
              <Badge className="bg-slate-100 text-slate-600 text-xs">{doc.category}</Badge>
            )}
          </div>

          {/* Data caricamento */}
          <p className="text-xs text-slate-400">
            Caricato: {doc.created_at ? new Date(doc.created_at).toLocaleDateString('it-IT', { 
              day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
            }) : 'N/D'}
          </p>
        </div>

        {/* Sezione assegnazione cliente */}
        <div className="lg:w-80 space-y-3">
          {/* Ricerca cliente */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cerca cliente (nome, email, CF, NIE, CIF...)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowClientSearch(true);
                }}
                onFocus={() => setShowClientSearch(true)}
                className="pl-10 border-purple-200 focus:border-purple-400"
                data-testid={`search-client-${doc.id}`}
              />
            </div>

            {/* Dropdown risultati ricerca */}
            {showClientSearch && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredClients.length > 0 ? (
                  filteredClients.slice(0, 10).map(client => (
                    <button
                      key={client.id}
                      onClick={() => handleSelectClient(client.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center gap-3 border-b border-slate-100 last:border-0 ${
                        selectedClientId === client.id ? 'bg-purple-50' : ''
                      }`}
                      data-testid={`select-client-${client.id}`}
                    >
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-sm font-medium text-slate-600">
                        {client.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{client.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{client.email}</p>
                        {(client.codice_fiscale || client.nie || client.cif) && (
                          <p className="text-xs text-slate-400 truncate">
                            {client.codice_fiscale || client.nie || client.cif}
                          </p>
                        )}
                      </div>
                      {selectedClientId === client.id && (
                        <Check className="h-4 w-4 text-purple-600" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-slate-500">
                    <User className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">Nessun cliente trovato</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cliente selezionato */}
          {selectedClient && (
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center text-sm font-bold text-purple-700">
                  {selectedClient.full_name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-purple-900 truncate">{selectedClient.full_name}</p>
                  <p className="text-xs text-purple-600 truncate">{selectedClient.email}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedClientId("");
                    setSearchQuery("");
                  }}
                  className="p-1 hover:bg-purple-200 rounded"
                >
                  <X className="h-4 w-4 text-purple-600" />
                </button>
              </div>
            </div>
          )}

          {/* Pulsante assegnazione */}
          <Button
            onClick={() => onVerify(doc.id, selectedClientId)}
            disabled={verifying || !selectedClientId}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium"
            data-testid={`verify-btn-${doc.id}`}
          >
            {verifying ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Assegna a Cliente
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Click fuori per chiudere dropdown */}
      {showClientSearch && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowClientSearch(false)}
        />
      )}
    </div>
  );
};

// Componente per caricamento intelligente documenti con AI
const SmartDocumentUpload = ({ token, onClose, onSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };
  const MAX_FILES = 15; // Massimo 15 file alla volta per stabilità

  const handleFilesSelect = (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => {
      const ext = f.name.toLowerCase().split('.').pop();
      return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'].includes(ext);
    });
    
    if (validFiles.length < fileArray.length) {
      toast.warning("Alcuni file non sono supportati e sono stati ignorati");
    }
    
    if (validFiles.length > MAX_FILES) {
      toast.warning(`Puoi selezionare massimo ${MAX_FILES} file alla volta`);
      setSelectedFiles(prev => [...prev, ...validFiles.slice(0, MAX_FILES - prev.length)].slice(0, MAX_FILES));
    } else {
      setSelectedFiles(prev => [...prev, ...validFiles].slice(0, MAX_FILES));
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setUploadResults([]);
    setShowResults(false);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Seleziona almeno un file da caricare");
      return;
    }

    setUploading(true);
    setUploadResults([]);
    
    try {
      // Crea FormData con tutti i file
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append("files", file);
      });

      // Usa l'endpoint batch che analizza con AI
      const response = await axios.post(`${API}/documents/upload-batch`, formData, {
        headers: { 
          ...headers, 
          "Content-Type": "multipart/form-data" 
        },
        timeout: 120000 // 2 minuti timeout per elaborazione AI
      });

      const data = response.data;
      const results = data.results || [];
      setUploadResults(results);
      setShowResults(true);
      
      // Conta successi ed errori
      const successes = results.filter(r => r.success);
      const failures = results.filter(r => !r.success);
      const needsVerification = results.filter(r => r.needs_verification);
      
      if (failures.length === 0) {
        if (needsVerification.length > 0) {
          toast.success(`${successes.length} documenti caricati. ${needsVerification.length} richiedono verifica del cliente.`);
        } else {
          toast.success(`${successes.length} documenti caricati e classificati con successo!`);
        }
      } else {
        toast.warning(`${successes.length} caricati, ${failures.length} errori`);
      }
      
      setSelectedFiles([]);
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error("Errore upload batch:", error);
      const errorMsg = error.response?.data?.detail;
      if (typeof errorMsg === 'string') {
        toast.error(errorMsg);
      } else if (Array.isArray(errorMsg)) {
        toast.error(errorMsg.map(e => e.msg || e).join(", "));
      } else {
        toast.error("Errore durante il caricamento dei documenti");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-teal-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-teal-500 rounded-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800">Caricamento Intelligente con AI</h4>
            <p className="text-sm text-slate-600 mt-1">
              Carica fino a {MAX_FILES} documenti. L'intelligenza artificiale li analizzerà automaticamente per:
            </p>
            <ul className="text-sm text-slate-600 mt-2 space-y-1">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-teal-500" />
                Identificare il cliente dal contenuto
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-teal-500" />
                Rinominare con formato standard
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-teal-500" />
                Classificare nella categoria corretta
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Risultati upload */}
      {showResults && uploadResults.length > 0 && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-h-64 overflow-y-auto">
          <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Risultati Elaborazione
          </h4>
          <div className="space-y-2">
            {uploadResults.map((result, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border ${
                  result.success 
                    ? result.needs_verification 
                      ? 'bg-amber-50 border-amber-200' 
                      : 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {result.original_filename}
                    </p>
                    {result.success && (
                      <>
                        <p className="text-xs text-slate-600 mt-1">
                          → <span className="font-medium">{result.standardized_filename}</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Cliente: {result.client_name || "Non identificato"} 
                          {result.client_confidence && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                              result.client_confidence === 'alta' 
                                ? 'bg-green-100 text-green-700'
                                : result.client_confidence === 'media'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {result.client_confidence}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          Categoria: <span className="font-medium">{result.category}</span>
                        </p>
                      </>
                    )}
                    {!result.success && (
                      <p className="text-xs text-red-600 mt-1">{result.error || "Errore sconosciuto"}</p>
                    )}
                  </div>
                  {result.success ? (
                    result.needs_verification ? (
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    )
                  ) : (
                    <X className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Area upload con drag & drop */}
      {!showResults && (
        <>
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              dragActive 
                ? 'border-teal-500 bg-teal-50 scale-[1.02]' 
                : selectedFiles.length > 0 
                  ? 'border-teal-400 bg-teal-50/50' 
                  : 'border-slate-200 hover:border-teal-400 hover:bg-slate-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              onChange={(e) => handleFilesSelect(e.target.files)}
              className="hidden"
              id="smart-upload-input"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              multiple
            />
            <label htmlFor="smart-upload-input" className="cursor-pointer block">
              <div className="flex flex-col items-center">
                <div className={`p-4 rounded-full mb-4 transition-colors ${
                  dragActive ? 'bg-teal-500' : 'bg-slate-100'
                }`}>
                  <Upload className={`h-8 w-8 ${dragActive ? 'text-white' : 'text-slate-400'}`} />
                </div>
                <p className="text-base font-medium text-slate-700">
                  {dragActive ? "Rilascia i file qui" : "Trascina i documenti qui"}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  oppure <span className="text-teal-600 font-medium">clicca per selezionare</span>
                </p>
                <p className="text-xs text-slate-400 mt-3">
                  PDF, DOC, DOCX, XLS, XLSX, JPG, PNG • Max {MAX_FILES} file
                </p>
              </div>
            </label>
          </div>

          {/* Lista file selezionati */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  {selectedFiles.length} file selezionati
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-slate-500 hover:text-red-500 h-8"
                >
                  <X className="h-4 w-4 mr-1" />
                  Rimuovi tutti
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                {selectedFiles.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 bg-teal-50 rounded">
                        <FileText className="h-4 w-4 text-teal-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700 truncate font-medium">{file.name}</p>
                        <p className="text-xs text-slate-400">
                          {(file.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Progress durante upload */}
      {uploading && (
        <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent"></div>
            <div>
              <p className="text-sm font-medium text-teal-700">Elaborazione in corso...</p>
              <p className="text-xs text-teal-600">L'AI sta analizzando i documenti. Potrebbe richiedere qualche istante.</p>
            </div>
          </div>
        </div>
      )}

      {/* Pulsanti azione */}
      <div className="flex gap-3 pt-2">
        {showResults ? (
          <>
            <Button
              variant="outline"
              onClick={clearAll}
              className="flex-1"
            >
              Carica altri documenti
            </Button>
            <Button
              onClick={() => onClose && onClose()}
              className="flex-1 bg-teal-500 hover:bg-teal-600 text-white"
            >
              Chiudi
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => onClose && onClose()}
              className="flex-1"
              disabled={uploading}
            >
              Annulla
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-semibold"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Elaborazione...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analizza e Carica ({selectedFiles.length})
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default CommercialDashboard;
