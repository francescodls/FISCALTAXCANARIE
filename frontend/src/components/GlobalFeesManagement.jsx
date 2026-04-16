import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from '@/components/ui/sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
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
  Settings,
  Tag,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Filter,
  X
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// ==================== COSTANTI ====================
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

const TAX_TYPES = [
  { value: "ESENTE", label: "Esente IVA (0%)", rate: 0 },
  { value: "IGIC_7", label: "IGIC 7%", rate: 0.07 },
  { value: "IVA_21", label: "IVA 21%", rate: 0.21 },
  { value: "IVA_22", label: "IVA 22%", rate: 0.22 },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Da pagare", color: "bg-amber-100 text-amber-700" },
  { value: "paid", label: "Pagato", color: "bg-green-100 text-green-700" },
  { value: "recurring", label: "Ricorrente", color: "bg-blue-100 text-blue-700" },
  { value: "overdue", label: "Scaduto", color: "bg-red-100 text-red-700" },
];

const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

// Helper functions
const getIconComponent = (iconName) => {
  const iconMap = {
    "receipt": Receipt, "file-text": FileText, "calendar": Calendar,
    "calculator": Calculator, "credit-card": CreditCard, "map-pin": MapPin,
    "briefcase": Briefcase, "euro": Euro, "tag": Tag, "building": Building2,
    "user": User, "home": Home, "users": Users
  };
  return iconMap[iconName] || Receipt;
};

const getCategoryColor = (color) => {
  const colorMap = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
    teal: { bg: "bg-teal-50", text: "text-teal-600", border: "border-teal-200" },
    slate: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
    green: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
    red: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" },
  };
  return colorMap[color] || colorMap.slate;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
};

