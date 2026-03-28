import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Printer,
  Euro,
  Filter,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  Building2,
  Briefcase,
  Home,
  User,
  RefreshCw,
  X,
  FileText
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const GlobalFeesManagement = ({ token }) => {
  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientTypeFilter, setClientTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const printRef = useRef();

  const headers = { Authorization: `Bearer ${token}` };

  const clientTypes = [
    { value: "all", label: "Tutte le categorie", icon: Users },
    { value: "societa", label: "Società", icon: Building2 },
    { value: "autonomo", label: "Autonomo", icon: Briefcase },
    { value: "vivienda_vacacional", label: "Vivienda Vacacional", icon: Home },
    { value: "persona_fisica", label: "Persona Fisica", icon: User },
  ];

  const statusOptions = [
    { value: "all", label: "Tutti gli stati" },
    { value: "pending", label: "In attesa", color: "bg-amber-100 text-amber-700" },
    { value: "paid", label: "Pagato", color: "bg-green-100 text-green-700" },
    { value: "overdue", label: "Scaduto", color: "bg-red-100 text-red-700" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    fetchFees();
    fetchSummary();
  }, []);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (clientTypeFilter !== "all") params.append("client_type", clientTypeFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (yearFilter !== "all") params.append("year", yearFilter);

      const response = await axios.get(`${API}/fees/all?${params.toString()}`, { headers });
      setFees(response.data);
    } catch (error) {
      toast.error("Errore nel caricamento degli onorari");
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

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchFees();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, clientTypeFilter, statusFilter, yearFilter]);

  const handlePrint = (fee) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Onorario - ${fee.client_name}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #3CACA4; padding-bottom: 20px; }
          .header h1 { color: #3CACA4; margin: 0; }
          .header p { color: #64748b; margin: 5px 0 0 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-box { background: #f8fafc; padding: 15px; border-radius: 8px; }
          .info-box label { font-size: 12px; color: #64748b; text-transform: uppercase; }
          .info-box p { font-size: 16px; font-weight: 600; margin: 5px 0 0 0; }
          .amount { font-size: 32px; text-align: center; padding: 30px; background: linear-gradient(135deg, #3CACA4 0%, #2d8a84 100%); color: white; border-radius: 12px; margin: 30px 0; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          .status-pending { background: #fef3c7; color: #d97706; }
          .status-paid { background: #d1fae5; color: #059669; }
          .status-overdue { background: #fee2e2; color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Fiscal Tax Canarie</h1>
          <p>Documento Onorario</p>
        </div>
        
        <div class="info-grid">
          <div class="info-box">
            <label>Cliente</label>
            <p>${fee.client_name}</p>
          </div>
          <div class="info-box">
            <label>Email</label>
            <p>${fee.client_email || 'N/A'}</p>
          </div>
          <div class="info-box">
            <label>Descrizione</label>
            <p>${fee.description}</p>
          </div>
          <div class="info-box">
            <label>Data Scadenza</label>
            <p>${new Date(fee.due_date).toLocaleDateString('it-IT')}</p>
          </div>
        </div>
        
        <div class="amount">
          <div style="font-size: 14px; opacity: 0.8;">Importo</div>
          €${fee.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
        </div>
        
        <div style="text-align: center;">
          <span class="status status-${fee.status}">
            ${fee.status === 'pending' ? 'In Attesa' : fee.status === 'paid' ? 'Pagato' : 'Scaduto'}
          </span>
          ${fee.paid_date ? `<p style="margin-top: 10px; color: #64748b;">Pagato il: ${new Date(fee.paid_date).toLocaleDateString('it-IT')}</p>` : ''}
        </div>
        
        ${fee.notes ? `<div style="margin-top: 30px; padding: 15px; background: #f8fafc; border-radius: 8px;"><label style="font-size: 12px; color: #64748b;">Note</label><p style="margin: 5px 0 0 0;">${fee.notes}</p></div>` : ''}
        
        <div class="footer">
          <p>Fiscal Tax Canarie - Il tuo commercialista di fiducia alle Isole Canarie</p>
          <p>+34 658 071 848 | info@fiscaltaxcanarie.com</p>
          <p>Documento generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    const totalAmount = fees.reduce((sum, f) => sum + f.amount, 0);
    const totalPending = fees.filter(f => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Riepilogo Onorari - Fiscal Tax Canarie</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3CACA4; padding-bottom: 20px; }
          .header h1 { color: #3CACA4; margin: 0; }
          .summary { display: flex; justify-content: space-around; margin-bottom: 30px; }
          .summary-box { text-align: center; padding: 15px 30px; background: #f8fafc; border-radius: 8px; }
          .summary-box .value { font-size: 24px; font-weight: 700; color: #3CACA4; }
          .summary-box .label { font-size: 12px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #3CACA4; color: white; padding: 12px; text-align: left; }
          td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .status { padding: 2px 8px; border-radius: 12px; font-size: 11px; }
          .status-pending { background: #fef3c7; color: #d97706; }
          .status-paid { background: #d1fae5; color: #059669; }
          .status-overdue { background: #fee2e2; color: #dc2626; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Fiscal Tax Canarie</h1>
          <p>Riepilogo Onorari</p>
        </div>
        
        <div class="summary">
          <div class="summary-box">
            <div class="value">€${totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
            <div class="label">Totale</div>
          </div>
          <div class="summary-box">
            <div class="value" style="color: #d97706;">€${totalPending.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
            <div class="label">In Attesa</div>
          </div>
          <div class="summary-box">
            <div class="value" style="color: #059669;">€${totalPaid.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
            <div class="label">Pagati</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Descrizione</th>
              <th>Importo</th>
              <th>Scadenza</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            ${fees.map(fee => `
              <tr>
                <td>${fee.client_name}</td>
                <td>${fee.description}</td>
                <td>€${fee.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</td>
                <td>${new Date(fee.due_date).toLocaleDateString('it-IT')}</td>
                <td><span class="status status-${fee.status}">${fee.status === 'pending' ? 'In Attesa' : fee.status === 'paid' ? 'Pagato' : 'Scaduto'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Totale documenti: ${fees.length}</p>
          <p>Generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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

  const getClientTypeIcon = (type) => {
    const TypeIcon = clientTypes.find(t => t.value === type)?.icon || User;
    return <TypeIcon className="h-4 w-4 text-slate-400" />;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setClientTypeFilter("all");
    setStatusFilter("all");
    setYearFilter("all");
  };

  const hasActiveFilters = searchTerm || clientTypeFilter !== "all" || statusFilter !== "all" || yearFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totale Onorari</p>
                <p className="text-2xl font-bold text-slate-800">{summary.total_count || 0}</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <FileText className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">In Attesa</p>
                <p className="text-2xl font-bold text-amber-600">
                  €{(summary.total_pending || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pagati</p>
                <p className="text-2xl font-bold text-green-600">
                  €{(summary.total_paid || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Scaduti</p>
                <p className="text-2xl font-bold text-red-600">
                  €{(summary.total_overdue || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5 text-teal-500" />
              Filtri e Ricerca
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-500">
                <X className="h-4 w-4 mr-1" />
                Cancella filtri
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <Label className="text-xs text-slate-500 mb-1.5 block">Cerca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Cerca per cliente o descrizione..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-slate-200"
                  data-testid="search-fees"
                />
              </div>
            </div>

            {/* Client Type Filter */}
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Categoria Cliente</Label>
              <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
                <SelectTrigger className="border-slate-200" data-testid="filter-client-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clientTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Stato</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-slate-200" data-testid="filter-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Filter */}
            <div>
              <Label className="text-xs text-slate-500 mb-1.5 block">Anno</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="border-slate-200" data-testid="filter-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli anni</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fees Table */}
      <Card className="bg-white border border-slate-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Euro className="h-5 w-5 text-teal-500" />
              Lista Onorari
              <Badge variant="outline" className="ml-2">{fees.length}</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchFees}
                className="border-slate-200"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Aggiorna
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintAll}
                disabled={fees.length === 0}
                className="border-slate-200"
              >
                <Printer className="h-4 w-4 mr-2" />
                Stampa Tutti
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500">Caricamento onorari...</p>
              </div>
            </div>
          ) : fees.length === 0 ? (
            <div className="text-center py-12">
              <Euro className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Nessun onorario trovato</h3>
              <p className="text-slate-500">
                {hasActiveFilters ? "Prova a modificare i filtri di ricerca" : "Non ci sono onorari registrati"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead className="font-semibold">Descrizione</TableHead>
                    <TableHead className="font-semibold text-right">Importo</TableHead>
                    <TableHead className="font-semibold">Scadenza</TableHead>
                    <TableHead className="font-semibold">Stato</TableHead>
                    <TableHead className="font-semibold text-center">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => (
                    <TableRow key={fee.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getClientTypeIcon(fee.client_type)}
                          <div>
                            <p className="font-medium text-slate-800">{fee.client_name}</p>
                            <p className="text-xs text-slate-500">{fee.client_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-slate-700">{fee.description}</p>
                        {fee.notes && (
                          <p className="text-xs text-slate-400 truncate max-w-xs">{fee.notes}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-slate-800">
                          €{fee.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600">
                          {new Date(fee.due_date).toLocaleDateString('it-IT')}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(fee.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint(fee)}
                            className="text-slate-500 hover:text-teal-600"
                            title="Stampa"
                            data-testid={`print-fee-${fee.id}`}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalFeesManagement;
