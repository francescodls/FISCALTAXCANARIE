import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Euro, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Calendar,
  Receipt
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const FeeManagement = ({ clientId, clientName, token, API }) => {
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    due_date: "",
    status: "pending",
    notes: ""
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchFees();
  }, [clientId]);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const [feesRes, summaryRes] = await Promise.all([
        axios.get(`${API}/clients/${clientId}/fees`, { headers }),
        axios.get(`${API}/clients/${clientId}/fees/summary`, { headers })
      ]);
      setFees(feesRes.data);
      setSummary(summaryRes.data);
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
      if (editingFee) {
        await axios.put(`${API}/clients/${clientId}/fees/${editingFee.id}`, {
          ...formData,
          amount: parseFloat(formData.amount)
        }, { headers });
        toast.success("Onorario aggiornato");
      } else {
        await axios.post(`${API}/clients/${clientId}/fees`, {
          ...formData,
          amount: parseFloat(formData.amount)
        }, { headers });
        toast.success("Onorario creato");
      }
      
      resetForm();
      fetchFees();
    } catch (error) {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (feeId) => {
    if (!confirm("Sei sicuro di voler eliminare questo onorario?")) return;
    
    try {
      await axios.delete(`${API}/clients/${clientId}/fees/${feeId}`, { headers });
      toast.success("Onorario eliminato");
      fetchFees();
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
      fetchFees();
    } catch (error) {
      toast.error("Errore nell'aggiornamento");
    }
  };

  const startEdit = (fee) => {
    setEditingFee(fee);
    setFormData({
      description: fee.description,
      amount: fee.amount.toString(),
      due_date: fee.due_date.split('T')[0],
      status: fee.status,
      notes: fee.notes || ""
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      description: "",
      amount: "",
      due_date: "",
      status: "pending",
      notes: ""
    });
    setEditingFee(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Totale Pagato</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    €{summary.total_paid.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-emerald-500 mt-1">
                    {summary.count_paid} fatture
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">In Attesa</p>
                  <p className="text-2xl font-bold text-amber-700">
                    €{summary.total_pending.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-amber-500 mt-1">
                    {summary.count_pending} fatture
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Totale Generale</p>
                  <p className="text-2xl font-bold text-slate-700">
                    €{summary.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {summary.count_total} fatture totali
                  </p>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Fee Button */}
      <div className="flex justify-between items-center">
        <h3 className="font-heading text-lg font-semibold text-slate-900">
          Gestione Onorari - {clientName}
        </h3>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-teal-500 hover:bg-teal-600 active:bg-slate-900 active:scale-95 text-white transition-all"
          data-testid="add-fee-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Onorario
        </Button>
      </div>

      {/* Fee Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-teal-500" />
              {editingFee ? "Modifica Onorario" : "Nuovo Onorario"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Descrizione *</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Es: Consulenza fiscale Gennaio 2025"
                required
                className="border-slate-200"
                data-testid="fee-description-input"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Importo (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="150.00"
                  required
                  className="border-slate-200"
                  data-testid="fee-amount-input"
                />
              </div>
              
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
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Stato</Label>
              <Select 
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger className="border-slate-200" data-testid="fee-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">In attesa</SelectItem>
                  <SelectItem value="paid">Pagato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Note (opzionale)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Note aggiuntive..."
                className="border-slate-200 resize-none"
                rows={2}
              />
            </div>
            
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                Annulla
              </Button>
              <Button 
                type="submit" 
                disabled={saving}
                className="bg-teal-500 hover:bg-teal-600 active:bg-slate-900 active:scale-95 text-white transition-all"
                data-testid="fee-save-btn"
              >
                {saving ? "Salvataggio..." : (editingFee ? "Aggiorna" : "Crea")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Fees List */}
      <Card className="bg-white border border-slate-200">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Euro className="h-5 w-5 text-teal-500" />
            Storico Onorari
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fees.length > 0 ? (
            <div className="space-y-3">
              {fees.map((fee) => (
                <div 
                  key={fee.id} 
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    fee.status === 'paid' 
                      ? 'bg-emerald-50 border-emerald-200' 
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      fee.status === 'paid' ? 'bg-emerald-100' : 'bg-amber-100'
                    }`}>
                      {fee.status === 'paid' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{fee.description}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Scadenza: {format(parseISO(fee.due_date), "d MMM yyyy", { locale: it })}
                        </span>
                        {fee.paid_date && (
                          <span className="text-emerald-600">
                            Pagato: {format(parseISO(fee.paid_date), "d MMM yyyy", { locale: it })}
                          </span>
                        )}
                      </div>
                      {fee.notes && (
                        <p className="text-xs text-slate-400 mt-1">{fee.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-xl font-bold ${
                        fee.status === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        €{fee.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </p>
                      <Badge className={
                        fee.status === 'paid' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }>
                        {fee.status === 'paid' ? 'Pagato' : 'In attesa'}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      {fee.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsPaid(fee)}
                          className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          title="Segna come pagato"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(fee)}
                        className="border-slate-200"
                        title="Modifica"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(fee.id)}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        title="Elimina"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Euro className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nessun onorario registrato</p>
              <p className="text-sm text-slate-400">Clicca "Nuovo Onorario" per aggiungerne uno</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeeManagement;