// ==================== COMPONENTE PRINCIPALE ====================
const GlobalFeesManagement = ({ token }) => {
  const [activeTab, setActiveTab] = useState("categories");
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [categoryStats, setCategoryStats] = useState([]);
  const [clients, setClients] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [summary, setSummary] = useState({});
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Dialog states
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryClients, setCategoryClients] = useState([]);
  const [loadingCategoryClients, setLoadingCategoryClients] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientFees, setClientFees] = useState([]);
  
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [feeForm, setFeeForm] = useState({
    description: "", amount: "", fee_type: "standard", status: "pending",
    tax_type: "ESENTE", due_date: "", notes: "", is_recurring: false,
    recurring_frequency: "monthly", reference_month: new Date().getMonth() + 1,
    reference_year: new Date().getFullYear()
  });
  const [savingFee, setSavingFee] = useState(false);
  
  const [showFeeTypeDialog, setShowFeeTypeDialog] = useState(false);
  const [feeTypeForm, setFeeTypeForm] = useState({
    label: "", requires_due_date: false, is_iguala: false,
    icon: "receipt", color: "bg-slate-100 text-slate-700"
  });
  
  const [deleteFeeDialog, setDeleteFeeDialog] = useState({ open: false, fee: null });

  const headers = { Authorization: `Bearer ${token}` };

  // ==================== DATA FETCHING ====================
  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === "statistics") {
      fetchMonthlyStats();
    }
  }, [activeTab, yearFilter, categoryFilter]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCategoryStats(),
        fetchClients(),
        fetchFeeTypes(),
        fetchSummary()
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryStats = async () => {
    try {
      const res = await axios.get(`${API}/fees/by-category`, { headers });
      setCategoryStats(res.data);
    } catch (error) {
      console.error("Error fetching category stats:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API}/fees/by-client`, { headers });
      setClients(res.data);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchFeeTypes = async () => {
    try {
      const res = await axios.get(`${API}/fees/fee-types`, { headers });
      setFeeTypes(res.data);
    } catch (error) {
      console.error("Error fetching fee types:", error);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await axios.get(`${API}/fees/summary`, { headers });
      setSummary(res.data);
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  const fetchMonthlyStats = async () => {
    try {
      const params = new URLSearchParams({ year: yearFilter });
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      const res = await axios.get(`${API}/fees/monthly-stats?${params}`, { headers });
      setMonthlyStats(res.data);
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
    }
  };

  const fetchCategoryClients = async (categoryId) => {
    setLoadingCategoryClients(true);
    try {
      const res = await axios.get(`${API}/fees/category/${categoryId}/clients`, { headers });
      setCategoryClients(res.data);
    } catch (error) {
      toast.error("Errore nel caricamento dei clienti");
    } finally {
      setLoadingCategoryClients(false);
    }
  };

  const fetchClientFees = async (clientId) => {
    try {
      const res = await axios.get(`${API}/clients/${clientId}/fees`, { headers });
      setClientFees(res.data);
    } catch (error) {
      toast.error("Errore nel caricamento degli onorari");
    }
  };

  // ==================== HANDLERS ====================
  const openCategoryDetail = (category) => {
    setSelectedCategory(category);
    fetchCategoryClients(category.id);
  };

  const openClientDetail = (client) => {
    setSelectedClient(client);
    fetchClientFees(client.id);
  };

  const openNewFeeDialog = (clientId = null) => {
    setEditingFee(null);
    setFeeForm({
      description: "", amount: "", fee_type: "standard", status: "pending",
      tax_type: "ESENTE", due_date: "", notes: "", is_recurring: false,
      recurring_frequency: "monthly", reference_month: new Date().getMonth() + 1,
      reference_year: new Date().getFullYear()
    });
    setShowFeeDialog(true);
  };

  const openEditFeeDialog = (fee) => {
    setEditingFee(fee);
    setFeeForm({
      description: fee.description || "",
      amount: fee.net_amount || fee.amount || "",
      fee_type: fee.fee_type || "standard",
      status: fee.status || "pending",
      tax_type: fee.tax_type || "ESENTE",
      due_date: fee.due_date || "",
      notes: fee.notes || "",
      is_recurring: fee.is_recurring || fee.status === "recurring",
      recurring_frequency: fee.recurring_frequency || "monthly",
      reference_month: fee.reference_month || new Date().getMonth() + 1,
      reference_year: fee.reference_year || new Date().getFullYear()
    });
    setShowFeeDialog(true);
  };

  const calculateTaxAmounts = (netAmount, taxType) => {
    const tax = TAX_TYPES.find(t => t.value === taxType);
    const rate = tax?.rate || 0;
    const net = parseFloat(netAmount) || 0;
    const taxAmount = Math.round(net * rate * 100) / 100;
    const gross = Math.round((net + taxAmount) * 100) / 100;
    return { net_amount: net, tax_amount: taxAmount, gross_amount: gross };
  };

  const handleSaveFee = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    
    setSavingFee(true);
    try {
      const taxAmounts = calculateTaxAmounts(feeForm.amount, feeForm.tax_type);
      const payload = {
        ...feeForm,
        amount: parseFloat(feeForm.amount),
        ...taxAmounts,
        status: feeForm.is_recurring ? "recurring" : feeForm.status
      };

      if (editingFee) {
        await axios.put(`${API}/clients/${selectedClient.id}/fees/${editingFee.id}`, payload, { headers });
        toast.success("Onorario aggiornato");
      } else {
        await axios.post(`${API}/clients/${selectedClient.id}/fees`, payload, { headers });
        toast.success("Onorario creato");
      }
      
      setShowFeeDialog(false);
      fetchClientFees(selectedClient.id);
      fetchAllData();
    } catch (error) {
      toast.error("Errore nel salvataggio");
    } finally {
      setSavingFee(false);
    }
  };

  const handleDeleteFee = async () => {
    if (!deleteFeeDialog.fee || !selectedClient) return;
    try {
      await axios.delete(`${API}/clients/${selectedClient.id}/fees/${deleteFeeDialog.fee.id}`, { headers });
      toast.success("Onorario eliminato");
      setDeleteFeeDialog({ open: false, fee: null });
      fetchClientFees(selectedClient.id);
      fetchAllData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleMarkAsPaid = async (fee) => {
    try {
      await axios.put(`${API}/clients/${fee.client_id}/fees/${fee.id}`, { status: "paid" }, { headers });
      toast.success("Segnato come pagato");
      if (selectedClient) fetchClientFees(selectedClient.id);
      fetchAllData();
    } catch (error) {
      toast.error("Errore");
    }
  };

  const getStatusBadge = (status) => {
    const s = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  // Filter clients
  const filteredClients = clients.filter(client => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!client.full_name?.toLowerCase().includes(search) && 
          !client.email?.toLowerCase().includes(search)) {
        return false;
      }
    }
    if (categoryFilter !== "all" && client.tipo_cliente !== categoryFilter) {
      return false;
    }
    return true;
  });

  // ==================== RENDER ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-teal-50 to-white border-teal-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <Euro className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Totale Incassato</p>
                <p className="text-lg font-bold text-teal-700">{formatCurrency(summary.total_paid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Da Incassare</p>
                <p className="text-lg font-bold text-amber-700">{formatCurrency(summary.total_pending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-white border-red-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Scaduti</p>
                <p className="text-lg font-bold text-red-700">{formatCurrency(summary.total_overdue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Clienti Attivi</p>
                <p className="text-lg font-bold text-blue-700">{summary.clients_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="categories" className="data-[state=active]:bg-white">
            <Building2 className="h-4 w-4 mr-2" />
            Per Categoria
          </TabsTrigger>
          <TabsTrigger value="clients" className="data-[state=active]:bg-white">
            <Users className="h-4 w-4 mr-2" />
            Per Cliente
          </TabsTrigger>
          <TabsTrigger value="statistics" className="data-[state=active]:bg-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Statistiche
          </TabsTrigger>
          <TabsTrigger value="types" className="data-[state=active]:bg-white">
            <Settings className="h-4 w-4 mr-2" />
            Tipi Onorario
          </TabsTrigger>
        </TabsList>

        {/* TAB: Per Categoria */}
        <TabsContent value="categories" className="space-y-4">
          <Card className="bg-white border border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-500" />
                Onorari per Categoria Cliente
              </CardTitle>
              <p className="text-sm text-slate-500">
                Clicca su una categoria per vedere il dettaglio dei clienti
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryStats.map((cat) => {
                  const colors = getCategoryColor(cat.color);
                  const Icon = getIconComponent(cat.icon);
                  return (
                    <div
                      key={cat.id}
                      onClick={() => openCategoryDetail(cat)}
                      className={`p-5 ${colors.bg} rounded-xl border-2 ${colors.border} cursor-pointer 
                        hover:shadow-lg transition-all hover:scale-[1.02] group`}
                      data-testid={`category-card-${cat.id}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm`}>
                            <Icon className={`h-6 w-6 ${colors.text}`} />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${colors.text} text-lg`}>{cat.name}</h3>
                            <p className="text-xs text-slate-500">{cat.clients_count} clienti</p>
                          </div>
                        </div>
                        <ChevronRight className={`h-5 w-5 ${colors.text} opacity-50 group-hover:opacity-100 
                          group-hover:translate-x-1 transition-all`} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/50">
                        <div>
                          <p className="text-xs text-slate-500">Totale</p>
                          <p className={`font-bold ${colors.text}`}>{formatCurrency(cat.total_gross)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Da incassare</p>
                          <p className="font-semibold text-amber-600">{formatCurrency(cat.total_pending)}</p>
                        </div>
                      </div>
                      
                      {cat.total_recurring > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/50">
                          <div className="flex items-center gap-2">
                            <Repeat className="h-4 w-4 text-blue-500" />
                            <span className="text-xs text-slate-500">Ricorrenti:</span>
                            <span className="text-sm font-semibold text-blue-600">
                              {formatCurrency(cat.total_recurring)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Per Cliente */}
        <TabsContent value="clients" className="space-y-4">
          <Card className="bg-white border border-slate-200">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-500" />
                  Onorari per Cliente
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Cerca cliente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64 border-slate-200"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48 border-slate-200">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le categorie</SelectItem>
                      {categoryStats.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredClients.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessun cliente trovato</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => openClientDetail(client)}
                      className="flex items-center justify-between p-4 rounded-lg border border-slate-100 
                        hover:bg-slate-50 hover:border-slate-200 cursor-pointer transition-all group"
                      data-testid={`client-row-${client.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-800">{client.full_name}</h4>
                          <p className="text-sm text-slate-500">{client.email}</p>
                        </div>
                        <Badge className="bg-slate-100 text-slate-600 text-xs">
                          {categoryStats.find(c => c.id === client.tipo_cliente)?.name || client.tipo_cliente}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Onorari</p>
                          <p className="font-semibold text-slate-700">{client.fees_count || 0}</p>
                        </div>
                        {client.total_pending > 0 && (
                          <div className="text-right">
                            <p className="text-xs text-slate-500">Da incassare</p>
                            <p className="font-semibold text-amber-600">{formatCurrency(client.total_pending)}</p>
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
        </TabsContent>

        {/* TAB: Statistiche */}
        <TabsContent value="statistics" className="space-y-4">
          <Card className="bg-white border border-slate-200">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-500" />
                  Andamento Mensile {yearFilter}
                </CardTitle>
                <div className="flex items-center gap-3">
                  <Select value={yearFilter.toString()} onValueChange={(v) => setYearFilter(parseInt(v))}>
                    <SelectTrigger className="w-32 border-slate-200">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48 border-slate-200">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte le categorie</SelectItem>
                      {categoryStats.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {monthlyStats && (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100">
                      <p className="text-xs text-slate-500">Totale Anno</p>
                      <p className="text-xl font-bold text-indigo-700">
                        {formatCurrency(monthlyStats.totals?.total_gross)}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-50 to-white rounded-xl border border-green-100">
                      <p className="text-xs text-slate-500">Incassato</p>
                      <p className="text-xl font-bold text-green-700">
                        {formatCurrency(monthlyStats.totals?.total_paid)}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-100">
                      <p className="text-xs text-slate-500">Da Incassare</p>
                      <p className="text-xl font-bold text-amber-700">
                        {formatCurrency(monthlyStats.totals?.total_pending)}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl border ${
                      monthlyStats.totals?.year_change_percent >= 0 
                        ? 'bg-gradient-to-br from-teal-50 to-white border-teal-100' 
                        : 'bg-gradient-to-br from-red-50 to-white border-red-100'
                    }`}>
                      <p className="text-xs text-slate-500">vs Anno Precedente</p>
                      <div className="flex items-center gap-2">
                        {monthlyStats.totals?.year_change_percent >= 0 ? (
                          <TrendingUp className="h-5 w-5 text-teal-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                        <p className={`text-xl font-bold ${
                          monthlyStats.totals?.year_change_percent >= 0 ? 'text-teal-700' : 'text-red-700'
                        }`}>
                          {monthlyStats.totals?.year_change_percent > 0 ? '+' : ''}
                          {monthlyStats.totals?.year_change_percent?.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="h-80 mt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyStats.months} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month_name" tick={{ fontSize: 12 }} tickFormatter={(v) => v.substring(0, 3)} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${(v/1000).toFixed(0)}k`} />
                        <Tooltip 
                          formatter={(value) => formatCurrency(value)}
                          labelFormatter={(label) => label}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Legend />
                        <Bar dataKey="total_paid" name="Pagato" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="total_pending" name="Da pagare" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Gestione Tipi */}
        <TabsContent value="types" className="space-y-4">
          <Card className="bg-white border border-slate-200">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-purple-500" />
                  Tipi di Onorario
                </CardTitle>
                <Button 
                  onClick={() => setShowFeeTypeDialog(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Tipo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {feeTypes.map((ft) => {
                  const Icon = getIconComponent(ft.icon);
                  return (
                    <div key={ft.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ft.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{ft.label}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {ft.is_iguala && <Badge className="bg-teal-100 text-teal-700 text-xs">Iguala</Badge>}
                            {ft.requires_due_date && (
                              <Badge className="bg-amber-100 text-amber-700 text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                Richiede Scadenza
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Dettaglio Categoria */}
      <Dialog open={!!selectedCategory} onOpenChange={(open) => !open && setSelectedCategory(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedCategory && (
                <>
                  <div className={`w-10 h-10 ${getCategoryColor(selectedCategory.color).bg} rounded-lg 
                    flex items-center justify-center`}>
                    {(() => {
                      const Icon = getIconComponent(selectedCategory.icon);
                      return <Icon className={`h-5 w-5 ${getCategoryColor(selectedCategory.color).text}`} />;
                    })()}
                  </div>
                  <div>
                    <span className="text-xl">{selectedCategory.name}</span>
                    <p className="text-sm font-normal text-slate-500">
                      {selectedCategory.clients_count} clienti • Totale: {formatCurrency(selectedCategory.total_gross)}
                    </p>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 mt-4">
            {loadingCategoryClients ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : categoryClients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessun cliente in questa categoria</p>
              </div>
            ) : (
              <div className="space-y-2">
                {categoryClients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => {
                      setSelectedCategory(null);
                      openClientDetail(client);
                    }}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 
                      cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-teal-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800">{client.full_name}</h4>
                        <p className="text-sm text-slate-500">{client.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Totale</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(client.total)}</p>
                      </div>
                      {client.total_pending > 0 && (
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Da incassare</p>
                          <p className="font-semibold text-amber-600">{formatCurrency(client.total_pending)}</p>
                        </div>
                      )}
                      <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-teal-500" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog: Dettaglio Cliente */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <span className="text-xl">{selectedClient?.full_name}</span>
                  <p className="text-sm font-normal text-slate-500">{selectedClient?.email}</p>
                </div>
              </DialogTitle>
              <Button onClick={() => openNewFeeDialog()} className="bg-teal-500 hover:bg-teal-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Onorario
              </Button>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 mt-4">
            {clientFees.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessun onorario registrato</p>
              </div>
            ) : (
              <div className="space-y-3">
                {clientFees.map((fee) => (
                  <div key={fee.id} className="p-4 rounded-lg border hover:bg-slate-50 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-slate-800">{fee.description}</h4>
                          {getStatusBadge(fee.status)}
                          {(fee.is_recurring || fee.status === 'recurring') && (
                            <Badge className="bg-blue-100 text-blue-700">
                              <Repeat className="h-3 w-3 mr-1" />
                              Ricorrente
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          {fee.tax_type && (
                            <span className="flex items-center gap-1">
                              <Calculator className="h-4 w-4" />
                              {TAX_TYPES.find(t => t.value === fee.tax_type)?.label || fee.tax_type}
                            </span>
                          )}
                          {fee.reference_month && fee.reference_year && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {MONTHS[fee.reference_month - 1]} {fee.reference_year}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-800">
                          {formatCurrency(fee.gross_amount || fee.amount)}
                        </p>
                        {fee.tax_amount > 0 && (
                          <p className="text-xs text-slate-500">
                            Netto: {formatCurrency(fee.net_amount)} + IVA: {formatCurrency(fee.tax_amount)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      {fee.status !== 'paid' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsPaid(fee)}
                          className="border-green-200 text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Segna Pagato
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openEditFeeDialog(fee)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Modifica
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setDeleteFeeDialog({ open: true, fee })}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog: Crea/Modifica Onorario */}
      <Dialog open={showFeeDialog} onOpenChange={setShowFeeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-teal-500" />
              {editingFee ? "Modifica Onorario" : "Nuovo Onorario"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveFee} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrizione *</Label>
              <Input
                value={feeForm.description}
                onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })}
                placeholder="Es: Consulenza fiscale trimestre"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Importo Netto *</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    value={feeForm.amount}
                    onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                    className="pl-9"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tassazione</Label>
                <Select value={feeForm.tax_type} onValueChange={(v) => setFeeForm({ ...feeForm, tax_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview importi */}
            {feeForm.amount && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Netto:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(feeForm.amount) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Imposta ({TAX_TYPES.find(t => t.value === feeForm.tax_type)?.label}):
                  </span>
                  <span className="font-medium">
                    {formatCurrency(calculateTaxAmounts(feeForm.amount, feeForm.tax_type).tax_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                  <span>Totale Lordo:</span>
                  <span className="text-teal-600">
                    {formatCurrency(calculateTaxAmounts(feeForm.amount, feeForm.tax_type).gross_amount)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo Onorario</Label>
                <Select value={feeForm.fee_type} onValueChange={(v) => setFeeForm({ ...feeForm, fee_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {feeTypes.map(ft => (
                      <SelectItem key={ft.id} value={ft.id}>{ft.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stato</Label>
                <Select value={feeForm.status} onValueChange={(v) => setFeeForm({ ...feeForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mese di Riferimento</Label>
                <Select 
                  value={feeForm.reference_month?.toString()} 
                  onValueChange={(v) => setFeeForm({ ...feeForm, reference_month: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Anno di Riferimento</Label>
                <Select 
                  value={feeForm.reference_year?.toString()} 
                  onValueChange={(v) => setFeeForm({ ...feeForm, reference_year: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="recurring" 
                checked={feeForm.is_recurring}
                onCheckedChange={(checked) => setFeeForm({ ...feeForm, is_recurring: checked })}
              />
              <label htmlFor="recurring" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Repeat className="h-4 w-4 text-blue-500" />
                Onorario Ricorrente (Iguala)
              </label>
            </div>

            <div className="space-y-2">
              <Label>Note (opzionale)</Label>
              <Textarea
                value={feeForm.notes}
                onChange={(e) => setFeeForm({ ...feeForm, notes: e.target.value })}
                placeholder="Note aggiuntive..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowFeeDialog(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={savingFee} className="bg-teal-500 hover:bg-teal-600">
                {savingFee ? "Salvataggio..." : (editingFee ? "Aggiorna" : "Crea")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog: Elimina Onorario */}
      <AlertDialog open={deleteFeeDialog.open} onOpenChange={(open) => setDeleteFeeDialog({ ...deleteFeeDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo onorario? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFee} className="bg-red-500 hover:bg-red-600">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GlobalFeesManagement;
