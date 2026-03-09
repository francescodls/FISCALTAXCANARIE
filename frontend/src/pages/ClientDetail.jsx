import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  FileText, 
  Wallet,
  StickyNote,
  LogOut,
  User,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Sparkles,
  Bot,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Bell,
  Send
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const ClientDetail = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { user, token, logout } = useAuth();
  const [client, setClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [notes, setNotes] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [activeTab, setActiveTab] = useState("documents");
  const [loading, setLoading] = useState(true);
  
  // Upload states
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingDocAI, setUploadingDocAI] = useState(false);
  const [uploadingPayslip, setUploadingPayslip] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const docFileRef = useRef(null);
  const docFileAIRef = useRef(null);
  const payslipFileRef = useRef(null);
  
  // AI Analysis result
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  
  // Document form
  const [docForm, setDocForm] = useState({
    title: "",
    description: "",
    category: "atto",
    file: null
  });
  
  // Payslip form
  const [payslipForm, setPayslipForm] = useState({
    title: "",
    month: "Gennaio",
    year: new Date().getFullYear(),
    file: null
  });
  
  // Note form
  const [noteForm, setNoteForm] = useState({
    title: "",
    content: "",
    is_internal: false
  });
  const [editingNote, setEditingNote] = useState(null);
  const [savingNote, setSavingNote] = useState(false);
  
  // Deadline form
  const [deadlineForm, setDeadlineForm] = useState({
    title: "",
    description: "",
    due_date: "",
    category: "IRPF",
    priority: "normale",
    status: "da_fare",
    send_notification: false
  });
  const [savingDeadline, setSavingDeadline] = useState(false);
  
  // Notification form
  const [notificationForm, setNotificationForm] = useState({
    type: "note",
    title: "",
    content: ""
  });

  const headers = { Authorization: `Bearer ${token}` };

  const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  const docCategories = [
    { value: "atto", label: "Atto" },
    { value: "imposta", label: "Imposta" },
    { value: "contratto", label: "Contratto" },
    { value: "altro", label: "Altro" }
  ];

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientRes, docsRes, payslipsRes, notesRes, deadlinesRes] = await Promise.all([
        axios.get(`${API}/clients/${clientId}`, { headers }),
        axios.get(`${API}/documents?client_id=${clientId}`, { headers }),
        axios.get(`${API}/payslips?client_id=${clientId}`, { headers }),
        axios.get(`${API}/notes?client_id=${clientId}`, { headers }),
        axios.get(`${API}/deadlines`, { headers })
      ]);
      setClient(clientRes.data);
      setDocuments(docsRes.data);
      setPayslips(payslipsRes.data);
      setNotes(notesRes.data);
      // Filtra scadenze per questo cliente
      const clientDeadlines = deadlinesRes.data.filter(
        d => d.applies_to_all || d.client_ids?.includes(clientId)
      );
      setDeadlines(clientDeadlines);
    } catch (error) {
      toast.error("Errore nel caricamento dei dati");
      if (error.response?.status === 404) {
        navigate("/admin");
      }
    } finally {
      setLoading(false);
    }
  };

  // Document functions
  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (!docForm.file) {
      toast.error("Seleziona un file");
      return;
    }
    
    setUploadingDoc(true);
    const formData = new FormData();
    formData.append("title", docForm.title);
    formData.append("description", docForm.description);
    formData.append("category", docForm.category);
    formData.append("client_id", clientId);
    formData.append("file", docForm.file);
    
    try {
      await axios.post(`${API}/documents`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      toast.success("Documento caricato con successo");
      setDocForm({ title: "", description: "", category: "atto", file: null });
      if (docFileRef.current) docFileRef.current.value = "";
      fetchData();
    } catch (error) {
      toast.error("Errore nel caricamento del documento");
    } finally {
      setUploadingDoc(false);
    }
  };

  // AI Document upload
  const handleDocUploadAI = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingDocAI(true);
    setAiAnalysisResult(null);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("client_id", clientId);
    
    try {
      const response = await axios.post(`${API}/documents/upload-auto`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      
      setAiAnalysisResult(response.data);
      toast.success("Documento analizzato e caricato con AI!");
      
      if (docFileAIRef.current) docFileAIRef.current.value = "";
      fetchData();
    } catch (error) {
      toast.error("Errore nell'analisi AI del documento");
    } finally {
      setUploadingDocAI(false);
    }
  };

  const deleteDocument = async (docId) => {
    if (!confirm("Sei sicuro di voler eliminare questo documento?")) return;
    try {
      await axios.delete(`${API}/documents/${docId}`, { headers });
      toast.success("Documento eliminato");
      fetchData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  // Payslip functions
  const handlePayslipUpload = async (e) => {
    e.preventDefault();
    if (!payslipForm.file) {
      toast.error("Seleziona un file");
      return;
    }
    
    setUploadingPayslip(true);
    const formData = new FormData();
    formData.append("title", payslipForm.title);
    formData.append("month", payslipForm.month);
    formData.append("year", payslipForm.year);
    formData.append("client_id", clientId);
    formData.append("file", payslipForm.file);
    
    try {
      await axios.post(`${API}/payslips`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      toast.success("Busta paga caricata con successo");
      setPayslipForm({ title: "", month: "Gennaio", year: new Date().getFullYear(), file: null });
      if (payslipFileRef.current) payslipFileRef.current.value = "";
      fetchData();
    } catch (error) {
      toast.error("Errore nel caricamento della busta paga");
    } finally {
      setUploadingPayslip(false);
    }
  };

  const deletePayslip = async (payslipId) => {
    if (!confirm("Sei sicuro di voler eliminare questa busta paga?")) return;
    try {
      await axios.delete(`${API}/payslips/${payslipId}`, { headers });
      toast.success("Busta paga eliminata");
      fetchData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  // Note functions
  const handleNoteSave = async (e) => {
    e.preventDefault();
    setSavingNote(true);
    
    try {
      if (editingNote) {
        await axios.put(`${API}/notes/${editingNote.id}`, {
          ...noteForm,
          client_id: clientId
        }, { headers });
        toast.success("Appunto aggiornato");
      } else {
        await axios.post(`${API}/notes`, {
          ...noteForm,
          client_id: clientId
        }, { headers });
        toast.success("Appunto creato");
      }
      setNoteForm({ title: "", content: "", is_internal: false });
      setEditingNote(null);
      fetchData();
    } catch (error) {
      toast.error("Errore nel salvataggio dell'appunto");
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (noteId) => {
    if (!confirm("Sei sicuro di voler eliminare questo appunto?")) return;
    try {
      await axios.delete(`${API}/notes/${noteId}`, { headers });
      toast.success("Appunto eliminato");
      fetchData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const startEditNote = (note) => {
    setEditingNote(note);
    setNoteForm({
      title: note.title,
      content: note.content,
      is_internal: note.is_internal
    });
  };

  // Deadline functions
  const handleDeadlineSave = async (e) => {
    e.preventDefault();
    setSavingDeadline(true);
    
    try {
      const deadlineData = {
        ...deadlineForm,
        applies_to_all: false,
        client_ids: [clientId],
        is_recurring: false
      };
      
      await axios.post(`${API}/deadlines`, deadlineData, { headers });
      toast.success(deadlineForm.send_notification ? "Scadenza creata e notifica inviata!" : "Scadenza creata");
      setDeadlineForm({
        title: "",
        description: "",
        due_date: "",
        category: "IRPF",
        priority: "normale",
        status: "da_fare",
        send_notification: false
      });
      fetchData();
    } catch (error) {
      toast.error("Errore nella creazione della scadenza");
    } finally {
      setSavingDeadline(false);
    }
  };

  const updateDeadlineStatus = async (deadlineId, newStatus) => {
    try {
      const formData = new FormData();
      formData.append("status", newStatus);
      await axios.patch(`${API}/deadlines/${deadlineId}/status`, formData, { headers });
      toast.success("Stato aggiornato");
      fetchData();
    } catch (error) {
      toast.error("Errore nell'aggiornamento");
    }
  };

  const deleteDeadline = async (deadlineId) => {
    if (!confirm("Sei sicuro di voler eliminare questa scadenza?")) return;
    try {
      await axios.delete(`${API}/deadlines/${deadlineId}`, { headers });
      toast.success("Scadenza eliminata");
      fetchData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  // Send notification to client
  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notificationForm.title.trim() || !notificationForm.content.trim()) {
      toast.error("Compila tutti i campi");
      return;
    }
    
    setSendingNotification(true);
    
    try {
      const formData = new FormData();
      formData.append("client_id", clientId);
      formData.append("note_title", notificationForm.title);
      formData.append("note_content", notificationForm.content);
      
      const response = await axios.post(`${API}/notifications/send-note`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      
      if (response.data.success) {
        toast.success("Notifica email inviata con successo!");
        setNotificationForm({ type: "note", title: "", content: "" });
      } else {
        toast.error(response.data.error || "Errore nell'invio della notifica");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'invio della notifica");
    } finally {
      setSendingNotification(false);
    }
  };

  // Send deadline reminder
  const handleSendDeadlineReminder = async (deadlineId) => {
    try {
      const formData = new FormData();
      formData.append("client_id", clientId);
      formData.append("deadline_id", deadlineId);
      
      const response = await axios.post(`${API}/notifications/send-deadline-reminder`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      
      if (response.data.success) {
        toast.success("Promemoria scadenza inviato!");
      } else {
        toast.error(response.data.error || "Errore nell'invio del promemoria");
      }
    } catch (error) {
      toast.error("Errore nell'invio del promemoria");
    }
  };

  // Download function
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
            <div>
              <span className="font-heading font-bold text-xl text-slate-900">Fiscal Tax Canarie</span>
              <span className="text-xs text-slate-500 block">Pannello Commercialista</span>
            </div>
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
            >
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Back button and client info */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
            className="mb-4 text-slate-600 hover:text-slate-900 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla lista clienti
          </Button>
          
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h1 className="font-heading text-2xl font-bold text-slate-900 mb-2">
                    {client?.full_name}
                  </h1>
                  <div className="flex flex-wrap gap-4 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{client?.email}</span>
                    </div>
                    {client?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{client?.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Badge className="bg-blue-50 text-blue-700 border border-blue-100 px-4 py-2">
                    <FileText className="h-4 w-4 mr-2" />
                    {documents.length} Documenti
                  </Badge>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2">
                    <Wallet className="h-4 w-4 mr-2" />
                    {payslips.length} Buste Paga
                  </Badge>
                  <Badge className="bg-amber-50 text-amber-700 border border-amber-100 px-4 py-2">
                    <Calendar className="h-4 w-4 mr-2" />
                    {deadlines.length} Scadenze
                  </Badge>
                  <Badge className="bg-purple-50 text-purple-700 border border-purple-100 px-4 py-2">
                    <StickyNote className="h-4 w-4 mr-2" />
                    {notes.length} Appunti
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-lg">
            <TabsTrigger 
              value="documents" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-6"
              data-testid="tab-documents"
            >
              <FileText className="h-4 w-4 mr-2" />
              Documenti
            </TabsTrigger>
            <TabsTrigger 
              value="payslips" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-6"
              data-testid="tab-payslips"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Buste Paga
            </TabsTrigger>
            <TabsTrigger 
              value="deadlines" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-6"
              data-testid="tab-deadlines"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Scadenze
            </TabsTrigger>
            <TabsTrigger 
              value="notes" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-6"
              data-testid="tab-notes"
            >
              <StickyNote className="h-4 w-4 mr-2" />
              Appunti
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-6"
              data-testid="tab-notifications"
            >
              <Bell className="h-4 w-4 mr-2" />
              Notifiche
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            {/* Upload Document Form */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5 text-teal-500" />
                  Carica Nuovo Documento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDocUpload} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doc-title">Titolo</Label>
                      <Input
                        id="doc-title"
                        value={docForm.title}
                        onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                        placeholder="Es: Dichiarazione IVA 2024"
                        required
                        className="border-slate-200"
                        data-testid="doc-title-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc-category">Categoria</Label>
                      <Select 
                        value={docForm.category} 
                        onValueChange={(value) => setDocForm({ ...docForm, category: value })}
                      >
                        <SelectTrigger className="border-slate-200" data-testid="doc-category-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {docCategories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-description">Descrizione (opzionale)</Label>
                    <Textarea
                      id="doc-description"
                      value={docForm.description}
                      onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                      placeholder="Aggiungi una descrizione..."
                      className="border-slate-200 resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-file">File (PDF)</Label>
                    <Input
                      id="doc-file"
                      type="file"
                      ref={docFileRef}
                      accept=".pdf"
                      onChange={(e) => setDocForm({ ...docForm, file: e.target.files?.[0] || null })}
                      required
                      className="border-slate-200"
                      data-testid="doc-file-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={uploadingDoc}
                    className="bg-teal-500 hover:bg-teal-600 text-white font-semibold"
                    data-testid="doc-upload-btn"
                  >
                    {uploadingDoc ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Caricamento...
                      </div>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Carica Documento
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* AI Upload Section */}
            <Card className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-teal-500" />
                  Caricamento Intelligente con AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4">
                  Carica un PDF e l'AI analizzerà automaticamente il documento, estrarrà le informazioni e lo classificherà.
                </p>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    ref={docFileAIRef}
                    accept=".pdf"
                    onChange={handleDocUploadAI}
                    disabled={uploadingDocAI}
                    className="border-teal-200 flex-1"
                    data-testid="doc-ai-file-input"
                  />
                  {uploadingDocAI && (
                    <div className="flex items-center gap-2 text-teal-600">
                      <Bot className="h-5 w-5 animate-bounce" />
                      <span>Analisi AI in corso...</span>
                    </div>
                  )}
                </div>
                
                {/* AI Analysis Result */}
                {aiAnalysisResult && aiAnalysisResult.ai_analysis && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-teal-100">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-slate-900">Analisi completata!</span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Tipo documento:</span>
                        <span className="ml-2 font-medium">{aiAnalysisResult.ai_analysis.tipo_documento}</span>
                      </div>
                      {aiAnalysisResult.ai_analysis.modello_tributario && (
                        <div>
                          <span className="text-slate-500">Modello:</span>
                          <Badge className="ml-2 bg-teal-500 text-white">
                            {aiAnalysisResult.ai_analysis.modello_tributario}
                          </Badge>
                        </div>
                      )}
                      <div className="col-span-2">
                        <span className="text-slate-500">Descrizione:</span>
                        <p className="mt-1 text-slate-700">{aiAnalysisResult.ai_analysis.descrizione_estesa}</p>
                      </div>
                      {aiAnalysisResult.ai_analysis.tags && aiAnalysisResult.ai_analysis.tags.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-slate-500">Tags:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {aiAnalysisResult.ai_analysis.tags.map((tag, i) => (
                              <Badge key={i} className="bg-slate-100 text-slate-600">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Documents List */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Documenti Caricati</CardTitle>
              </CardHeader>
              <CardContent>
                {documents.length > 0 ? (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center justify-between p-4 bg-stone-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                            <FileText className="h-6 w-6 text-blue-600" />
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
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDocument(doc.id)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
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
                    <p className="text-slate-500">Nessun documento caricato</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payslips Tab */}
          <TabsContent value="payslips" className="space-y-6">
            {/* Upload Payslip Form */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Upload className="h-5 w-5 text-teal-500" />
                  Carica Nuova Busta Paga
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePayslipUpload} className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="payslip-title">Titolo</Label>
                      <Input
                        id="payslip-title"
                        value={payslipForm.title}
                        onChange={(e) => setPayslipForm({ ...payslipForm, title: e.target.value })}
                        placeholder="Es: Busta paga Gennaio"
                        required
                        className="border-slate-200"
                        data-testid="payslip-title-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payslip-month">Mese</Label>
                      <Select 
                        value={payslipForm.month} 
                        onValueChange={(value) => setPayslipForm({ ...payslipForm, month: value })}
                      >
                        <SelectTrigger className="border-slate-200" data-testid="payslip-month-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map(month => (
                            <SelectItem key={month} value={month}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payslip-year">Anno</Label>
                      <Select 
                        value={String(payslipForm.year)} 
                        onValueChange={(value) => setPayslipForm({ ...payslipForm, year: parseInt(value) })}
                      >
                        <SelectTrigger className="border-slate-200" data-testid="payslip-year-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[2024, 2025, 2026].map(year => (
                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payslip-file">File (PDF)</Label>
                    <Input
                      id="payslip-file"
                      type="file"
                      ref={payslipFileRef}
                      accept=".pdf"
                      onChange={(e) => setPayslipForm({ ...payslipForm, file: e.target.files?.[0] || null })}
                      required
                      className="border-slate-200"
                      data-testid="payslip-file-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={uploadingPayslip}
                    className="bg-teal-500 hover:bg-teal-600 text-slate-900 font-semibold"
                    data-testid="payslip-upload-btn"
                  >
                    {uploadingPayslip ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent"></div>
                        Caricamento...
                      </div>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Carica Busta Paga
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Payslips List */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Buste Paga Caricate</CardTitle>
              </CardHeader>
              <CardContent>
                {payslips.length > 0 ? (
                  <div className="space-y-3">
                    {payslips.map((payslip) => (
                      <div 
                        key={payslip.id} 
                        className="flex items-center justify-between p-4 bg-stone-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <Wallet className="h-6 w-6 text-emerald-600" />
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
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deletePayslip(payslip.id)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessuna busta paga caricata</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-6">
            {/* Create/Edit Note Form */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-teal-500" />
                  {editingNote ? "Modifica Appunto" : "Nuovo Appunto"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleNoteSave} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="note-title">Titolo</Label>
                    <Input
                      id="note-title"
                      value={noteForm.title}
                      onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                      placeholder="Titolo dell'appunto"
                      required
                      className="border-slate-200"
                      data-testid="note-title-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note-content">Contenuto</Label>
                    <Textarea
                      id="note-content"
                      value={noteForm.content}
                      onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                      placeholder="Scrivi l'appunto..."
                      required
                      className="border-slate-200 min-h-[150px]"
                      data-testid="note-content-input"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        id="note-internal"
                        checked={noteForm.is_internal}
                        onCheckedChange={(checked) => setNoteForm({ ...noteForm, is_internal: checked })}
                        data-testid="note-internal-switch"
                      />
                      <Label htmlFor="note-internal" className="flex items-center gap-2 cursor-pointer">
                        {noteForm.is_internal ? (
                          <>
                            <EyeOff className="h-4 w-4 text-amber-500" />
                            <span className="text-amber-600">Nota interna (solo tu puoi vederla)</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 text-teal-500" />
                            <span className="text-teal-600">Visibile al cliente</span>
                          </>
                        )}
                      </Label>
                    </div>
                    <div className="flex gap-2">
                      {editingNote && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingNote(null);
                            setNoteForm({ title: "", content: "", is_internal: false });
                          }}
                          className="border-slate-200"
                        >
                          Annulla
                        </Button>
                      )}
                      <Button
                        type="submit"
                        disabled={savingNote}
                        className="bg-teal-500 hover:bg-teal-600 text-slate-900 font-semibold"
                        data-testid="note-save-btn"
                      >
                        {savingNote ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-900 border-t-transparent"></div>
                            Salvataggio...
                          </div>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            {editingNote ? "Aggiorna" : "Crea Appunto"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Notes List */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Appunti</CardTitle>
              </CardHeader>
              <CardContent>
                {notes.length > 0 ? (
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <div 
                        key={note.id} 
                        className={`p-5 bg-stone-50 rounded-lg border-l-4 ${
                          note.is_internal ? "border-amber-500" : "border-teal-500"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold text-slate-900">{note.title}</h4>
                            <Badge className={note.is_internal 
                              ? "bg-amber-50 text-amber-700 border border-amber-100" 
                              : "bg-teal-50 text-teal-700 border border-teal-100"
                            }>
                              {note.is_internal ? (
                                <>
                                  <EyeOff className="h-3 w-3 mr-1" />
                                  Interno
                                </>
                              ) : (
                                <>
                                  <Eye className="h-3 w-3 mr-1" />
                                  Pubblico
                                </>
                              )}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {format(parseISO(note.created_at), "d MMM yyyy", { locale: it })}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditNote(note)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteNote(note.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-slate-600 whitespace-pre-wrap">{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <StickyNote className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessun appunto creato</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deadlines Tab */}
          <TabsContent value="deadlines" className="space-y-6">
            {/* Create Deadline Form */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-teal-500" />
                  Nuova Scadenza per {client?.full_name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDeadlineSave} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Titolo</Label>
                      <Input
                        value={deadlineForm.title}
                        onChange={(e) => setDeadlineForm({ ...deadlineForm, title: e.target.value })}
                        placeholder="Es: Modelo 303 Q1 2025"
                        required
                        className="border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data Scadenza</Label>
                      <Input
                        type="date"
                        value={deadlineForm.due_date}
                        onChange={(e) => setDeadlineForm({ ...deadlineForm, due_date: e.target.value })}
                        required
                        className="border-slate-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrizione</Label>
                    <Textarea
                      value={deadlineForm.description}
                      onChange={(e) => setDeadlineForm({ ...deadlineForm, description: e.target.value })}
                      placeholder="Descrizione della scadenza..."
                      required
                      className="border-slate-200 resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Categoria</Label>
                      <Select 
                        value={deadlineForm.category} 
                        onValueChange={(v) => setDeadlineForm({ ...deadlineForm, category: v })}
                      >
                        <SelectTrigger className="border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IVA">IVA</SelectItem>
                          <SelectItem value="IRPF">IRPF</SelectItem>
                          <SelectItem value="IGIC">IGIC</SelectItem>
                          <SelectItem value="Società">Società</SelectItem>
                          <SelectItem value="Informativa">Informativa</SelectItem>
                          <SelectItem value="Altro">Altro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priorità</Label>
                      <Select 
                        value={deadlineForm.priority} 
                        onValueChange={(v) => setDeadlineForm({ ...deadlineForm, priority: v })}
                      >
                        <SelectTrigger className="border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bassa">Bassa</SelectItem>
                          <SelectItem value="normale">Normale</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Stato</Label>
                      <Select 
                        value={deadlineForm.status} 
                        onValueChange={(v) => setDeadlineForm({ ...deadlineForm, status: v })}
                      >
                        <SelectTrigger className="border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="da_fare">Da fare</SelectItem>
                          <SelectItem value="in_lavorazione">In lavorazione</SelectItem>
                          <SelectItem value="completata">Completata</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={deadlineForm.send_notification}
                      onCheckedChange={(v) => setDeadlineForm({ ...deadlineForm, send_notification: v })}
                      id="send-notification"
                    />
                    <Label htmlFor="send-notification" className="text-sm text-slate-600">
                      Invia notifica email al cliente
                    </Label>
                  </div>
                  <Button
                    type="submit"
                    disabled={savingDeadline}
                    className="bg-teal-500 hover:bg-teal-600 text-white font-semibold"
                  >
                    {savingDeadline ? "Salvataggio..." : "Crea Scadenza"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Deadlines List */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Scadenze del Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                {deadlines.length > 0 ? (
                  <div className="space-y-3">
                    {deadlines.map((deadline) => (
                      <div 
                        key={deadline.id} 
                        className="flex items-center justify-between p-4 bg-stone-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${
                            deadline.status === 'completata' ? 'bg-green-500' :
                            deadline.status === 'scaduta' ? 'bg-red-500' :
                            deadline.status === 'in_lavorazione' ? 'bg-blue-500' :
                            'bg-amber-500'
                          }`}></div>
                          <div>
                            <p className="font-medium text-slate-900">{deadline.title}</p>
                            <p className="text-sm text-slate-500">{deadline.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`priority-${deadline.priority}`}>
                            {deadline.priority}
                          </Badge>
                          <Badge className={`status-${deadline.status}`}>
                            {deadline.status.replace('_', ' ')}
                          </Badge>
                          <Badge className="bg-teal-50 text-teal-700 border border-teal-100">
                            {format(parseISO(deadline.due_date), "d MMM yyyy", { locale: it })}
                          </Badge>
                          <Select
                            value={deadline.status}
                            onValueChange={(v) => updateDeadlineStatus(deadline.id, v)}
                          >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="da_fare">Da fare</SelectItem>
                              <SelectItem value="in_lavorazione">In lavorazione</SelectItem>
                              <SelectItem value="completata">Completata</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendDeadlineReminder(deadline.id)}
                            className="border-teal-200 text-teal-600 hover:bg-teal-50"
                            title="Invia promemoria email"
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDeadline(deadline.id)}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessuna scadenza per questo cliente</p>
                    <p className="text-sm text-slate-400">Crea una nuova scadenza usando il form sopra</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-teal-500" />
                  Invia Comunicazione al Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendNotification} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Oggetto</Label>
                    <Input
                      value={notificationForm.title}
                      onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                      placeholder="Es: Documenti necessari per dichiarazione"
                      required
                      className="border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Messaggio</Label>
                    <Textarea
                      value={notificationForm.content}
                      onChange={(e) => setNotificationForm({ ...notificationForm, content: e.target.value })}
                      placeholder="Scrivi il messaggio che verrà inviato via email al cliente..."
                      required
                      className="border-slate-200 resize-none"
                      rows={6}
                    />
                  </div>
                  <div className="bg-stone-50 p-4 rounded-lg">
                    <p className="text-sm text-slate-600">
                      <strong>Destinatario:</strong> {client?.full_name} ({client?.email})
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      Il cliente riceverà questa comunicazione via email con il branding di Fiscal Tax Canarie.
                    </p>
                  </div>
                  <Button
                    type="submit"
                    disabled={sendingNotification}
                    className="bg-teal-500 hover:bg-teal-600 text-white font-semibold"
                    data-testid="send-notification-btn"
                  >
                    {sendingNotification ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Invio in corso...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Invia Email
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5 text-amber-500" />
                  Notifiche Rapide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 mb-4">
                  Usa queste azioni rapide per inviare notifiche predefinite:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border border-slate-200 bg-stone-50">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-slate-900 mb-2">Promemoria Scadenze</h4>
                      <p className="text-sm text-slate-600 mb-4">
                        Vai alla tab Scadenze e clicca l'icona campanella per inviare un promemoria al cliente.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("deadlines")}
                        className="border-slate-200 text-slate-600"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Vai alle Scadenze
                      </Button>
                    </CardContent>
                  </Card>
                  <Card className="border border-slate-200 bg-stone-50">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-slate-900 mb-2">Notifica Documento</h4>
                      <p className="text-sm text-slate-600 mb-4">
                        Carica un documento con AI per inviare automaticamente una notifica al cliente.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("documents")}
                        className="border-slate-200 text-slate-600"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Vai ai Documenti
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ClientDetail;
