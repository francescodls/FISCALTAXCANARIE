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
  Sparkles
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const CommercialDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
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

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, clientsRes, logsRes, pendingRes] = await Promise.all([
        axios.get(`${API}/stats`, { headers }),
        axios.get(`${API}/clients`, { headers }),
        axios.get(`${API}/activity-logs?limit=20`, { headers }),
        axios.get(`${API}/documents/pending-verification`, { headers })
      ]);
      setStats(statsRes.data);
      setClients(clientsRes.data);
      setActivityLogs(logsRes.data);
      setPendingDocs(pendingRes.data);
    } catch (error) {
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.codice_fiscale && client.codice_fiscale.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      default:
        return <Badge className="bg-slate-100 text-slate-600 border border-slate-200">{stato}</Badge>;
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
            <div className="flex items-center gap-2 text-slate-600">
              <User className="h-5 w-5" />
              <span className="font-medium">{user?.full_name}</span>
              <Badge className="bg-teal-500 text-white ml-2">Commercialista</Badge>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-slate-200 text-slate-600 hover:text-slate-900"
              data-testid="logout-btn"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-slate-900 mb-2">
            Dashboard Amministratore
          </h1>
          <p className="text-slate-600">Gestisci i tuoi clienti e le loro pratiche fiscali</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-white border border-slate-200 card-hover">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.clients_count || 0}</p>
              <p className="text-xs text-slate-500">Clienti Totali</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 card-hover">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center mb-2">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.clients_active || 0}</p>
              <p className="text-xs text-slate-500">Clienti Attivi</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 card-hover">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center mb-2">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.documents_count || 0}</p>
              <p className="text-xs text-slate-500">Documenti</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 card-hover">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.deadlines_da_fare || 0}</p>
              <p className="text-xs text-slate-500">Scadenze Da Fare</p>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 card-hover">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center mb-2">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.deadlines_scadute || 0}</p>
              <p className="text-xs text-slate-500">Scadute</p>
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
              <p className="text-xs text-slate-500">Da Verificare</p>
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
              Clienti
            </TabsTrigger>
            <TabsTrigger 
              value="pending" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-pending"
            >
              <Eye className="h-4 w-4 mr-2" />
              Da Verificare
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
              Ricerca AI
            </TabsTrigger>
            <TabsTrigger 
              value="stats" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-stats"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Statistiche
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-activity"
            >
              <Activity className="h-4 w-4 mr-2" />
              Attività
            </TabsTrigger>
          </TabsList>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <Card className="bg-white border border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading text-xl">I Tuoi Clienti</CardTitle>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Cerca cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-slate-200"
                    data-testid="search-clients-input"
                  />
                </div>
              </CardHeader>
              <CardContent>
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
                              <p className="font-medium text-slate-900">{client.full_name}</p>
                              {getStatusBadge(client.stato)}
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
