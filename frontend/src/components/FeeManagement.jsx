import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from '@/components/ui/sonner';
import { 
  Euro, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Receipt,
  Calendar,
  FileText,
  Calculator,
  CreditCard,
  MapPin,
  Repeat,
  AlertTriangle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

// ==================== COSTANTI ====================
const FEE_TYPES = {
  standard: { label: "Onorario Standard", requiresDueDate: false, icon: Receipt, color: "bg-slate-100 text-slate-700" },
  consulenza: { label: "Consulenza", requiresDueDate: false, icon: FileText, color: "bg-blue-100 text-blue-700" },
  pratica: { label: "Pratica/Procedura", requiresDueDate: true, icon: Calendar, color: "bg-purple-100 text-purple-700" },
  dichiarazione: { label: "Dichiarazione Fiscale", requiresDueDate: true, icon: Calculator, color: "bg-amber-100 text-amber-700" },
  iguala_buste_paga: { label: "Iguala - Buste Paga", requiresDueDate: false, isIguala: true, icon: CreditCard, color: "bg-teal-100 text-teal-700" },
  iguala_contabilita: { label: "Iguala - Contabilità Società", requiresDueDate: false, isIguala: true, icon: Calculator, color: "bg-green-100 text-green-700" },
  iguala_domicilio: { label: "Iguala - Domicilio Sociale", requiresDueDate: false, isIguala: true, icon: MapPin, color: "bg-indigo-100 text-indigo-700" }
};

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

const RECURRING_FREQUENCIES = [
  { value: "monthly", label: "Mensile" },
  { value: "quarterly", label: "Trimestrale" },
  { value: "yearly", label: "Annuale" },
];

// Helper functions
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
};

const calculateTaxAmounts = (netAmount, taxType) => {
  const tax = TAX_TYPES.find(t => t.value === taxType);
  const rate = tax?.rate || 0;
  const net = parseFloat(netAmount) || 0;
  const taxAmount = Math.round(net * rate * 100) / 100;
  const gross = Math.round((net + taxAmount) * 100) / 100;
  return { net_amount: net, tax_amount: taxAmount, gross_amount: gross };
};

