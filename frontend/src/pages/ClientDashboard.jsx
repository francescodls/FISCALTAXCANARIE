import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import ChatBot from "@/components/ChatBot";
import CompanyStructureSection from "@/components/CompanyStructureSection";
import { 
  Calendar as CalendarIcon, 
  FileText, 
  Wallet,
  StickyNote,
  LogOut,
  Download,
  User,
  Clock,
  AlertCircle,
  BookOpen,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Circle,
  Bell,
  Mail,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Save, Users, Folder, Edit2, Eye } from "lucide-react";
import LanguageSelector from "@/components/LanguageSelector";
import EmployeeManagementClient from "@/components/EmployeeManagementClient";
import DocumentFolderBrowser from "@/components/DocumentFolderBrowser";
import DocumentPreview from "@/components/DocumentPreview";
import TicketManagementClient from "@/components/TicketManagementClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { DialogFooter } from "@/components/ui/dialog";

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout, setUser } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({});
  const [deadlines, setDeadlines] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [notes, setNotes] = useState([]);
  const [modelliTributari, setModelliTributari] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedModello, setSelectedModello] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notificationsHistory, setNotificationsHistory] = useState([]);
  const [documentViewMode, setDocumentViewMode] = useState("folders"); // "folders" o "list"
  
  // Anagrafica state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Rinomina documento state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameDoc, setRenameDoc] = useState(null);
  const [newFileName, setNewFileName] = useState("");
  const [renamingDoc, setRenamingDoc] = useState(false);

  // Document preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
    // Inizializza form anagrafica
    if (user) {
      setProfileForm({
        full_name: user.full_name || "",
        phone: user.phone || "",
        codice_fiscale: user.codice_fiscale || "",
        nie: user.nie || "",
        nif: user.nif || "",
        cif: user.cif || "",
        indirizzo: user.indirizzo || "",
        citta: user.citta || "",
        cap: user.cap || "",
        provincia: user.provincia || "",
        iban: user.iban || "",
        // Campi struttura societaria
        tipo_amministrazione: user.tipo_amministrazione || "",
        company_administrators: user.company_administrators || [],
        company_shareholders: user.company_shareholders || []
      });
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, deadlinesRes, docsRes, payslipsRes, notesRes, modelliRes, notificationsRes] = await Promise.all([
        axios.get(`${API}/stats`, { headers }),
        axios.get(`${API}/deadlines`, { headers }),
        axios.get(`${API}/documents`, { headers }),
        axios.get(`${API}/payslips`, { headers }),
        axios.get(`${API}/notes`, { headers }),
        axios.get(`${API}/modelli-tributari`, { headers }),
        axios.get(`${API}/my-notifications-history`, { headers }).catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setDeadlines(deadlinesRes.data);
      setDocuments(docsRes.data);
      setPayslips(payslipsRes.data);
      setNotes(notesRes.data);
      setModelliTributari(modelliRes.data);
      setNotificationsHistory(notificationsRes.data);
    } catch (error) {
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    
    try {
      const response = await axios.put(`${API}/auth/me`, profileForm, { headers });
      toast.success("Profilo aggiornato con successo!");
      setEditingProfile(false);
      // Aggiorna l'utente nel context se necessario
      if (response.data.user && setUser) {
        setUser(response.data.user);
      }
    } catch (error) {
      toast.error("Errore nell'aggiornamento del profilo");
    } finally {
      setSavingProfile(false);
    }
  };

  const downloadFile = async (type, id, fileName) => {
    try {
      const response = await axios.get(`${API}/${type}/${id}`, { headers });
      const fileData = response.data.file_data;
      const fileType = response.data.file_type || "application/pdf";
      
      const byteCharacters = atob(fileData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileType });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Download completato");
    } catch (error) {
      toast.error("Errore durante il download");
    }
  };

  const openRenameDialog = (doc) => {
    setRenameDoc(doc);
    // Estrai nome senza estensione
    const nameWithoutExt = doc.file_name.lastIndexOf(".") > 0 
      ? doc.file_name.substring(0, doc.file_name.lastIndexOf("."))
      : doc.file_name;
    setNewFileName(nameWithoutExt);
    setRenameDialogOpen(true);
  };

  const handleRenameDocument = async () => {
    if (!newFileName.trim()) {
      toast.error("Inserisci un nome valido");
      return;
    }
    setRenamingDoc(true);
    try {
      const formData = new FormData();
      formData.append("new_filename", newFileName.trim());
      
      await axios.put(`${API}/documents/${renameDoc.id}/rename`, formData, { headers });
      toast.success("Documento rinominato con successo");
      setRenameDialogOpen(false);
      setRenameDoc(null);
      setNewFileName("");
      fetchData(); // Ricarica i documenti
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nella rinomina del documento");
    } finally {
      setRenamingDoc(false);
    }
  };

  // Document Preview
  const openPreview = (doc) => {
    setPreviewDoc(doc);
    const url = `${API}/documents/${doc.id}/preview?token=${token}`;
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewDoc(null);
    setPreviewUrl(null);
  };

  const getDeadlinesForDate = (date) => {
    return deadlines.filter(d => isSameDay(parseISO(d.due_date), date));
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completata": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "in_lavorazione": return <Clock className="h-4 w-4 text-blue-600" />;
      case "scaduta": return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Circle className="h-4 w-4 text-amber-600" />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      "da_fare": "Da fare",
      "in_lavorazione": "In lavorazione",
      "completata": "Completata",
      "scaduta": "Scaduta"
    };
    return labels[status] || status;
  };

  const upcomingDeadlines = deadlines
    .filter(d => d.status !== "completata")
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const handleLogout = () => {
    logout();
    navigate("/");
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
            <span className="font-heading font-bold text-xl text-slate-900">Fiscal Tax Canarie</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-600">
              <User className="h-5 w-5" />
              <span className="font-medium">{user?.full_name}</span>
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
            {t("dashboard.welcome")}, {user?.full_name}
          </h1>
          <p className="text-slate-600">{t("dashboard.clientPanel")}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-lg flex-wrap">
            <TabsTrigger 
              value="overview" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-overview"
            >
              {t("dashboard.stats")}
            </TabsTrigger>
            <TabsTrigger 
              value="deadlines" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-deadlines"
            >
              {t("deadlines.title")}
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-documents"
            >
              {t("documents.title")}
            </TabsTrigger>
            <TabsTrigger 
              value="payslips" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-payslips"
            >
              {t("payslips.title")}
            </TabsTrigger>
            <TabsTrigger 
              value="tickets" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-tickets"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Ticket
            </TabsTrigger>
            <TabsTrigger 
              value="communications" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-communications"
            >
              <Bell className="h-4 w-4 mr-2" />
              Comunicazioni
            </TabsTrigger>
            <TabsTrigger 
              value="modelli" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-modelli"
            >
              {t("landing.feature5Title")}
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
              value="profile" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-profile"
            >
              <User className="h-4 w-4 mr-2" />
              {t("profile.personalInfo")}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Welcome Banner */}
            <Card className="bg-gradient-to-r from-teal-500 to-teal-600 border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <h2 className="text-2xl font-bold mb-1">Ciao, {user?.full_name}!</h2>
                    <p className="text-teal-100">Ecco un riepilogo della tua situazione fiscale</p>
                  </div>
                  <div className="hidden md:flex gap-3">
                    <Button 
                      variant="secondary" 
                      className="bg-white/20 hover:bg-white/30 text-white border-0"
                      onClick={() => navigate("/declarations")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Dichiarazioni
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="bg-white/20 hover:bg-white/30 text-white border-0"
                      onClick={() => setActiveTab("documents")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      I Miei Documenti
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="bg-white/20 hover:bg-white/30 text-white border-0"
                      onClick={() => setActiveTab("deadlines")}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Scadenze
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white border border-slate-200 card-hover cursor-pointer" onClick={() => setActiveTab("deadlines")}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Scadenze Urgenti</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.deadlines_da_fare || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border border-slate-200 card-hover cursor-pointer" onClick={() => setActiveTab("documents")}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Documenti</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.documents_count || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border border-slate-200 card-hover cursor-pointer" onClick={() => setActiveTab("payslips")}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Buste Paga</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.payslips_count || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border border-slate-200 card-hover">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Completate</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.deadlines_completate || 0}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Two Column Layout */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Upcoming Deadlines */}
              <Card className="bg-white border border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Scadenze Imminenti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingDeadlines.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingDeadlines.slice(0, 3).map((deadline) => (
                        <div 
                          key={deadline.id} 
                          className="flex items-center justify-between p-3 bg-stone-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(deadline.status)}
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{deadline.title}</p>
                              <p className="text-xs text-slate-500">{deadline.category}</p>
                            </div>
                          </div>
                          <Badge className="bg-teal-50 text-teal-700 border border-teal-100 text-xs">
                            {format(parseISO(deadline.due_date), "d MMM", { locale: it })}
                          </Badge>
                        </div>
                      ))}
                      {upcomingDeadlines.length > 3 && (
                        <Button 
                          variant="ghost" 
                          className="w-full text-teal-600 hover:text-teal-700"
                          onClick={() => setActiveTab("deadlines")}
                        >
                          Vedi tutte le scadenze ({upcomingDeadlines.length})
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Nessuna scadenza urgente</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Documents */}
              <Card className="bg-white border border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    Ultimi Documenti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.length > 0 ? (
                    <div className="space-y-3">
                      {documents.slice(0, 3).map((doc) => (
                        <div 
                          key={doc.id} 
                          className="flex items-center justify-between p-3 bg-stone-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 text-sm truncate max-w-[180px]">{doc.title}</p>
                              <p className="text-xs text-slate-500">{doc.category}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadFile("documents", doc.id, doc.file_name)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {documents.length > 3 && (
                        <Button 
                          variant="ghost" 
                          className="w-full text-teal-600 hover:text-teal-700"
                          onClick={() => setActiveTab("documents")}
                        >
                          Vedi tutti i documenti ({documents.length})
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Nessun documento disponibile</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Access to Tickets */}
            <Card className="bg-white border border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-teal-500" />
                  Ticket di Assistenza
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 mb-4">
                  Hai bisogno di assistenza? Apri un ticket per contattare lo studio.
                </p>
                <Button 
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                  onClick={() => setActiveTab("tickets")}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Vai ai Ticket
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deadlines Tab */}
          <TabsContent value="deadlines" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-white border border-slate-200">
                <CardHeader>
                  <CardTitle className="font-heading text-xl">Calendario Scadenze</CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    locale={it}
                    className="rounded-md"
                    modifiers={{
                      deadline: deadlines.map(d => parseISO(d.due_date))
                    }}
                    modifiersStyles={{
                      deadline: { 
                        backgroundColor: '#d4f1ef',
                        color: '#329089',
                        fontWeight: 'bold'
                      }
                    }}
                  />
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200">
                <CardHeader>
                  <CardTitle className="font-heading text-xl">
                    Scadenze del {format(selectedDate, "d MMMM yyyy", { locale: it })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {getDeadlinesForDate(selectedDate).length > 0 ? (
                      <div className="space-y-4">
                        {getDeadlinesForDate(selectedDate).map((deadline) => (
                          <div key={deadline.id} className="p-4 bg-stone-50 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(deadline.status)}
                                <h4 className="font-semibold text-slate-900">{deadline.title}</h4>
                              </div>
                              <Badge className={`status-${deadline.status}`}>
                                {getStatusLabel(deadline.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600">{deadline.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center py-8">Nessuna scadenza per questa data</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* All Deadlines List */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-xl">Tutte le Scadenze Fiscali</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deadlines.map((deadline) => (
                    <div 
                      key={deadline.id} 
                      className="flex items-center justify-between p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {getStatusIcon(deadline.status)}
                        <div>
                          <p className="font-medium text-slate-900">{deadline.title}</p>
                          <p className="text-sm text-slate-500">{deadline.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`status-${deadline.status}`}>
                          {getStatusLabel(deadline.status)}
                        </Badge>
                        <Badge className="bg-slate-100 text-slate-600 border border-slate-200">
                          {deadline.category}
                        </Badge>
                        <Badge className="bg-teal-50 text-teal-700 border border-teal-100">
                          {format(parseISO(deadline.due_date), "d MMM yyyy", { locale: it })}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            {/* Header con toggle vista */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">I Tuoi Documenti</h2>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDocumentViewMode("folders")}
                  className={documentViewMode === "folders" 
                    ? "bg-white shadow-sm text-teal-600" 
                    : "text-slate-500 hover:text-slate-700"}
                >
                  <Folder className="h-4 w-4 mr-1" />
                  Cartelle
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDocumentViewMode("list")}
                  className={documentViewMode === "list" 
                    ? "bg-white shadow-sm text-teal-600" 
                    : "text-slate-500 hover:text-slate-700"}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Lista
                </Button>
              </div>
            </div>

            {documentViewMode === "folders" ? (
              /* Vista Cartelle */
              <Card className="bg-white border border-slate-200">
                <CardContent className="p-6">
                  <DocumentFolderBrowser 
                    clientId={user?.id}
                    token={token}
                    userRole="cliente"
                    onDocumentView={(doc) => openPreview(doc)}
                    onDocumentDownload={(doc) => downloadFile("documents", doc.id, doc.file_name)}
                    onDocumentDeleted={() => fetchData()}
                  />
                </CardContent>
              </Card>
            ) : (
              /* Vista Lista Tradizionale */
              <Card className="bg-white border border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-xl flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-500" />
                    I Tuoi Documenti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {documents.map((doc) => {
                        const categoryColors = {
                          atto: 'from-blue-500 to-indigo-500',
                          imposta: 'from-red-500 to-pink-500',
                          contratto: 'from-emerald-500 to-green-500',
                          altro: 'from-slate-500 to-gray-500'
                        };
                        const bgColor = categoryColors[doc.category] || categoryColors.altro;
                        
                        return (
                          <div 
                            key={doc.id} 
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow group"
                          >
                            {/* Card Header with gradient */}
                            <div className={`bg-gradient-to-r ${bgColor} p-4`}>
                              <div className="flex items-center justify-between">
                                <FileText className="h-8 w-8 text-white/80" />
                                <Badge className="bg-white/20 text-white border-0 capitalize">
                                  {doc.category}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Card Body */}
                            <div className="p-4">
                              <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{doc.title}</h3>
                              <p className="text-xs text-slate-500 mb-2 truncate">{doc.file_name}</p>
                              {doc.description && (
                                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{doc.description}</p>
                              )}
                              
                              {/* Tags if available */}
                              {doc.tags && doc.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {doc.tags.slice(0, 3).map((tag, i) => (
                                    <Badge key={i} variant="outline" className="text-xs bg-slate-50">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              {/* Buttons Row */}
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  className="border-teal-200 text-teal-600 hover:bg-teal-50"
                                  onClick={() => openPreview(doc)}
                                  data-testid={`preview-doc-${doc.id}`}
                                  title="Anteprima"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  className="flex-1 border-slate-200 group-hover:bg-slate-50"
                                  onClick={() => downloadFile("documents", doc.id, doc.file_name)}
                                  data-testid={`download-doc-${doc.id}`}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Scarica
                                </Button>
                                <Button
                                  variant="outline"
                                  className="border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                                  onClick={() => openRenameDialog(doc)}
                                  data-testid={`rename-doc-${doc.id}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-10 w-10 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">Nessun documento disponibile</h3>
                      <p className="text-slate-500 max-w-md mx-auto">
                        I documenti caricati dal tuo commercialista appariranno qui. 
                        Potrai visualizzarli e scaricarli in qualsiasi momento.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Dialog Rinomina Documento */}
            <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Edit2 className="h-5 w-5 text-blue-500" />
                    Rinomina Documento
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome attuale</Label>
                    <p className="text-sm text-slate-500">{renameDoc?.file_name}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Nuovo nome</Label>
                    <Input
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      placeholder="Inserisci nuovo nome"
                      data-testid="rename-input"
                    />
                    <p className="text-xs text-slate-400">
                      L'estensione del file verrà mantenuta automaticamente
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button
                    onClick={handleRenameDocument}
                    disabled={renamingDoc || !newFileName.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    data-testid="rename-submit"
                  >
                    {renamingDoc ? "Rinomino..." : "Rinomina"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Payslips Tab */}
          <TabsContent value="payslips" className="space-y-6">
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-xl">Le Tue Buste Paga</CardTitle>
              </CardHeader>
              <CardContent>
                {payslips.length > 0 ? (
                  <div className="space-y-3">
                    {payslips.map((payslip) => (
                      <div 
                        key={payslip.id} 
                        className="flex items-center justify-between p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                            <Wallet className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{payslip.title}</p>
                            <p className="text-sm text-slate-500">{payslip.month} {payslip.year}</p>
                            <p className="text-xs text-slate-400">{payslip.file_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {payslip.month} {payslip.year}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile("payslips", payslip.id, payslip.file_name)}
                            className="border-slate-200"
                            data-testid={`download-payslip-${payslip.id}`}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Scarica
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessuna busta paga disponibile</p>
                    <p className="text-sm text-slate-400">Le buste paga caricate dal tuo commercialista appariranno qui</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <TicketManagementClient 
              token={token}
              clientId={user?.id}
              API={API}
            />
          </TabsContent>

          {/* Communications History Tab */}
          <TabsContent value="communications" className="space-y-6">
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-xl flex items-center gap-2">
                  <Bell className="h-5 w-5 text-amber-500" />
                  Cronologia Comunicazioni
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Tutte le notifiche e comunicazioni ricevute dallo studio
                </p>
              </CardHeader>
              <CardContent>
                {notificationsHistory.length > 0 ? (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {notificationsHistory.map((notif) => (
                      <div
                        key={notif.id}
                        className="p-4 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {notif.type === "document" ? (
                              <FileText className="h-5 w-5 text-blue-500" />
                            ) : notif.type === "deadline" ? (
                              <CalendarIcon className="h-5 w-5 text-amber-500" />
                            ) : notif.type === "welcome" || notif.type === "invite" ? (
                              <Mail className="h-5 w-5 text-teal-500" />
                            ) : notif.type === "employee" ? (
                              <Users className="h-5 w-5 text-indigo-500" />
                            ) : (
                              <Bell className="h-5 w-5 text-slate-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-slate-900">{notif.title}</span>
                              <Badge className="bg-slate-100 text-slate-600 text-xs">
                                {notif.type === "document" ? "Documento" :
                                 notif.type === "deadline" ? "Scadenza" :
                                 notif.type === "welcome" ? "Benvenuto" :
                                 notif.type === "invite" ? "Invito" :
                                 notif.type === "employee" ? "Dipendente" :
                                 notif.type === "manual" ? "Comunicazione" :
                                 notif.type}
                              </Badge>
                              {notif.email_sent && (
                                <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                  <Mail className="h-3 w-3 mr-1" />
                                  Via Email
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600">{notif.message}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                              <Clock className="h-3 w-3" />
                              {notif.created_at && format(parseISO(notif.created_at), "dd/MM/yyyy HH:mm", { locale: it })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bell className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Nessuna comunicazione</h3>
                    <p className="text-slate-500">
                      Le notifiche e comunicazioni dallo studio appariranno qui
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modelli Tributari Tab */}
          <TabsContent value="modelli" className="space-y-6">
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-xl flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-teal-500" />
                  Guida ai Modelli Tributari delle Canarie
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-6">
                  Consulta le schede informative dei principali modelli tributari. Scopri cosa sono, a cosa servono e quando devono essere presentati.
                </p>
                {modelliTributari.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {modelliTributari.map((modello) => (
                      <Dialog key={modello.id}>
                        <DialogTrigger asChild>
                          <div 
                            className="p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer group"
                            onClick={() => setSelectedModello(modello)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <Badge className="bg-teal-500 text-white mb-2">
                                  {modello.codice}
                                </Badge>
                                <h4 className="font-semibold text-slate-900">{modello.nome}</h4>
                                <p className="text-sm text-slate-500 mt-1">{modello.periodicita}</p>
                              </div>
                              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                              <Badge className="bg-teal-500 text-white text-lg px-3 py-1">
                                {modello.codice}
                              </Badge>
                              <span className="text-xl">{modello.nome}</span>
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6 mt-4">
                            <div>
                              <h5 className="font-semibold text-slate-900 mb-2">Descrizione</h5>
                              <p className="text-slate-600">{modello.descrizione}</p>
                            </div>
                            <div>
                              <h5 className="font-semibold text-slate-900 mb-2">A cosa serve</h5>
                              <p className="text-slate-600">{modello.a_cosa_serve}</p>
                            </div>
                            <div>
                              <h5 className="font-semibold text-slate-900 mb-2">Chi deve presentarlo</h5>
                              <p className="text-slate-600">{modello.chi_deve_presentarlo}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h5 className="font-semibold text-slate-900 mb-2">Periodicità</h5>
                                <Badge className="bg-blue-50 text-blue-700 border border-blue-100">
                                  {modello.periodicita}
                                </Badge>
                              </div>
                              <div>
                                <h5 className="font-semibold text-slate-900 mb-2">Scadenza tipica</h5>
                                <Badge className="bg-amber-50 text-amber-700 border border-amber-100">
                                  {modello.scadenza_tipica}
                                </Badge>
                              </div>
                            </div>
                            <div>
                              <h5 className="font-semibold text-slate-900 mb-2">Documenti necessari</h5>
                              <ul className="list-disc list-inside text-slate-600 space-y-1">
                                {modello.documenti_necessari.map((doc, i) => (
                                  <li key={i}>{doc}</li>
                                ))}
                              </ul>
                            </div>
                            {modello.video_thumbnail && modello.video_youtube && (
                              <div>
                                <h5 className="font-semibold text-slate-900 mb-2">Video esplicativo</h5>
                                <a 
                                  href={modello.video_youtube} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block relative group"
                                >
                                  <img 
                                    src={modello.video_thumbnail} 
                                    alt={`Video ${modello.nome}`}
                                    className="w-full rounded-lg border border-slate-200 group-hover:opacity-90 transition-opacity"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                      <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z"/>
                                      </svg>
                                    </div>
                                  </div>
                                </a>
                              </div>
                            )}
                            {modello.note_operative && (
                              <div className="bg-teal-50 p-4 rounded-lg border border-teal-100">
                                <h5 className="font-semibold text-teal-800 mb-2">Note operative</h5>
                                <p className="text-teal-700 text-sm">{modello.note_operative}</p>
                              </div>
                            )}
                            {modello.link_approfondimento && (
                              <div className="pt-4 border-t border-slate-200">
                                <a 
                                  href={modello.link_approfondimento}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
                                  data-testid={`link-approfondimento-${modello.id}`}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  Approfondisci
                                </a>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessun modello tributario disponibile</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            <EmployeeManagementClient token={token} clientId={user?.id} />
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-white border border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading text-xl flex items-center gap-2">
                  <User className="h-5 w-5 text-teal-500" />
                  I Miei Dati Anagrafici
                </CardTitle>
                {!editingProfile ? (
                  <Button
                    onClick={() => setEditingProfile(true)}
                    className="bg-teal-500 hover:bg-teal-600 active:bg-slate-900 active:scale-95 text-white transition-all"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifica
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingProfile(false);
                      // Reset form
                      setProfileForm({
                        full_name: user?.full_name || "",
                        phone: user?.phone || "",
                        codice_fiscale: user?.codice_fiscale || "",
                        nie: user?.nie || "",
                        nif: user?.nif || "",
                        cif: user?.cif || "",
                        indirizzo: user?.indirizzo || "",
                        citta: user?.citta || "",
                        cap: user?.cap || "",
                        provincia: user?.provincia || "",
                        iban: user?.iban || ""
                      });
                    }}
                  >
                    Annulla
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Dati Personali */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b">Dati Personali</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <Input
                          value={profileForm.full_name || ""}
                          onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                          disabled={!editingProfile}
                          className="border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={user?.email || ""}
                          disabled={true}
                          className="border-slate-200 bg-slate-50"
                        />
                        <p className="text-xs text-slate-400">L'email non può essere modificata</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Telefono</Label>
                        <Input
                          value={profileForm.phone || ""}
                          onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                          disabled={!editingProfile}
                          className="border-slate-200"
                          placeholder="+34 612 345 678"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Documenti di Identità Fiscale */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b">Identificazione Fiscale</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>NIE <span className="text-xs text-slate-400">(Stranieri)</span></Label>
                        <Input
                          value={profileForm.nie || ""}
                          onChange={(e) => setProfileForm({...profileForm, nie: e.target.value})}
                          disabled={!editingProfile}
                          className="border-slate-200"
                          placeholder="X-1234567-A"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>NIF <span className="text-xs text-slate-400">(Persone fisiche)</span></Label>
                        <Input
                          value={profileForm.nif || ""}
                          onChange={(e) => setProfileForm({...profileForm, nif: e.target.value})}
                          disabled={!editingProfile}
                          className="border-slate-200"
                          placeholder="12345678A"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>CIF <span className="text-xs text-slate-400">(Società)</span></Label>
                        <Input
                          value={profileForm.cif || ""}
                          onChange={(e) => setProfileForm({...profileForm, cif: e.target.value})}
                          disabled={!editingProfile}
                          className="border-slate-200"
                          placeholder="B12345678"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Codice Fiscale IT</Label>
                        <Input
                          value={profileForm.codice_fiscale || ""}
                          onChange={(e) => setProfileForm({...profileForm, codice_fiscale: e.target.value})}
                          disabled={!editingProfile}
                          className="border-slate-200"
                          placeholder="RSSMRA80A01H501Z"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Indirizzo */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b">Indirizzo</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2 lg:col-span-2">
                        <Label>Indirizzo</Label>
                        <Input
                          value={profileForm.indirizzo || ""}
                          onChange={(e) => setProfileForm({...profileForm, indirizzo: e.target.value})}
                          disabled={!editingProfile}
                          className="border-slate-200"
                          placeholder="Calle Principal, 123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Città</Label>
                        <Input
                          value={profileForm.citta || ""}
                          onChange={(e) => setProfileForm({...profileForm, citta: e.target.value})}
                          disabled={!editingProfile}
                          className="border-slate-200"
                          placeholder="Las Palmas"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Provincia</Label>
                        <Input
                          value={profileForm.provincia || ""}
                          onChange={(e) => setProfileForm({...profileForm, provincia: e.target.value})}
                          disabled={!editingProfile}
                          className="border-slate-200"
                          placeholder="Las Palmas"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>CAP</Label>
                        <Input
                          value={profileForm.cap || ""}
                          onChange={(e) => setProfileForm({...profileForm, cap: e.target.value})}
                          disabled={!editingProfile}
                          className="border-slate-200"
                          placeholder="35001"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dati Bancari */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b">Dati Bancari</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>IBAN</Label>
                        <Input
                          value={profileForm.iban || ""}
                          onChange={(e) => setProfileForm({...profileForm, iban: e.target.value})}
                          disabled={!editingProfile}
                          className="border-slate-200"
                          placeholder="ES12 1234 5678 9012 3456 7890"
                        />
                      </div>
                    </div>
                  </div>

                  {editingProfile && (
                    <div className="flex justify-end pt-4 border-t">
                      <Button
                        type="submit"
                        disabled={savingProfile}
                        className="bg-teal-500 hover:bg-teal-600 active:bg-slate-900 active:scale-95 text-white transition-all"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {savingProfile ? "Salvataggio..." : "Salva Modifiche"}
                      </Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Struttura Societaria - SOLO PER SOCIETÀ */}
            {user?.tipo_cliente === 'societa' && (
              <CompanyStructureSection
                tipoAmministrazione={profileForm.tipo_amministrazione}
                administrators={profileForm.company_administrators}
                shareholders={profileForm.company_shareholders}
                editing={editingProfile}
                onUpdate={(data) => {
                  setProfileForm({
                    ...profileForm,
                    tipo_amministrazione: data.tipo_amministrazione,
                    company_administrators: data.company_administrators,
                    company_shareholders: data.company_shareholders
                  });
                }}
              />
            )}
          </TabsContent>

        </Tabs>
      </main>
      
      {/* Document Preview Modal */}
      <DocumentPreview
        isOpen={previewOpen}
        onClose={closePreview}
        document={previewDoc}
        previewUrl={previewUrl}
        onDownload={() => previewDoc && downloadFile("documents", previewDoc.id, previewDoc.file_name)}
      />
      
      {/* Chatbot AI */}
      <ChatBot token={token} userName={user?.full_name} />
    </div>
  );
};

export default ClientDashboard;
