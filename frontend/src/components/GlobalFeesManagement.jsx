import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Printer,
  Euro,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Briefcase,
  Home,
  User,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit,
  Calendar,
  Receipt,
  Repeat,
  FileText,
  CreditCard,
  Calculator,
  MapPin,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Settings,
  Tag
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// ==================== ICONE DISPONIBILI ====================
const ICON_OPTIONS = [
  { value: "receipt", label: "Ricevuta", icon: Receipt },
  { value: "file-text", label: "Documento", icon: FileText },
  { value: "calendar", label: "Calendario", icon: Calendar },
  { value: "calculator", label: "Calcolatrice", icon: Calculator },
  { value: "credit-card", label: "Carta di Credito", icon: CreditCard },
  { value: "map-pin", label: "Posizione", icon: MapPin },
  { value: "briefcase", label: "Lavoro", icon: Briefcase },
  { value: "euro", label: "Euro", icon: Euro },
  { value: "tag", label: "Tag", icon: Tag },
];

const COLOR_OPTIONS = [
  { value: "bg-slate-100 text-slate-700", label: "Grigio" },
  { value: "bg-blue-100 text-blue-700", label: "Blu" },
  { value: "bg-purple-100 text-purple-700", label: "Viola" },
  { value: "bg-amber-100 text-amber-700", label: "Ambra" },
  { value: "bg-teal-100 text-teal-700", label: "Verde Acqua" },
  { value: "bg-green-100 text-green-700", label: "Verde" },
  { value: "bg-indigo-100 text-indigo-700", label: "Indaco" },
  { value: "bg-red-100 text-red-700", label: "Rosso" },
  { value: "bg-orange-100 text-orange-700", label: "Arancione" },
  { value: "bg-pink-100 text-pink-700", label: "Rosa" },
];

// Funzione per ottenere l'icona dal nome
const getIconComponent = (iconName) => {
  const iconMap = {
    "receipt": Receipt,
    "file-text": FileText,
    "calendar": Calendar,
    "calculator": Calculator,
    "credit-card": CreditCard,
    "map-pin": MapPin,
    "briefcase": Briefcase,
    "euro": Euro,
    "tag": Tag,
  };
  return iconMap[iconName] || Receipt;
};

// ==================== TIPI CLIENTE ====================
const CLIENT_TYPES = [
  { value: "all", label: "Tutte le categorie", icon: Users },
  { value: "societa", label: "Società", icon: Building2 },
  { value: "autonomo", label: "Autonomo", icon: Briefcase },
  { value: "vivienda_vacacional", label: "Vivienda Vacacional", icon: Home },
  { value: "persona_fisica", label: "Persona Fisica", icon: User },
];

