import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Users, 
  Wallet,
  LogOut,
  User,
  Upload,
  Download,
  Trash2,
  Eye,
  FileText,
  ChevronRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const ConsulenteDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [stats, setStats] = useState({});
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingPayslip, setUploadingPayslip] = useState(false);
  const payslipFileRef = useRef(null);
  
  const [payslipForm, setPayslipForm] = useState({
    title: "",
    month: "Gennaio",
    year: new Date().getFullYear(),
    file: null
  });
  
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchClientPayslips(selectedClient.id);
    }
  }, [selectedClient]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, clientsRes] = await Promise.all([
        axios.get(`${API}/consulente/stats`, { headers }),
        axios.get(`${API}/consulente/clients`, { headers })
      ]);
      setStats(statsRes.data);
      setClients(clientsRes.data);
      if (clientsRes.data.length > 0 && !selectedClient) {
        setSelectedClient(clientsRes.data[0]);
      }
    } catch (error) {
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientPayslips = async (clientId) => {
    try {
      const response = await axios.get(`${API}/payslips?client_id=${clientId}`, { headers });
      setPayslips(response.data);
    } catch (error) {
      console.error("Errore nel caricamento delle buste paga:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handlePayslipUpload = async (e) => {
    e.preventDefault();
    if (!payslipForm.file || !selectedClient) {
      toast.error("Seleziona un file e un cliente");
      return;
    }
    
    setUploadingPayslip(true);
    const formData = new FormData();
    formData.append("title", payslipForm.title || `Busta Paga ${payslipForm.month} ${payslipForm.year}`);
    formData.append("month", payslipForm.month);
    formData.append("year", payslipForm.year);
    formData.append("client_id", selectedClient.id);
    formData.append("file", payslipForm.file);
    
    try {
      await axios.post(`${API}/payslips`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      toast.success("Busta paga caricata con successo");
      setPayslipForm({ title: "", month: "Gennaio", year: new Date().getFullYear(), file: null });
      if (payslipFileRef.current) payslipFileRef.current.value = "";
      setShowUploadDialog(false);
      fetchClientPayslips(selectedClient.id);
      fetchData(); // Aggiorna stats
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nel caricamento della busta paga");
    } finally {
      setUploadingPayslip(false);
    }
  };

  const downloadPayslip = async (payslip) => {
    try {
      const response = await axios.get(`${API}/payslips/${payslip.id}/download`, { headers });
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${response.data.file_data}`;
      link.download = payslip.file_name || `busta_paga_${payslip.month}_${payslip.year}.pdf`;
      link.click();
    } catch (error) {
      toast.error("Errore nel download");
    }
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
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg font-heading">FT</span>
            </div>
            <div>
              <span className="font-heading font-bold text-xl text-slate-900">Fiscal Tax Canarie</span>
              <span className="text-xs text-slate-500 block">Consulente del Lavoro</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-600">
              <User className="h-5 w-5" />
              <span className="font-medium">{user?.full_name}</span>
              <Badge className="bg-indigo-500 text-white ml-2">Consulente</Badge>
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
            Dashboard Consulente
          </h1>
          <p className="text-slate-600">Gestisci le buste paga dei clienti assegnati</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.clients_assigned || 0}</p>
                <p className="text-sm text-slate-500">Clienti Assegnati</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.total_payslips || 0}</p>
                <p className="text-sm text-slate-500">Buste Paga Caricate</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {clients.length === 0 ? (
          <Card className="bg-white border border-slate-200">
            <CardContent className="p-12 text-center">
              <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">Nessun cliente assegnato</h3>
              <p className="text-slate-500">
                L'amministratore non ti ha ancora assegnato clienti da gestire.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Client List */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Clienti Assegnati</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {clients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`p-4 cursor-pointer transition-colors flex items-center justify-between ${
                        selectedClient?.id === client.id ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                      data-testid={`client-item-${client.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{client.full_name}</p>
                          <p className="text-sm text-slate-500">{client.payslips_count || 0} buste paga</p>
                        </div>
                      </div>
                      {selectedClient?.id === client.id && (
                        <ChevronRight className="h-5 w-5 text-indigo-500" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payslips Section */}
            <div className="md:col-span-2 space-y-6">
              {selectedClient && (
                <>
                  <Card className="bg-white border border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="font-heading text-lg flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-emerald-500" />
                        Buste Paga di {selectedClient.full_name}
                      </CardTitle>
                      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                        <DialogTrigger asChild>
                          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="upload-payslip-btn">
                            <Upload className="h-4 w-4 mr-2" />
                            Carica Busta Paga
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <Wallet className="h-5 w-5 text-emerald-500" />
                              Carica Busta Paga
                            </DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handlePayslipUpload} className="space-y-4">
                            <div className="p-3 bg-indigo-50 rounded-lg">
                              <p className="text-sm text-indigo-700">
                                Cliente: <strong>{selectedClient.full_name}</strong>
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Titolo (opzionale)</Label>
                              <Input
                                value={payslipForm.title}
                                onChange={(e) => setPayslipForm({ ...payslipForm, title: e.target.value })}
                                placeholder="Es: Busta Paga Gennaio 2025"
                                className="border-slate-200"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Mese</Label>
                                <Select
                                  value={payslipForm.month}
                                  onValueChange={(v) => setPayslipForm({ ...payslipForm, month: v })}
                                >
                                  <SelectTrigger className="border-slate-200">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {months.map((m) => (
                                      <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Anno</Label>
                                <Input
                                  type="number"
                                  value={payslipForm.year}
                                  onChange={(e) => setPayslipForm({ ...payslipForm, year: parseInt(e.target.value) })}
                                  className="border-slate-200"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>File PDF *</Label>
                              <Input
                                type="file"
                                ref={payslipFileRef}
                                accept=".pdf"
                                onChange={(e) => setPayslipForm({ ...payslipForm, file: e.target.files?.[0] || null })}
                                required
                                className="border-slate-200"
                              />
                            </div>
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>
                                Annulla
                              </Button>
                              <Button
                                type="submit"
                                disabled={uploadingPayslip}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                              >
                                {uploadingPayslip ? "Caricamento..." : "Carica"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      {payslips.length > 0 ? (
                        <div className="space-y-3">
                          {payslips.map((payslip) => (
                            <div
                              key={payslip.id}
                              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                  <FileText className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {payslip.title || `Busta Paga ${payslip.month} ${payslip.year}`}
                                  </p>
                                  <p className="text-sm text-slate-500">
                                    {payslip.month} {payslip.year}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadPayslip(payslip)}
                                className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Scarica
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500">Nessuna busta paga caricata</p>
                          <p className="text-sm text-slate-400">Clicca "Carica Busta Paga" per iniziare</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ConsulenteDashboard;
