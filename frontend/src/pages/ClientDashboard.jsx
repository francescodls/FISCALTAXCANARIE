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
  Circle
} from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { it } from "date-fns/locale";

const ClientDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
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

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, deadlinesRes, docsRes, payslipsRes, notesRes, modelliRes] = await Promise.all([
        axios.get(`${API}/stats`, { headers }),
        axios.get(`${API}/deadlines`, { headers }),
        axios.get(`${API}/documents`, { headers }),
        axios.get(`${API}/payslips`, { headers }),
        axios.get(`${API}/notes`, { headers }),
        axios.get(`${API}/modelli-tributari`, { headers })
      ]);
      setStats(statsRes.data);
      setDeadlines(deadlinesRes.data);
      setDocuments(docsRes.data);
      setPayslips(payslipsRes.data);
      setNotes(notesRes.data);
      setModelliTributari(modelliRes.data);
    } catch (error) {
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
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
            Benvenuto, {user?.full_name}
          </h1>
          <p className="text-slate-600">Gestisci le tue pratiche fiscali e documenti</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-lg flex-wrap">
            <TabsTrigger 
              value="overview" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-overview"
            >
              Panoramica
            </TabsTrigger>
            <TabsTrigger 
              value="deadlines" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-deadlines"
            >
              Scadenze
            </TabsTrigger>
            <TabsTrigger 
              value="documents" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-documents"
            >
              Documenti
            </TabsTrigger>
            <TabsTrigger 
              value="payslips" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-payslips"
            >
              Buste Paga
            </TabsTrigger>
            <TabsTrigger 
              value="notes" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-notes"
            >
              Comunicazioni
            </TabsTrigger>
            <TabsTrigger 
              value="modelli" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-4"
              data-testid="tab-modelli"
            >
              Guida Modelli
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white border border-slate-200 card-hover">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
                    <CalendarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Scadenze da fare</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.deadlines_da_fare || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border border-slate-200 card-hover">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Documenti</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.documents_count || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border border-slate-200 card-hover">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
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
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Completate</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.deadlines_completate || 0}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Deadlines */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-xl flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-teal-500" />
                  Prossime Scadenze
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingDeadlines.length > 0 ? (
                  <div className="space-y-4">
                    {upcomingDeadlines.map((deadline) => (
                      <div 
                        key={deadline.id} 
                        className="flex items-center justify-between p-4 bg-stone-50 rounded-lg"
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
                          <Badge className="bg-teal-50 text-teal-700 border border-teal-100">
                            {format(parseISO(deadline.due_date), "d MMM yyyy", { locale: it })}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">Nessuna scadenza imminente</p>
                )}
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
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-xl">I Tuoi Documenti</CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center justify-between p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                            <FileText className="h-6 w-6 text-white" />
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
                          <Badge className="bg-slate-100 text-slate-600 border border-slate-200">
                            {doc.category}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile("documents", doc.id, doc.file_name)}
                            className="border-slate-200"
                            data-testid={`download-doc-${doc.id}`}
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
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessun documento disponibile</p>
                    <p className="text-sm text-slate-400">I documenti caricati dal tuo commercialista appariranno qui</p>
                  </div>
                )}
              </CardContent>
            </Card>
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

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-6">
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-xl">Comunicazioni e Appunti</CardTitle>
              </CardHeader>
              <CardContent>
                {notes.length > 0 ? (
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <div 
                        key={note.id} 
                        className="p-5 bg-stone-50 rounded-lg border-l-4 border-teal-500"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-semibold text-slate-900">{note.title}</h4>
                          <span className="text-xs text-slate-400">
                            {format(parseISO(note.created_at), "d MMM yyyy", { locale: it })}
                          </span>
                        </div>
                        <p className="text-slate-600 whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <StickyNote className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessuna comunicazione disponibile</p>
                    <p className="text-sm text-slate-400">Le comunicazioni del tuo commercialista appariranno qui</p>
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
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                              <h5 className="font-semibold text-red-800 mb-2">⚠️ Conseguenze mancata presentazione</h5>
                              <p className="text-red-700 text-sm">{modello.conseguenze_mancata_presentazione}</p>
                            </div>
                            {modello.note_operative && (
                              <div className="bg-teal-50 p-4 rounded-lg border border-teal-100">
                                <h5 className="font-semibold text-teal-800 mb-2">📝 Note operative</h5>
                                <p className="text-teal-700 text-sm">{modello.note_operative}</p>
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
        </Tabs>
      </main>
    </div>
  );
};

export default ClientDashboard;