// ==================== COMPONENTE PRINCIPALE ====================
const GlobalFeesManagement = ({ token }) => {
  const [activeTab, setActiveTab] = useState("clients");
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientFees, setClientFees] = useState([]);
  const [igualaFees, setIgualaFees] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientTypeFilter, setClientTypeFilter] = useState("all");
  const [exportLoading, setExportLoading] = useState(false);
  
  // Tipi di onorario dinamici
  const [feeTypes, setFeeTypes] = useState([]);
  const [feeTypesMap, setFeeTypesMap] = useState({});
  const [loadingFeeTypes, setLoadingFeeTypes] = useState(true);
  
  // Gestione tipi di onorario dialog
  const [showFeeTypeDialog, setShowFeeTypeDialog] = useState(false);
  const [editingFeeType, setEditingFeeType] = useState(null);
  const [feeTypeForm, setFeeTypeForm] = useState({
    label: "",
    requires_due_date: false,
    is_iguala: false,
    icon: "receipt",
    color: "bg-slate-100 text-slate-700"
  });
  const [savingFeeType, setSavingFeeType] = useState(false);
  const [deleteFeeTypeDialog, setDeleteFeeTypeDialog] = useState({ open: false, feeType: null });
  
  // Dialog state
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [feeForm, setFeeForm] = useState({
    description: "",
    amount: "",
    fee_type: "standard",
    due_date: "",
    status: "pending",
    notes: "",
    is_recurring: false,
    recurring_month: ""
  });
  const [savingFee, setSavingFee] = useState(false);
  
  // Export dialog
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportCategory, setExportCategory] = useState("all");
  const [exportFeeType, setExportFeeType] = useState("all");

  const headers = { Authorization: `Bearer ${token}` };

  // ==================== DATA FETCHING ====================
  useEffect(() => {
    fetchFeeTypes();
    fetchClientsWithFees();
    fetchSummary();
    fetchIgualaFees();
  }, []);

  const fetchFeeTypes = async () => {
    try {
      setLoadingFeeTypes(true);
      const response = await axios.get(`${API}/fees/fee-types`, { headers });
      setFeeTypes(response.data);
      
      // Crea una mappa per accesso rapido
      const map = {};
      response.data.forEach(ft => {
        map[ft.id] = {
          label: ft.label,
          requiresDueDate: ft.requires_due_date,
          isIguala: ft.is_iguala,
          icon: getIconComponent(ft.icon),
          color: ft.color
        };
      });
      setFeeTypesMap(map);
    } catch (error) {
      console.error("Errore caricamento tipi onorario:", error);
      toast.error("Errore nel caricamento dei tipi di onorario");
    } finally {
      setLoadingFeeTypes(false);
    }
  };

  const fetchClientsWithFees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/fees/by-client`, { headers });
      setClients(response.data);
    } catch (error) {
      // Fallback: fetch clients and fees separately
      try {
        const [clientsRes, feesRes] = await Promise.all([
          axios.get(`${API}/clients`, { headers }),
          axios.get(`${API}/fees/all`, { headers })
        ]);
        
        // Group fees by client
        const feesMap = {};
        feesRes.data.forEach(fee => {
          const cid = fee.client_id;
          if (!feesMap[cid]) feesMap[cid] = [];
          feesMap[cid].push(fee);
        });
        
        // Merge with clients
        const clientsWithFees = clientsRes.data.map(client => ({
          ...client,
          fees: feesMap[client.id] || [],
          fees_count: (feesMap[client.id] || []).length,
          total_pending: (feesMap[client.id] || [])
            .filter(f => f.status === 'pending')
            .reduce((sum, f) => sum + f.amount, 0),
          total_paid: (feesMap[client.id] || [])
            .filter(f => f.status === 'paid')
            .reduce((sum, f) => sum + f.amount, 0),
          iguala_monthly: (feesMap[client.id] || [])
            .filter(f => f.fee_type?.startsWith('iguala_') || f.is_recurring)
            .reduce((sum, f) => sum + f.amount, 0)
        }));
        
        setClients(clientsWithFees);
      } catch (err) {
        toast.error("Errore nel caricamento dei dati");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API}/fees/summary`, { headers });
      setSummary(response.data);
    } catch (error) {
      console.error("Errore caricamento riepilogo:", error);
    }
  };

  const fetchIgualaFees = async () => {
    try {
      const response = await axios.get(`${API}/fees/all`, { headers });
      const iguala = response.data.filter(f => 
        f.fee_type?.startsWith('iguala_') || f.is_recurring
      );
      setIgualaFees(iguala);
    } catch (error) {
      console.error("Errore caricamento Iguala:", error);
    }
  };

  const fetchClientFees = async (clientId) => {
    try {
      const response = await axios.get(`${API}/clients/${clientId}/fees`, { headers });
      setClientFees(response.data);
    } catch (error) {
      toast.error("Errore nel caricamento degli onorari");
    }
  };

  // ==================== EXPORT EXCEL ====================
  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams();
      if (exportCategory !== "all") params.append("category", exportCategory);
      if (exportFeeType !== "all") params.append("fee_type", exportFeeType);
      
      const response = await axios.get(`${API}/fees/export-excel?${params.toString()}`, {
        headers,
        responseType: 'blob'
      });
      
      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from header or generate
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'onorari.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        if (filenameMatch) filename = filenameMatch[1];
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("File Excel scaricato");
      setShowExportDialog(false);
    } catch (error) {
      toast.error("Errore nell'esportazione");
    } finally {
      setExportLoading(false);
    }
  };

  // ==================== HANDLERS ====================
  const handleSelectClient = async (client) => {
    setSelectedClient(client);
    await fetchClientFees(client.id);
  };

  const handleBackToList = () => {
    setSelectedClient(null);
    setClientFees([]);
  };

  const openNewFeeDialog = (feeType = "standard") => {
    setEditingFee(null);
    setFeeForm({
      description: "",
      amount: "",
      fee_type: feeType,
      due_date: "",
      status: "pending",
      notes: "",
      is_recurring: feeType.startsWith("iguala_"),
      recurring_month: ""
    });
    setShowFeeDialog(true);
  };

  const openEditFeeDialog = (fee) => {
    setEditingFee(fee);
    setFeeForm({
      description: fee.description || "",
      amount: fee.amount?.toString() || "",
      fee_type: fee.fee_type || "standard",
      due_date: fee.due_date || "",
      status: fee.status || "pending",
      notes: fee.notes || "",
      is_recurring: fee.is_recurring || false,
      recurring_month: fee.recurring_month || ""
    });
    setShowFeeDialog(true);
  };

  const handleSaveFee = async (e) => {
    e.preventDefault();
    if (!selectedClient && activeTab === "clients") {
      toast.error("Seleziona un cliente");
      return;
    }
    
    setSavingFee(true);
    try {
      const feeData = {
        ...feeForm,
        amount: parseFloat(feeForm.amount),
        // Se il tipo non richiede scadenza, la rimuoviamo
        due_date: feeTypesMap[feeForm.fee_type]?.requiresDueDate ? feeForm.due_date : null
      };

      const clientId = selectedClient?.id || feeForm.client_id;
      
      if (editingFee) {
        await axios.put(`${API}/clients/${clientId}/fees/${editingFee.id}`, feeData, { headers });
        toast.success("Onorario aggiornato");
      } else {
        await axios.post(`${API}/clients/${clientId}/fees`, feeData, { headers });
        toast.success("Onorario creato");
      }
      
      setShowFeeDialog(false);
      if (selectedClient) {
        fetchClientFees(selectedClient.id);
      }
      fetchClientsWithFees();
      fetchSummary();
      if (feeForm.fee_type.startsWith("iguala_") || feeTypesMap[feeForm.fee_type]?.isIguala) {
        fetchIgualaFees();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nel salvataggio");
    } finally {
      setSavingFee(false);
    }
  };

  const handleDeleteFee = async (fee) => {
    if (!confirm("Sei sicuro di voler eliminare questo onorario?")) return;
    
    try {
      const clientId = fee.client_id || selectedClient?.id;
      await axios.delete(`${API}/clients/${clientId}/fees/${fee.id}`, { headers });
      toast.success("Onorario eliminato");
      if (selectedClient) {
        fetchClientFees(selectedClient.id);
      }
      fetchClientsWithFees();
      fetchSummary();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleMarkAsPaid = async (fee) => {
    try {
      const clientId = fee.client_id || selectedClient?.id;
      await axios.put(`${API}/clients/${clientId}/fees/${fee.id}`, {
        ...fee,
        status: "paid",
        paid_date: new Date().toISOString().split('T')[0]
      }, { headers });
      toast.success("Onorario segnato come pagato");
      if (selectedClient) {
        fetchClientFees(selectedClient.id);
      }
      fetchClientsWithFees();
      fetchSummary();
    } catch (error) {
      toast.error("Errore nell'aggiornamento");
    }
  };

  // ==================== GESTIONE TIPI DI ONORARIO ====================
  const openCreateFeeTypeDialog = () => {
    setEditingFeeType(null);
    setFeeTypeForm({
      label: "",
      requires_due_date: false,
      is_iguala: false,
      icon: "receipt",
      color: "bg-slate-100 text-slate-700"
    });
    setShowFeeTypeDialog(true);
  };

  const openEditFeeTypeDialog = (feeType) => {
    setEditingFeeType(feeType);
    setFeeTypeForm({
      label: feeType.label || "",
      requires_due_date: feeType.requires_due_date || false,
      is_iguala: feeType.is_iguala || false,
      icon: feeType.icon || "receipt",
      color: feeType.color || "bg-slate-100 text-slate-700"
    });
    setShowFeeTypeDialog(true);
  };

  const handleSaveFeeType = async (e) => {
    e.preventDefault();
    if (!feeTypeForm.label.trim()) {
      toast.error("Inserisci un nome per il tipo di onorario");
      return;
    }

    setSavingFeeType(true);
    try {
      if (editingFeeType) {
        await axios.put(`${API}/fees/fee-types/${editingFeeType.id}`, feeTypeForm, { headers });
        toast.success("Tipo di onorario aggiornato");
      } else {
        await axios.post(`${API}/fees/fee-types`, feeTypeForm, { headers });
        toast.success("Tipo di onorario creato");
      }
      
      setShowFeeTypeDialog(false);
      fetchFeeTypes();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nel salvataggio");
    } finally {
      setSavingFeeType(false);
    }
  };

  const handleDeleteFeeType = async () => {
    if (!deleteFeeTypeDialog.feeType) return;
    
    try {
      await axios.delete(`${API}/fees/fee-types/${deleteFeeTypeDialog.feeType.id}`, { headers });
      toast.success("Tipo di onorario eliminato");
      setDeleteFeeTypeDialog({ open: false, feeType: null });
      fetchFeeTypes();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'eliminazione");
    }
  };

  // ==================== FILTERING ====================
  const filteredClients = clients.filter(client => {
    const matchesSearch = !searchTerm || 
      client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = clientTypeFilter === "all" || client.tipo_cliente === clientTypeFilter;
    return matchesSearch && matchesType;
  });

  // Group Iguala fees by type
  const groupedIguala = {
    buste_paga: igualaFees.filter(f => f.fee_type === 'iguala_buste_paga'),
    contabilita: igualaFees.filter(f => f.fee_type === 'iguala_contabilita'),
    domicilio: igualaFees.filter(f => f.fee_type === 'iguala_domicilio'),
    other: igualaFees.filter(f => !f.fee_type?.startsWith('iguala_') && f.is_recurring)
  };

  // Calcola totali Iguala per cliente
  const clientsWithIguala = clients.filter(c => c.iguala_monthly > 0);
  const totalIgualaMonthly = clientsWithIguala.reduce((sum, c) => sum + (c.iguala_monthly || 0), 0);

  const getClientTypeIcon = (type) => {
    const TypeIcon = CLIENT_TYPES.find(t => t.value === type)?.icon || User;
    return <TypeIcon className="h-4 w-4" />;
  };

  const getClientTypeLabel = (type) => {
    return CLIENT_TYPES.find(t => t.value === type)?.label || type || "N/A";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Pagato</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Scaduto</Badge>;
      default:
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">In Attesa</Badge>;
    }
  };

  const getFeeTypeBadge = (feeType) => {
    const type = feeTypesMap[feeType] || { label: feeType, color: "bg-slate-100 text-slate-700", icon: Receipt };
    const IconComponent = type.icon || Receipt;
    return (
      <Badge className={`${type.color} border-0`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {type.label}
      </Badge>
    );
  };

  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          onClick={() => setShowExportDialog(true)}
          className="border-green-200 text-green-700 hover:bg-green-50"
          data-testid="export-excel-btn"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Esporta Excel
        </Button>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger 
            value="clients" 
            className="data-[state=active]:bg-white data-[state=active]:text-teal-600"
            data-testid="tab-fees-clients"
          >
            <Users className="h-4 w-4 mr-2" />
            Per Cliente
          </TabsTrigger>
          <TabsTrigger 
            value="iguala" 
            className="data-[state=active]:bg-white data-[state=active]:text-teal-600"
            data-testid="tab-fees-iguala"
          >
            <Repeat className="h-4 w-4 mr-2" />
            Iguala (Mensili)
          </TabsTrigger>
          <TabsTrigger 
            value="types" 
            className="data-[state=active]:bg-white data-[state=active]:text-purple-600"
            data-testid="tab-fees-types"
          >
            <Settings className="h-4 w-4 mr-2" />
            Gestione Tipi
          </TabsTrigger>
        </TabsList>

        {/* TAB: Per Cliente */}
        <TabsContent value="clients" className="space-y-4">
          {selectedClient ? (
            // Vista dettaglio cliente
            <ClientFeesDetail 
              client={selectedClient}
              fees={clientFees}
              onBack={handleBackToList}
              onAddFee={() => openNewFeeDialog()}
              onEditFee={openEditFeeDialog}
              onDeleteFee={handleDeleteFee}
              onMarkPaid={handleMarkAsPaid}
              getStatusBadge={getStatusBadge}
              getFeeTypeBadge={getFeeTypeBadge}
            />
          ) : (
            // Lista clienti
            <Card className="bg-white border border-slate-200">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-teal-500" />
                    Onorari per Cliente
                  </CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Cerca cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 border-slate-200"
                        data-testid="search-clients-fees"
                      />
                    </div>
                    <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
                      <SelectTrigger className="w-48 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLIENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { fetchClientsWithFees(); fetchSummary(); }}
                      className="border-slate-200"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessun cliente trovato</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredClients.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 cursor-pointer transition-all group"
                        data-testid={`client-fee-row-${client.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-teal-100 transition-colors">
                            {getClientTypeIcon(client.tipo_cliente)}
                          </div>
                          <div>
                            <h4 className="font-medium text-slate-800">{client.full_name}</h4>
                            <p className="text-sm text-slate-500">{client.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-slate-500">Onorari</p>
                            <p className="font-semibold text-slate-700">{client.fees_count || 0}</p>
                          </div>
                          {(client.total_pending > 0) && (
                            <div className="text-right">
                              <p className="text-sm text-slate-500">Da incassare</p>
                              <p className="font-semibold text-amber-600">
                                €{client.total_pending?.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          )}
                          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-teal-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: Iguala (Onorari Mensili) */}
        <TabsContent value="iguala" className="space-y-4">
          <IgualaSection 
            groupedIguala={groupedIguala}
            clients={clients}
            clientsWithIguala={clientsWithIguala}
            totalIgualaMonthly={totalIgualaMonthly}
            onAddFee={openNewFeeDialog}
            onEditFee={openEditFeeDialog}
            onDeleteFee={handleDeleteFee}
            onMarkPaid={handleMarkAsPaid}
            getStatusBadge={getStatusBadge}
            getClientTypeLabel={getClientTypeLabel}
            getClientTypeIcon={getClientTypeIcon}
            onExport={() => {
              setExportFeeType("iguala");
              setShowExportDialog(true);
            }}
          />
        </TabsContent>

        {/* TAB: Gestione Tipi */}
        <TabsContent value="types" className="space-y-4">
          <Card className="bg-white border border-slate-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-500" />
                  Gestione Tipi di Onorario
                </CardTitle>
                <Button 
                  onClick={openCreateFeeTypeDialog}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                  data-testid="add-fee-type-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Tipo
                </Button>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Gestisci i tipi di onorario disponibili. I tipi marcati come "Iguala" appariranno nella sezione mensile.
              </p>
            </CardHeader>
            <CardContent>
              {loadingFeeTypes ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : feeTypes.length === 0 ? (
                <div className="text-center py-12">
                  <Tag className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessun tipo di onorario configurato</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feeTypes.map((feeType) => {
                    const IconComponent = getIconComponent(feeType.icon);
                    return (
                      <div
                        key={feeType.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                        data-testid={`fee-type-row-${feeType.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${feeType.color}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{feeType.label}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              {feeType.is_iguala && (
                                <Badge className="bg-teal-100 text-teal-700 text-xs">Iguala</Badge>
                              )}
                              {feeType.requires_due_date && (
                                <Badge className="bg-amber-100 text-amber-700 text-xs">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Richiede Scadenza
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditFeeTypeDialog(feeType)}
                            className="border-slate-200"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Modifica
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteFeeTypeDialog({ open: true, feeType })}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Gestione Tipo Onorario */}
      <Dialog open={showFeeTypeDialog} onOpenChange={setShowFeeTypeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-purple-500" />
              {editingFeeType ? "Modifica Tipo Onorario" : "Nuovo Tipo Onorario"}
            </DialogTitle>
            <DialogDescription>
              Configura le proprietà del tipo di onorario
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveFeeType} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={feeTypeForm.label}
                onChange={(e) => setFeeTypeForm({ ...feeTypeForm, label: e.target.value })}
                placeholder="Es: Consulenza Fiscale"
                required
                className="border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icona</Label>
                <Select 
                  value={feeTypeForm.icon} 
                  onValueChange={(value) => setFeeTypeForm({ ...feeTypeForm, icon: value })}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.icon className="h-4 w-4" />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Colore</Label>
                <Select 
                  value={feeTypeForm.color} 
                  onValueChange={(value) => setFeeTypeForm({ ...feeTypeForm, color: value })}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${opt.value}`}></div>
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires_due_date"
                  checked={feeTypeForm.requires_due_date}
                  onCheckedChange={(checked) => setFeeTypeForm({ ...feeTypeForm, requires_due_date: checked })}
                />
                <Label htmlFor="requires_due_date" className="cursor-pointer">
                  Richiede data di scadenza
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_iguala"
                  checked={feeTypeForm.is_iguala}
                  onCheckedChange={(checked) => setFeeTypeForm({ ...feeTypeForm, is_iguala: checked })}
                />
                <Label htmlFor="is_iguala" className="cursor-pointer">
                  È un tipo Iguala (mensile/ricorrente)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFeeTypeDialog(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={savingFeeType} className="bg-purple-500 hover:bg-purple-600">
                {savingFeeType ? "Salvataggio..." : editingFeeType ? "Aggiorna" : "Crea"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Conferma Eliminazione Tipo */}
      <AlertDialog open={deleteFeeTypeDialog.open} onOpenChange={(open) => setDeleteFeeTypeDialog({ ...deleteFeeTypeDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Tipo di Onorario</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il tipo "<strong>{deleteFeeTypeDialog.feeType?.label}</strong>"?
              <br /><br />
              Questa azione non può essere annullata. Non sarà possibile eliminare il tipo se ci sono onorari associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFeeType} className="bg-red-600 hover:bg-red-700">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fee Dialog */}
      <Dialog open={showFeeDialog} onOpenChange={setShowFeeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-teal-500" />
              {editingFee ? "Modifica Onorario" : "Nuovo Onorario"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveFee} className="space-y-4">
            {/* Tipo Onorario */}
            <div className="space-y-2">
              <Label>Tipo Onorario</Label>
              <Select 
                value={feeForm.fee_type} 
                onValueChange={(value) => setFeeForm({
                  ...feeForm, 
                  fee_type: value,
                  is_recurring: value.startsWith('iguala_')
                })}
              >
                <SelectTrigger className="border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {feeTypes.map((ft) => (
                    <SelectItem key={ft.id} value={ft.id}>{ft.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrizione */}
            <div className="space-y-2">
              <Label>Descrizione *</Label>
              <Input
                value={feeForm.description}
                onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })}
                placeholder="Es: Consulenza fiscale Gennaio 2026"
                required
                className="border-slate-200"
              />
            </div>

            {/* Importo */}
            <div className="space-y-2">
              <Label>Importo (€) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={feeForm.amount}
                onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                placeholder="0.00"
                required
                className="border-slate-200"
              />
            </div>

            {/* Scadenza - Solo se richiesta */}
            {feeTypesMap[feeForm.fee_type]?.requiresDueDate && (
              <div className="space-y-2">
                <Label>Data Scadenza *</Label>
                <Input
                  type="date"
                  value={feeForm.due_date}
                  onChange={(e) => setFeeForm({ ...feeForm, due_date: e.target.value })}
                  required
                  className="border-slate-200"
                />
                <p className="text-xs text-slate-500">
                  Questo tipo di onorario richiede una data di scadenza
                </p>
              </div>
            )}

            {/* Mese di riferimento per Iguala */}
            {(feeForm.fee_type.startsWith('iguala_') || feeTypesMap[feeForm.fee_type]?.isIguala) && (
              <div className="space-y-2">
                <Label>Mese di Riferimento</Label>
                <Input
                  type="month"
                  value={feeForm.recurring_month}
                  onChange={(e) => setFeeForm({ ...feeForm, recurring_month: e.target.value })}
                  className="border-slate-200"
                />
              </div>
            )}

            {/* Stato */}
            <div className="space-y-2">
              <Label>Stato</Label>
              <Select 
                value={feeForm.status} 
                onValueChange={(value) => setFeeForm({ ...feeForm, status: value })}
              >
                <SelectTrigger className="border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">In Attesa</SelectItem>
                  <SelectItem value="paid">Pagato</SelectItem>
                  <SelectItem value="overdue">Scaduto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label>Note (opzionale)</Label>
              <Textarea
                value={feeForm.notes}
                onChange={(e) => setFeeForm({ ...feeForm, notes: e.target.value })}
                placeholder="Note aggiuntive..."
                className="border-slate-200"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFeeDialog(false)}>
                Annulla
              </Button>
              <Button 
                type="submit" 
                disabled={savingFee}
                className="bg-teal-500 hover:bg-teal-600 text-white"
              >
                {savingFee ? "Salvataggio..." : (editingFee ? "Aggiorna" : "Crea")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              Esporta Onorari in Excel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Filtra per Categoria Cliente</Label>
              <Select value={exportCategory} onValueChange={setExportCategory}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  <SelectItem value="societa">Solo Società</SelectItem>
                  <SelectItem value="autonomo">Solo Autonomi</SelectItem>
                  <SelectItem value="vivienda_vacacional">Solo Vivienda Vacacional</SelectItem>
                  <SelectItem value="persona_fisica">Solo Persona Fisica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Filtra per Tipo Onorario</Label>
              <Select value={exportFeeType} onValueChange={setExportFeeType}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="iguala">Solo Iguala (Mensili)</SelectItem>
                  <SelectItem value="standard">Solo Standard</SelectItem>
                  <SelectItem value="consulenza">Solo Consulenza</SelectItem>
                  <SelectItem value="pratica">Solo Pratica/Procedura</SelectItem>
                  <SelectItem value="dichiarazione">Solo Dichiarazione Fiscale</SelectItem>
                  <SelectItem value="iguala_buste_paga">Solo Iguala Buste Paga</SelectItem>
                  <SelectItem value="iguala_contabilita">Solo Iguala Contabilità</SelectItem>
                  <SelectItem value="iguala_domicilio">Solo Iguala Domicilio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              <p className="font-medium mb-1">Il file Excel conterrà:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Cliente, Email, Tipo Cliente</li>
                <li>Descrizione, Tipo e Importo Onorario</li>
                <li>Stato, Scadenza, Mese di riferimento</li>
                <li>Totale in fondo al file</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleExportExcel}
              disabled={exportLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {exportLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Esportazione...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Scarica Excel
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ==================== COMPONENTE: Dettaglio Cliente ====================
const ClientFeesDetail = ({ 
  client, 
  fees, 
  onBack, 
  onAddFee, 
  onEditFee, 
  onDeleteFee, 
  onMarkPaid,
  getStatusBadge,
  getFeeTypeBadge
}) => {
  const totalPending = fees.filter(f => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);
  const totalPaid = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
  const igualaTotal = fees.filter(f => f.fee_type?.startsWith('iguala_') || f.is_recurring).reduce((sum, f) => sum + f.amount, 0);

  return (
    <Card className="bg-white border border-slate-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Indietro
            </Button>
            <div>
              <CardTitle className="text-xl">{client.full_name}</CardTitle>
              <p className="text-sm text-slate-500">{client.email}</p>
            </div>
          </div>
          <Button onClick={onAddFee} className="bg-teal-500 hover:bg-teal-600 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Onorario
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Mini Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-sm text-slate-500">Totale Onorari</p>
            <p className="text-xl font-bold text-slate-800">{fees.length}</p>
          </div>
          <div className="p-4 bg-amber-50 rounded-lg text-center">
            <p className="text-sm text-amber-600">In Attesa</p>
            <p className="text-xl font-bold text-amber-600">
              €{totalPending.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <p className="text-sm text-green-600">Pagati</p>
            <p className="text-xl font-bold text-green-600">
              €{totalPaid.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-4 bg-teal-50 rounded-lg text-center">
            <p className="text-sm text-teal-600">Iguala Mensile</p>
            <p className="text-xl font-bold text-teal-600">
              €{igualaTotal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Fees List */}
        {fees.length === 0 ? (
          <div className="text-center py-12">
            <Euro className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nessun onorario per questo cliente</p>
            <Button onClick={onAddFee} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi il primo onorario
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Descrizione</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Importo</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-center">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((fee) => (
                <TableRow key={fee.id} className="hover:bg-slate-50">
                  <TableCell>
                    <p className="font-medium">{fee.description}</p>
                    {fee.notes && <p className="text-xs text-slate-400">{fee.notes}</p>}
                    {fee.recurring_month && (
                      <p className="text-xs text-teal-600 flex items-center gap-1 mt-1">
                        <Repeat className="h-3 w-3" />
                        Mese: {fee.recurring_month}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{getFeeTypeBadge(fee.fee_type)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    €{fee.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {fee.due_date ? (
                      <span className="text-slate-600">
                        {new Date(fee.due_date).toLocaleDateString('it-IT')}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(fee.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {fee.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMarkPaid(fee)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          title="Segna come pagato"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditFee(fee)}
                        className="text-slate-500 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteFee(fee)}
                        className="text-slate-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== COMPONENTE: Sezione Iguala ====================
const IgualaSection = ({ 
  groupedIguala, 
  clients, 
  clientsWithIguala,
  totalIgualaMonthly,
  onAddFee, 
  onEditFee, 
  onDeleteFee, 
  onMarkPaid,
  getStatusBadge,
  getClientTypeLabel,
  getClientTypeIcon,
  onExport
}) => {
  const [viewMode, setViewMode] = useState("categories"); // categories | clients
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const igualaCategories = [
    { 
      key: 'buste_paga', 
      label: 'Buste Paga', 
      icon: CreditCard, 
      bgColor: 'bg-teal-100',
      textColor: 'text-teal-600',
      feeType: 'iguala_buste_paga',
      description: 'Onorari mensili per elaborazione buste paga'
    },
    { 
      key: 'contabilita', 
      label: 'Contabilità Società', 
      icon: Calculator,
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      feeType: 'iguala_contabilita',
      description: 'Onorari mensili per gestione contabilità'
    },
    { 
      key: 'domicilio', 
      label: 'Domicilio Sociale', 
      icon: MapPin, 
      bgColor: 'bg-indigo-100',
      textColor: 'text-indigo-600',
      feeType: 'iguala_domicilio',
      description: 'Onorari mensili per servizio domiciliazione'
    }
  ];

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client?.full_name || 'N/A';
  };

  // Filtra clienti con Iguala
  const filteredClientsWithIguala = clientsWithIguala.filter(client => {
    const matchesSearch = !searchTerm || 
      client.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || client.tipo_cliente === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Repeat className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Iguala - Onorari Mensili</h2>
                <p className="text-teal-100">Gestione onorari ricorrenti mensili</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-teal-100 text-sm">Totale Mensile</p>
                <p className="text-3xl font-bold">
                  €{totalIgualaMonthly.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-teal-100 text-xs">{clientsWithIguala.length} clienti</p>
              </div>
              <Button 
                variant="secondary"
                onClick={onExport}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <Download className="h-4 w-4 mr-2" />
                Esporta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "categories" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("categories")}
            className={viewMode === "categories" ? "bg-teal-500 hover:bg-teal-600" : ""}
          >
            Per Categoria
          </Button>
          <Button
            variant={viewMode === "clients" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("clients")}
            className={viewMode === "clients" ? "bg-teal-500 hover:bg-teal-600" : ""}
          >
            Lista Clienti
          </Button>
        </div>
        
        {viewMode === "clients" && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cerca cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64 border-slate-200"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 border-slate-200">
                <SelectValue placeholder="Filtra categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le categorie</SelectItem>
                <SelectItem value="societa">Società</SelectItem>
                <SelectItem value="autonomo">Autonomo</SelectItem>
                <SelectItem value="vivienda_vacacional">Vivienda Vacacional</SelectItem>
                <SelectItem value="persona_fisica">Persona Fisica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {viewMode === "categories" ? (
        // Vista per Categorie (originale)
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {igualaCategories.map((category) => {
            const fees = groupedIguala[category.key] || [];
            const totalAmount = fees.reduce((sum, f) => sum + f.amount, 0);
            const CategoryIcon = category.icon;
            
            return (
              <Card key={category.key} className="bg-white border border-slate-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 ${category.bgColor} rounded-lg`}>
                        <CategoryIcon className={`h-5 w-5 ${category.textColor}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{category.label}</h3>
                        <p className="text-xs text-slate-500">{fees.length} clienti</p>
                      </div>
                    </div>
                    <span className={`font-bold ${category.textColor}`}>
                      €{totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {fees.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">
                        Nessun onorario in questa categoria
                      </p>
                    ) : (
                      fees.map((fee) => (
                        <div 
                          key={fee.id}
                          className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">{getClientName(fee.client_id)}</p>
                            <p className="text-xs text-slate-500 truncate">{fee.description}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-semibold">
                              €{fee.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </span>
                            <div className="flex gap-1">
                              {fee.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onMarkPaid(fee)}
                                  className="h-6 w-6 p-0 text-green-600"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEditFee(fee)}
                                className="h-6 w-6 p-0 text-slate-500"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        // Vista Lista Clienti
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Cliente</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Buste Paga</TableHead>
                  <TableHead className="text-center">Contabilità</TableHead>
                  <TableHead className="text-center">Domicilio</TableHead>
                  <TableHead className="text-right">Totale Mensile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientsWithIguala.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                      Nessun cliente con Iguala trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClientsWithIguala.map((client) => {
                    // Calcola importi per categoria
                    const clientFees = client.fees || [];
                    const bustePaga = clientFees.filter(f => f.fee_type === 'iguala_buste_paga').reduce((s, f) => s + f.amount, 0);
                    const contabilita = clientFees.filter(f => f.fee_type === 'iguala_contabilita').reduce((s, f) => s + f.amount, 0);
                    const domicilio = clientFees.filter(f => f.fee_type === 'iguala_domicilio').reduce((s, f) => s + f.amount, 0);
                    
                    return (
                      <TableRow key={client.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg">
                              {getClientTypeIcon(client.tipo_cliente)}
                            </div>
                            <div>
                              <p className="font-medium">{client.full_name}</p>
                              <p className="text-xs text-slate-500">{client.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {getClientTypeLabel(client.tipo_cliente)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {bustePaga > 0 ? (
                            <span className="font-semibold text-teal-600">
                              €{bustePaga.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {contabilita > 0 ? (
                            <span className="font-semibold text-green-600">
                              €{contabilita.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {domicilio > 0 ? (
                            <span className="font-semibold text-indigo-600">
                              €{domicilio.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-slate-800">
                            €{(client.iguala_monthly || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            
            {/* Totale Footer */}
            {filteredClientsWithIguala.length > 0 && (
              <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-between items-center">
                <span className="font-semibold text-slate-700">
                  Totale {filteredClientsWithIguala.length} clienti
                </span>
                <span className="text-xl font-bold text-teal-600">
                  €{filteredClientsWithIguala.reduce((s, c) => s + (c.iguala_monthly || 0), 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GlobalFeesManagement;