// ==================== COMPONENTE PRINCIPALE ====================
const FeeManagement = ({ clientId, clientName, token, API }) => {
  const [fees, setFees] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, fee: null });
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    due_date: "",
    status: "pending",
    notes: "",
    fee_type: "standard",
    is_recurring: false,
    recurring_frequency: "monthly",
    recurring_month: "",
    reference_month: new Date().getMonth() + 1,
    reference_year: new Date().getFullYear(),
    tax_type: "ESENTE"
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [feesRes, summaryRes, feeTypesRes] = await Promise.all([
        axios.get(`${API}/clients/${clientId}/fees`, { headers }),
        axios.get(`${API}/clients/${clientId}/fees/summary`, { headers }),
        axios.get(`${API}/fees/fee-types`, { headers }).catch(() => ({ data: [] }))
      ]);
      setFees(feesRes.data);
      setSummary(summaryRes.data);
      setFeeTypes(feeTypesRes.data);
    } catch (error) {
      toast.error("Errore nel caricamento degli onorari");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const feeTypeConfig = FEE_TYPES[formData.fee_type];
      const taxAmounts = calculateTaxAmounts(formData.amount, formData.tax_type);
      
      const feeData = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        status: formData.is_recurring ? "recurring" : formData.status,
        notes: formData.notes || null,
        fee_type: formData.fee_type,
        is_recurring: formData.fee_type.startsWith("iguala_") || formData.is_recurring,
        recurring_frequency: formData.is_recurring ? formData.recurring_frequency : null,
        recurring_month: formData.fee_type.startsWith("iguala_") ? formData.recurring_month : null,
        reference_month: formData.reference_month,
        reference_year: formData.reference_year,
        // Campi fiscali
        tax_type: formData.tax_type,
        net_amount: taxAmounts.net_amount,
        tax_amount: taxAmounts.tax_amount,
        gross_amount: taxAmounts.gross_amount,
        // Scadenza solo se richiesta dal tipo
        due_date: feeTypeConfig?.requiresDueDate ? formData.due_date : null
      };

      if (editingFee) {
        await axios.put(`${API}/clients/${clientId}/fees/${editingFee.id}`, feeData, { headers });
        toast.success("Onorario aggiornato");
      } else {
        await axios.post(`${API}/clients/${clientId}/fees`, feeData, { headers });
        toast.success("Onorario creato");
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.fee) return;
    
    try {
      await axios.delete(`${API}/clients/${clientId}/fees/${deleteDialog.fee.id}`, { headers });
      toast.success("Onorario eliminato");
      setDeleteDialog({ open: false, fee: null });
      fetchData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const handleMarkAsPaid = async (fee) => {
    try {
      await axios.put(`${API}/clients/${clientId}/fees/${fee.id}`, {
        status: "paid",
        paid_date: new Date().toISOString().split('T')[0]
      }, { headers });
      toast.success("Onorario segnato come pagato");
      fetchData();
    } catch (error) {
      toast.error("Errore nell'aggiornamento");
    }
  };

  const startEdit = (fee) => {
    setEditingFee(fee);
    setFormData({
      description: fee.description,
      amount: (fee.net_amount || fee.amount || "").toString(),
      due_date: fee.due_date ? fee.due_date.split('T')[0] : "",
      status: fee.status,
      notes: fee.notes || "",
      fee_type: fee.fee_type || "standard",
      is_recurring: fee.is_recurring || fee.status === "recurring",
      recurring_frequency: fee.recurring_frequency || "monthly",
      recurring_month: fee.recurring_month || "",
      reference_month: fee.reference_month || new Date().getMonth() + 1,
      reference_year: fee.reference_year || new Date().getFullYear(),
      tax_type: fee.tax_type || "ESENTE"
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      description: "",
      amount: "",
      due_date: "",
      status: "pending",
      notes: "",
      fee_type: "standard",
      is_recurring: false,
      recurring_frequency: "monthly",
      recurring_month: "",
      reference_month: new Date().getMonth() + 1,
      reference_year: new Date().getFullYear(),
      tax_type: "ESENTE"
    });
    setEditingFee(null);
    setShowForm(false);
  };

  const getFeeTypeBadge = (feeType) => {
    const type = FEE_TYPES[feeType] || FEE_TYPES.standard;
    const Icon = type.icon;
    return (
      <Badge className={`${type.color} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {type.label}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const s = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];
    return <Badge className={s.color}>{s.label}</Badge>;
  };

  const getTaxLabel = (taxType) => {
    const tax = TAX_TYPES.find(t => t.value === taxType);
    return tax?.label || taxType || "N/A";
  };

  // Calcolo preview in tempo reale
  const taxPreview = calculateTaxAmounts(formData.amount, formData.tax_type);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-teal-50 to-white border-teal-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Euro className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Totale Pagato</p>
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
          
          <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Totale</p>
                  <p className="text-lg font-bold text-blue-700">{formatCurrency(summary.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Onorari</p>
                  <p className="text-lg font-bold text-slate-700">{summary.count_total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header con pulsante nuovo */}
      <div className="flex justify-between items-center">
        <h3 className="font-heading text-lg font-semibold text-slate-900">
          Gestione Onorari - {clientName}
        </h3>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-teal-500 hover:bg-teal-600 text-white"
          data-testid="add-fee-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Onorario
        </Button>
      </div>

      {/* Lista Onorari */}
      {fees.length === 0 ? (
        <Card className="bg-slate-50 border-dashed">
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nessun onorario registrato per questo cliente</p>
            <Button 
              onClick={() => setShowForm(true)}
              variant="outline" 
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crea il primo onorario
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {fees.map((fee) => (
            <Card key={fee.id} className="bg-white border border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="font-semibold text-slate-800">{fee.description}</h4>
                      {getFeeTypeBadge(fee.fee_type)}
                      {getStatusBadge(fee.status)}
                      {(fee.is_recurring || fee.status === 'recurring') && (
                        <Badge className="bg-blue-100 text-blue-700">
                          <Repeat className="h-3 w-3 mr-1" />
                          Ricorrente
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                      {fee.tax_type && (
                        <span className="flex items-center gap-1">
                          <Calculator className="h-4 w-4" />
                          {getTaxLabel(fee.tax_type)}
                        </span>
                      )}
                      {fee.reference_month && fee.reference_year && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {MONTHS[fee.reference_month - 1]} {fee.reference_year}
                        </span>
                      )}
                      {fee.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Scadenza: {format(parseISO(fee.due_date), 'dd/MM/yyyy', { locale: it })}
                        </span>
                      )}
                    </div>
                    {fee.notes && (
                      <p className="text-sm text-slate-500 mt-2 italic">"{fee.notes}"</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xl font-bold text-slate-800">
                      {formatCurrency(fee.gross_amount || fee.amount)}
                    </p>
                    {fee.tax_amount > 0 && (
                      <p className="text-xs text-slate-500">
                        Netto: {formatCurrency(fee.net_amount)} + {getTaxLabel(fee.tax_type).split(' ')[0]}: {formatCurrency(fee.tax_amount)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
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
                  <Button size="sm" variant="outline" onClick={() => startEdit(fee)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Modifica
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setDeleteDialog({ open: true, fee })}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-teal-500" />
              {editingFee ? "Modifica Onorario" : "Nuovo Onorario"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Tipo Onorario */}
            <div className="space-y-2">
              <Label>Tipo Onorario</Label>
              <Select 
                value={formData.fee_type} 
                onValueChange={(value) => setFormData({
                  ...formData, 
                  fee_type: value,
                  is_recurring: value.startsWith('iguala_') ? true : formData.is_recurring
                })}
              >
                <SelectTrigger className="border-slate-200" data-testid="fee-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FEE_TYPES).map(([key, type]) => (
                    <SelectItem key={key} value={key}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrizione */}
            <div className="space-y-2">
              <Label>Descrizione *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Es: Consulenza fiscale trimestre Q1"
                required
                className="border-slate-200"
                data-testid="fee-description-input"
              />
            </div>
            
            {/* Importo e Tassazione */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Importo Netto (€) *</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                    className="border-slate-200 pl-9"
                    data-testid="fee-amount-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Regime Fiscale</Label>
                <Select 
                  value={formData.tax_type}
                  onValueChange={(v) => setFormData({ ...formData, tax_type: v })}
                >
                  <SelectTrigger className="border-slate-200" data-testid="fee-tax-select">
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
            {formData.amount && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Netto:</span>
                  <span className="font-medium">{formatCurrency(taxPreview.net_amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Imposta ({TAX_TYPES.find(t => t.value === formData.tax_type)?.label}):
                  </span>
                  <span className="font-medium">{formatCurrency(taxPreview.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2 border-slate-200">
                  <span>Totale Lordo:</span>
                  <span className="text-teal-600">{formatCurrency(taxPreview.gross_amount)}</span>
                </div>
              </div>
            )}

            {/* Mese e Anno di riferimento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mese di Riferimento</Label>
                <Select 
                  value={formData.reference_month?.toString()} 
                  onValueChange={(v) => setFormData({ ...formData, reference_month: parseInt(v) })}
                >
                  <SelectTrigger className="border-slate-200">
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
                  value={formData.reference_year?.toString()} 
                  onValueChange={(v) => setFormData({ ...formData, reference_year: parseInt(v) })}
                >
                  <SelectTrigger className="border-slate-200">
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

            {/* Stato e Ricorrenza */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stato Pagamento</Label>
                <Select 
                  value={formData.is_recurring ? "recurring" : formData.status}
                  onValueChange={(v) => {
                    if (v === "recurring") {
                      setFormData({ ...formData, status: "recurring", is_recurring: true });
                    } else {
                      setFormData({ ...formData, status: v, is_recurring: false });
                    }
                  }}
                >
                  <SelectTrigger className="border-slate-200" data-testid="fee-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(formData.is_recurring || formData.status === "recurring") && (
                <div className="space-y-2">
                  <Label>Frequenza Ricorrenza</Label>
                  <Select 
                    value={formData.recurring_frequency}
                    onValueChange={(v) => setFormData({ ...formData, recurring_frequency: v })}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRING_FREQUENCIES.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Checkbox ricorrente (alternativo) */}
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Checkbox 
                id="recurring" 
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ 
                  ...formData, 
                  is_recurring: checked,
                  status: checked ? "recurring" : formData.status 
                })}
              />
              <label htmlFor="recurring" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Repeat className="h-4 w-4 text-blue-500" />
                Onorario Ricorrente (Iguala / Pagamento Ricorrente)
              </label>
            </div>

            {/* Scadenza - Solo se richiesta dal tipo */}
            {FEE_TYPES[formData.fee_type]?.requiresDueDate && (
              <div className="space-y-2">
                <Label>Data Scadenza *</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                  className="border-slate-200"
                  data-testid="fee-date-input"
                />
                <p className="text-xs text-slate-500">
                  Questo tipo di onorario richiede una data di scadenza
                </p>
              </div>
            )}

            {/* Mese di riferimento per Iguala (legacy) */}
            {formData.fee_type.startsWith('iguala_') && (
              <div className="space-y-2">
                <Label>Mese di Riferimento Iguala</Label>
                <Input
                  type="month"
                  value={formData.recurring_month}
                  onChange={(e) => setFormData({ ...formData, recurring_month: e.target.value })}
                  className="border-slate-200"
                  data-testid="fee-recurring-month-input"
                />
              </div>
            )}
            
            {/* Note */}
            <div className="space-y-2">
              <Label>Note (opzionale)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Note aggiuntive sull'onorario..."
                rows={2}
                className="border-slate-200"
                data-testid="fee-notes-input"
              />
            </div>
            
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Annulla
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
                className="bg-teal-500 hover:bg-teal-600 text-white"
              >
                {saving ? "Salvataggio..." : (editingFee ? "Aggiorna Onorario" : "Crea Onorario")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Conferma Eliminazione
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare l'onorario "{deleteDialog.fee?.description}"? 
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FeeManagement;
