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
import { toast } from '@/components/ui/sonner';
import { 
  ArrowLeft, 
  FileText, 
  Wallet,
  StickyNote,
  LogOut,
  User,
  Users,
  Plus,
  Upload,
  Download,
  Trash2,
  Edit,
  Edit2,
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
  Send,
  Euro,
  Shield,
  Building2,
  X,
  Briefcase,
  Folder,
  Key,
  MessageSquare
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import FeeManagement from "@/components/FeeManagement";
import EmployeeManagementAdmin from "@/components/EmployeeManagementAdmin";
import ClientNotificationsHistory from "@/components/ClientNotificationsHistory";
import DocumentFolderBrowser from "@/components/DocumentFolderBrowser";
import DocumentPreview from "@/components/DocumentPreview";
import TicketManagementAdmin from "@/components/TicketManagementAdmin";
import CompanyStructureSection from "@/components/CompanyStructureSection";

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
  const [documentViewMode, setDocumentViewMode] = useState("folders"); // "folders" o "list"
  
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
    send_notification: false,
    is_recurring: false,
    recurrence_type: "mensile",
    recurrence_end_date: "",
    send_reminders: true,
    reminder_days: [7, 3, 1, 0]
  });
  const [savingDeadline, setSavingDeadline] = useState(false);
  
  // Notification form
  const [notificationForm, setNotificationForm] = useState({
    type: "note",
    title: "",
    content: ""
  });
  
  // Client edit form (anagrafica)
  const [editingClient, setEditingClient] = useState(false);
  const [clientForm, setClientForm] = useState({});
  const [savingClient, setSavingClient] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);
  
  // Bank credentials state
  const [bankCredentials, setBankCredentials] = useState([]);
  const [bankEntities, setBankEntities] = useState([]);
  const [showBankDialog, setShowBankDialog] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_entity_id: "", username: "", password: "" });
  const [savingBank, setSavingBank] = useState(false);
  const [showBankPassword, setShowBankPassword] = useState({});
  const [newBankName, setNewBankName] = useState("");
  const [creatingBank, setCreatingBank] = useState(false);

  // Additional emails state
  const [additionalEmails, setAdditionalEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);

  // Client categories state
  const [clientCategories, setClientCategories] = useState([]);

  // Document rename state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameDoc, setRenameDoc] = useState(null);
  const [newFileName, setNewFileName] = useState("");
  const [renamingDoc, setRenamingDoc] = useState(false);

  // Document preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

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
    fetchBankData();
    fetchClientCategories();
  }, [clientId]);

  // Fetch client categories
  const fetchClientCategories = async () => {
    try {
      const res = await axios.get(`${API}/client-categories`, { headers });
      setClientCategories(res.data);
    } catch (error) {
      console.error("Errore nel caricamento categorie clienti:", error);
    }
  };

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
      // Inizializza form anagrafica
      setClientForm({
        full_name: clientRes.data.full_name || "",
        email: clientRes.data.email || "",
        phone: clientRes.data.phone || "",
        codice_fiscale: clientRes.data.codice_fiscale || "",
        nie: clientRes.data.nie || "",
        nif: clientRes.data.nif || "",
        cif: clientRes.data.cif || "",
        indirizzo: clientRes.data.indirizzo || "",
        citta: clientRes.data.citta || "",
        cap: clientRes.data.cap || "",
        provincia: clientRes.data.provincia || "",
        iban: clientRes.data.iban || "",
        regime_fiscale: clientRes.data.regime_fiscale || "",
        tipo_attivita: clientRes.data.tipo_attivita || "",
        tipo_cliente: clientRes.data.tipo_cliente || "autonomo",
        stato: clientRes.data.stato || "attivo",
        // Campi struttura societaria
        tipo_amministrazione: clientRes.data.tipo_amministrazione || "",
        company_administrators: clientRes.data.company_administrators || [],
        company_shareholders: clientRes.data.company_shareholders || []
      });
      // Set additional emails
      setAdditionalEmails(clientRes.data.additional_emails || []);
    } catch (error) {
      toast.error("Errore nel caricamento dei dati");
      if (error.response?.status === 404) {
        navigate("/admin");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch bank entities and credentials
  const fetchBankData = async () => {
    try {
      const [entitiesRes, credentialsRes] = await Promise.all([
        axios.get(`${API}/bank-entities`, { headers }),
        axios.get(`${API}/clients/${clientId}/bank-credentials`, { headers })
      ]);
      setBankEntities(entitiesRes.data);
      setBankCredentials(credentialsRes.data);
    } catch (error) {
      console.error("Errore nel caricamento dati bancari:", error);
    }
  };

  // Bank credentials functions
  const handleAddBankCredential = async (e) => {
    e.preventDefault();
    if (!bankForm.bank_entity_id || !bankForm.username || !bankForm.password) {
      toast.error("Compila tutti i campi");
      return;
    }
    setSavingBank(true);
    try {
      await axios.post(`${API}/clients/${clientId}/bank-credentials`, bankForm, { headers });
      toast.success("Credenziale bancaria aggiunta");
      setBankForm({ bank_entity_id: "", username: "", password: "" });
      setShowBankDialog(false);
      fetchBankData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'aggiunta della credenziale");
    } finally {
      setSavingBank(false);
    }
  };

  const handleDeleteBankCredential = async (credId) => {
    if (!confirm("Sei sicuro di voler eliminare questa credenziale?")) return;
    try {
      await axios.delete(`${API}/clients/${clientId}/bank-credentials/${credId}`, { headers });
      toast.success("Credenziale eliminata");
      fetchBankData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleCreateBankEntity = async () => {
    if (!newBankName.trim()) {
      toast.error("Inserisci il nome della banca");
      return;
    }
    setCreatingBank(true);
    try {
      const res = await axios.post(`${API}/bank-entities`, { name: newBankName }, { headers });
      toast.success(`Banca "${newBankName}" aggiunta`);
      setNewBankName("");
      setBankForm({ ...bankForm, bank_entity_id: res.data.id });
      fetchBankData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nella creazione");
    } finally {
      setCreatingBank(false);
    }
  };

  // Email functions
  const handleAddEmail = async () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Inserisci un'email valida");
      return;
    }
    setAddingEmail(true);
    try {
      const formData = new FormData();
      formData.append("email", newEmail);
      await axios.post(`${API}/clients/${clientId}/emails`, formData, { headers });
      toast.success("Email aggiunta");
      setNewEmail("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'aggiunta dell'email");
    } finally {
      setAddingEmail(false);
    }
  };

  const handleDeleteEmail = async (email) => {
    try {
      await axios.delete(`${API}/clients/${clientId}/emails/${encodeURIComponent(email)}`, { headers });
      toast.success("Email rimossa");
      fetchData();
    } catch (error) {
      toast.error("Errore nella rimozione dell'email");
    }
  };

  // Client management functions
  const handleSaveClient = async (e) => {
    e.preventDefault();
    setSavingClient(true);
    
    try {
      await axios.put(`${API}/clients/${clientId}`, clientForm, { headers });
      toast.success("Dati cliente aggiornati");
      setEditingClient(false);
      fetchData();
    } catch (error) {
      toast.error("Errore nell'aggiornamento dei dati");
    } finally {
      setSavingClient(false);
    }
  };

  const handleDeleteClient = async (permanent = false) => {
    const message = permanent 
      ? "Sei sicuro di voler ELIMINARE PERMANENTEMENTE questo cliente e tutti i suoi dati? Questa azione non può essere annullata."
      : "Sei sicuro di voler archiviare questo cliente?";
    
    if (!confirm(message)) return;
    
    setDeletingClient(true);
    try {
      await axios.delete(`${API}/clients/${clientId}?permanent=${permanent}`, { headers });
      toast.success(permanent ? "Cliente eliminato permanentemente" : "Cliente archiviato");
      navigate("/admin");
    } catch (error) {
      toast.error("Errore nell'operazione");
    } finally {
      setDeletingClient(false);
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
        list_ids: [],
        is_recurring: deadlineForm.is_recurring,
        recurrence_type: deadlineForm.is_recurring ? deadlineForm.recurrence_type : null,
        recurrence_end_date: deadlineForm.is_recurring && deadlineForm.recurrence_end_date ? deadlineForm.recurrence_end_date : null,
        send_reminders: deadlineForm.send_reminders,
        reminder_days: deadlineForm.reminder_days
      };
      
      await axios.post(`${API}/deadlines`, deadlineData, { headers });
      
      let message = "Scadenza creata";
      if (deadlineForm.is_recurring) message += ` (ricorrente ${deadlineForm.recurrence_type})`;
      if (deadlineForm.send_notification) message += " e notifica inviata!";
      toast.success(message);
      
      setDeadlineForm({
        title: "",
        description: "",
        due_date: "",
        category: "IRPF",
        priority: "normale",
        status: "da_fare",
        send_notification: false,
        is_recurring: false,
        recurrence_type: "mensile",
        recurrence_end_date: "",
        send_reminders: true,
        reminder_days: [7, 3, 1, 0]
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

  // Document Rename
  const openRenameDialog = (doc) => {
    setRenameDoc(doc);
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
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nella rinomina del documento");
    } finally {
      setRenamingDoc(false);
    }
  };

  // Document Preview
  const openPreview = (doc) => {
    setPreviewDoc(doc);
    // Costruisci l'URL di preview
    const url = `${API}/documents/${doc.id}/preview`;
    setPreviewUrl(`${url}?token=${token}`);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewDoc(null);
    setPreviewUrl(null);
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
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Ticket
                  </Badge>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const response = await axios.get(`${API}/backup/client/${clientId}`, {
                          headers,
                          responseType: 'blob'
                        });
                        const contentDisposition = response.headers['content-disposition'];
                        let filename = `backup_${client?.full_name || 'cliente'}.zip`;
                        if (contentDisposition) {
                          const matches = contentDisposition.match(/filename="(.+)"/);
                          if (matches) filename = matches[1];
                        }
                        const blob = new Blob([response.data]);
                        const downloadUrl = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(downloadUrl);
                        document.body.removeChild(a);
                        toast.success("Backup scaricato!");
                      } catch (error) {
                        toast.error("Errore download backup");
                      }
                    }}
                    className="border-green-200 text-green-600 hover:bg-green-50"
                    title="Scarica backup cliente"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Backup
                  </Button>
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
              value="tickets" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-6"
              data-testid="tab-tickets"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Ticket
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-6"
              data-testid="tab-notifications"
            >
              <Bell className="h-4 w-4 mr-2" />
              Notifiche
            </TabsTrigger>
            <TabsTrigger 
              value="fees" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-6"
              data-testid="tab-fees"
            >
              <Euro className="h-4 w-4 mr-2" />
              Onorari
            </TabsTrigger>
            <TabsTrigger 
              value="anagrafica" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-6"
              data-testid="tab-anagrafica"
            >
              <User className="h-4 w-4 mr-2" />
              Anagrafica
            </TabsTrigger>
            <TabsTrigger 
              value="employees" 
              className="text-slate-600 data-[state=active]:bg-teal-500 data-[state=active]:text-white px-6"
              data-testid="tab-employees"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Dipendenti
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

            {/* Archivio Documenti con Vista Cartelle */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="font-heading text-lg">Archivio Documenti</CardTitle>
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
              </CardHeader>
              <CardContent>
                {documentViewMode === "folders" ? (
                  <DocumentFolderBrowser 
                    clientId={clientId}
                    token={token}
                    userRole={user?.role || "commercialista"}
                    onDocumentView={(doc) => openPreview(doc)}
                    onDocumentDownload={(doc) => downloadFile("documents", doc.id, doc.file_name)}
                  />
                ) : (
                  /* Vista Lista Tradizionale */
                  documents.length > 0 ? (
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
                            {doc.folder_category && doc.folder_category !== "documenti" && (
                              <Badge className="bg-teal-100 text-teal-600 border border-teal-200">
                                {doc.folder_category}
                              </Badge>
                            )}
                            {doc.document_year && (
                              <Badge variant="outline" className="text-slate-500">
                                {doc.document_year}
                              </Badge>
                            )}
                            {doc.signed && (
                              <Badge className="bg-green-100 text-green-700 border border-green-200">
                                Firmato
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPreview(doc)}
                              className="border-teal-200 text-teal-600 hover:bg-teal-50"
                              title="Anteprima"
                              data-testid={`preview-doc-${doc.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadFile("documents", doc.id, doc.file_name)}
                              className="border-slate-200"
                              title="Scarica"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRenameDialog(doc)}
                              className="border-blue-200 text-blue-600 hover:bg-blue-50"
                              title="Rinomina"
                              data-testid={`rename-doc-${doc.id}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            {doc.file_name?.endsWith('.pdf') && !doc.signed && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSigningDoc(doc);
                                  setShowSignDialog(true);
                                }}
                                className="border-teal-200 text-teal-600 hover:bg-teal-50"
                                title="Firma digitalmente"
                              >
                                <FileSignature className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteDocument(doc.id)}
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              title="Elimina"
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
                  )
                )}
              </CardContent>
            </Card>

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

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <TicketManagementAdmin 
              token={token}
              clientId={clientId}
              clientName={client?.full_name}
              API={API}
            />
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
                  
                  {/* Opzioni Ricorrenza */}
                  <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={deadlineForm.is_recurring}
                        onCheckedChange={(v) => setDeadlineForm({ ...deadlineForm, is_recurring: v })}
                        id="is-recurring"
                      />
                      <Label htmlFor="is-recurring" className="text-sm font-medium text-slate-700">
                        Scadenza ricorrente
                      </Label>
                    </div>
                    
                    {deadlineForm.is_recurring && (
                      <div className="grid md:grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                          <Label>Frequenza</Label>
                          <Select 
                            value={deadlineForm.recurrence_type} 
                            onValueChange={(v) => setDeadlineForm({ ...deadlineForm, recurrence_type: v })}
                          >
                            <SelectTrigger className="border-slate-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mensile">Mensile</SelectItem>
                              <SelectItem value="trimestrale">Trimestrale</SelectItem>
                              <SelectItem value="annuale">Annuale</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Data fine ricorrenza (opzionale)</Label>
                          <Input
                            type="date"
                            value={deadlineForm.recurrence_end_date}
                            onChange={(e) => setDeadlineForm({ ...deadlineForm, recurrence_end_date: e.target.value })}
                            className="border-slate-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Opzioni Notifiche */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={deadlineForm.send_reminders}
                        onCheckedChange={(v) => setDeadlineForm({ ...deadlineForm, send_reminders: v })}
                        id="send-reminders"
                      />
                      <Label htmlFor="send-reminders" className="text-sm text-slate-600">
                        Promemoria automatici (7, 3, 1 giorni prima)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={deadlineForm.send_notification}
                        onCheckedChange={(v) => setDeadlineForm({ ...deadlineForm, send_notification: v })}
                        id="send-notification"
                      />
                      <Label htmlFor="send-notification" className="text-sm text-slate-600">
                        Invia notifica email immediata al cliente
                      </Label>
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={savingDeadline}
                    className="bg-teal-500 hover:bg-teal-600 text-white font-semibold"
                  >
                    {savingDeadline ? "Salvataggio..." : (deadlineForm.is_recurring ? "Crea Scadenza Ricorrente" : "Crea Scadenza")}
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
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900">{deadline.title}</p>
                              {deadline.is_recurring && (
                                <Badge className="bg-purple-50 text-purple-700 text-xs">
                                  {deadline.recurrence_type}
                                </Badge>
                              )}
                            </div>
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
            
            {/* Cronologia Notifiche */}
            <ClientNotificationsHistory 
              token={token} 
              clientId={clientId} 
              clientName={client?.full_name}
            />
          </TabsContent>
          <TabsContent value="fees" className="space-y-6">
            <FeeManagement 
              clientId={clientId} 
              clientName={client?.full_name} 
              token={token} 
              API={API} 
            />
          </TabsContent>

          {/* Anagrafica Tab */}
          <TabsContent value="anagrafica" className="space-y-6">
            <Card className="bg-white border border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-teal-500" />
                  Dati Anagrafici Cliente
                </CardTitle>
                <div className="flex gap-2">
                  {!editingClient ? (
                    <Button
                      onClick={() => setEditingClient(true)}
                      className="bg-teal-500 hover:bg-teal-600 active:bg-slate-900 active:scale-95 text-white transition-all"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifica
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingClient(false);
                        // Reset form
                        setClientForm({
                          ...clientForm,
                          full_name: client?.full_name || "",
                          phone: client?.phone || ""
                        });
                      }}
                      className="border-slate-200"
                    >
                      Annulla
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveClient} className="space-y-6">
                  {/* Dati Personali */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b">Dati Personali</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nome Completo *</Label>
                        <Input
                          value={clientForm.full_name || ""}
                          onChange={(e) => setClientForm({...clientForm, full_name: e.target.value})}
                          disabled={!editingClient}
                          className="border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={clientForm.email || ""}
                          disabled={true}
                          className="border-slate-200 bg-slate-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefono</Label>
                        <Input
                          value={clientForm.phone || ""}
                          onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                          disabled={!editingClient}
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
                          value={clientForm.nie || ""}
                          onChange={(e) => setClientForm({...clientForm, nie: e.target.value})}
                          disabled={!editingClient}
                          className="border-slate-200"
                          placeholder="X-1234567-A"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>NIF <span className="text-xs text-slate-400">(Persone fisiche)</span></Label>
                        <Input
                          value={clientForm.nif || ""}
                          onChange={(e) => setClientForm({...clientForm, nif: e.target.value})}
                          disabled={!editingClient}
                          className="border-slate-200"
                          placeholder="12345678A"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>CIF <span className="text-xs text-slate-400">(Società)</span></Label>
                        <Input
                          value={clientForm.cif || ""}
                          onChange={(e) => setClientForm({...clientForm, cif: e.target.value})}
                          disabled={!editingClient}
                          className="border-slate-200"
                          placeholder="B12345678"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Codice Fiscale IT</Label>
                        <Input
                          value={clientForm.codice_fiscale || ""}
                          onChange={(e) => setClientForm({...clientForm, codice_fiscale: e.target.value})}
                          disabled={!editingClient}
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
                          value={clientForm.indirizzo || ""}
                          onChange={(e) => setClientForm({...clientForm, indirizzo: e.target.value})}
                          disabled={!editingClient}
                          className="border-slate-200"
                          placeholder="Calle Principal, 123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Città</Label>
                        <Input
                          value={clientForm.citta || ""}
                          onChange={(e) => setClientForm({...clientForm, citta: e.target.value})}
                          disabled={!editingClient}
                          className="border-slate-200"
                          placeholder="Las Palmas"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Provincia</Label>
                        <Input
                          value={clientForm.provincia || ""}
                          onChange={(e) => setClientForm({...clientForm, provincia: e.target.value})}
                          disabled={!editingClient}
                          className="border-slate-200"
                          placeholder="Las Palmas"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>CAP</Label>
                        <Input
                          value={clientForm.cap || ""}
                          onChange={(e) => setClientForm({...clientForm, cap: e.target.value})}
                          disabled={!editingClient}
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
                          value={clientForm.iban || ""}
                          onChange={(e) => setClientForm({...clientForm, iban: e.target.value})}
                          disabled={!editingClient}
                          className="border-slate-200"
                          placeholder="ES12 1234 5678 9012 3456 7890"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Attività e Tipo Cliente */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b">Classificazione</h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo Cliente</Label>
                        <Select
                          value={clientForm.tipo_cliente || "autonomo"}
                          onValueChange={(v) => setClientForm({...clientForm, tipo_cliente: v})}
                          disabled={!editingClient}
                        >
                          <SelectTrigger className="border-slate-200">
                            <SelectValue placeholder="Seleziona categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {clientCategories.length > 0 ? (
                              clientCategories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))
                            ) : (
                              <>
                                <SelectItem value="autonomo">Autonomo</SelectItem>
                                <SelectItem value="societa">Società</SelectItem>
                                <SelectItem value="privato">Privato</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Regime Fiscale</Label>
                        <Input
                          value={clientForm.regime_fiscale || ""}
                          onChange={(e) => setClientForm({...clientForm, regime_fiscale: e.target.value})}
                          disabled={!editingClient}
                          className="border-slate-200"
                          placeholder="Es: Regime ordinario"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo Attività</Label>
                        <Input
                          value={clientForm.tipo_attivita || ""}
                          onChange={(e) => setClientForm({...clientForm, tipo_attivita: e.target.value})}
                          disabled={!editingClient}
                          className="border-slate-200"
                          placeholder="Es: Commercio"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Stato</Label>
                        <Select
                          value={clientForm.stato || "attivo"}
                          onValueChange={(v) => setClientForm({...clientForm, stato: v})}
                          disabled={!editingClient}
                        >
                          <SelectTrigger className="border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="attivo">Attivo</SelectItem>
                            <SelectItem value="sospeso">Sospeso</SelectItem>
                            <SelectItem value="cessato">Cessato</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {editingClient && (
                    <div className="flex justify-end pt-4 border-t">
                      <Button
                        type="submit"
                        disabled={savingClient}
                        className="bg-teal-500 hover:bg-teal-600 active:bg-slate-900 active:scale-95 text-white transition-all"
                      >
                        {savingClient ? "Salvataggio..." : "Salva Modifiche"}
                      </Button>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* Struttura Societaria - SOLO PER SOCIETÀ */}
            {clientForm.tipo_cliente === 'societa' && (
              <CompanyStructureSection
                tipoAmministrazione={clientForm.tipo_amministrazione}
                administrators={clientForm.company_administrators}
                shareholders={clientForm.company_shareholders}
                editing={editingClient}
                onUpdate={(data) => {
                  setClientForm({
                    ...clientForm,
                    tipo_amministrazione: data.tipo_amministrazione,
                    company_administrators: data.company_administrators,
                    company_shareholders: data.company_shareholders
                  });
                }}
              />
            )}

            {/* Email Aggiuntive Card */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5 text-teal-500" />
                  Email Aggiuntive
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                  Gestisci gli indirizzi email aggiuntivi associati a questo cliente.
                </p>
                
                {/* Email principale */}
                <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-teal-600" />
                    <span className="font-medium text-teal-800">{client?.email}</span>
                    <Badge className="bg-teal-100 text-teal-700 text-xs">Principale</Badge>
                  </div>
                </div>

                {/* Email aggiuntive */}
                {additionalEmails.length > 0 && (
                  <div className="space-y-2">
                    {additionalEmails.map((email, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-500" />
                          <span className="text-slate-700">{email}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEmail(email)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Aggiungi email */}
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nuova@email.com"
                    className="border-slate-200"
                    data-testid="new-email-input"
                  />
                  <Button
                    onClick={handleAddEmail}
                    disabled={addingEmail}
                    className="bg-teal-500 hover:bg-teal-600 active:bg-slate-900 active:scale-95 text-white transition-all"
                    data-testid="add-email-btn"
                  >
                    {addingEmail ? "..." : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Chiavi Consultive Bancarie Card */}
            <Card className="bg-white border border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Key className="h-5 w-5 text-amber-500" />
                  Chiavi Consultive Bancarie
                </CardTitle>
                <Dialog open={showBankDialog} onOpenChange={setShowBankDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-amber-500 hover:bg-amber-600 text-white" data-testid="add-bank-btn">
                      <Plus className="h-4 w-4 mr-2" />
                      Aggiungi
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-amber-500" />
                        Aggiungi Credenziale Bancaria
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddBankCredential} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Banca *</Label>
                        <Select
                          value={bankForm.bank_entity_id}
                          onValueChange={(v) => setBankForm({ ...bankForm, bank_entity_id: v })}
                        >
                          <SelectTrigger className="border-slate-200" data-testid="bank-select">
                            <SelectValue placeholder="Seleziona banca" />
                          </SelectTrigger>
                          <SelectContent>
                            {bankEntities.map((bank) => (
                              <SelectItem key={bank.id} value={bank.id}>{bank.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Aggiungi nuova banca */}
                      <div className="border-t pt-3">
                        <Label className="text-xs text-slate-500">Oppure crea una nuova banca:</Label>
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={newBankName}
                            onChange={(e) => setNewBankName(e.target.value)}
                            placeholder="Nome nuova banca"
                            className="border-slate-200"
                            data-testid="new-bank-name"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCreateBankEntity}
                            disabled={creatingBank}
                            className="shrink-0"
                          >
                            {creatingBank ? "..." : "Crea"}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Nome Utente *</Label>
                        <Input
                          value={bankForm.username}
                          onChange={(e) => setBankForm({ ...bankForm, username: e.target.value })}
                          placeholder="Username/Email accesso"
                          className="border-slate-200"
                          data-testid="bank-username"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Password *</Label>
                        <Input
                          type="password"
                          value={bankForm.password}
                          onChange={(e) => setBankForm({ ...bankForm, password: e.target.value })}
                          placeholder="Password accesso"
                          className="border-slate-200"
                          data-testid="bank-password"
                          required
                        />
                      </div>

                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowBankDialog(false)}>
                          Annulla
                        </Button>
                        <Button
                          type="submit"
                          disabled={savingBank}
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                        >
                          {savingBank ? "Salvataggio..." : "Salva Credenziale"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {bankCredentials.length > 0 ? (
                  <div className="space-y-3">
                    {bankCredentials.map((cred) => (
                      <div key={cred.id} className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-amber-600" />
                            <span className="font-semibold text-slate-900">{cred.bank_name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBankCredential(cred.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Username:</span>
                            <span className="ml-2 font-medium text-slate-700">{cred.username}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Password:</span>
                            <span className="font-medium text-slate-700">
                              {showBankPassword[cred.id] ? cred.password : "••••••••"}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowBankPassword({...showBankPassword, [cred.id]: !showBankPassword[cred.id]})}
                              className="p-1 h-auto"
                            >
                              {showBankPassword[cred.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Key className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Nessuna credenziale bancaria registrata</p>
                    <p className="text-sm">Clicca "Aggiungi" per inserire le chiavi consultive</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="bg-white border border-red-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Zona Pericolosa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-slate-900">Archivia Cliente</h4>
                    <p className="text-sm text-slate-600">Il cliente verrà disattivato ma i dati saranno mantenuti.</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteClient(false)}
                    disabled={deletingClient}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    Archivia
                  </Button>
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-red-800">Elimina Permanentemente</h4>
                    <p className="text-sm text-red-600">Tutti i dati del cliente verranno eliminati definitivamente.</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteClient(true)}
                    disabled={deletingClient}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-6">
            <EmployeeManagementAdmin 
              token={token} 
              clientId={clientId}
              isAdmin={user?.role === "commercialista"}
              isConsulente={user?.role === "consulente_lavoro"}
            />
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
    </div>
  );
};

export default ClientDetail;
