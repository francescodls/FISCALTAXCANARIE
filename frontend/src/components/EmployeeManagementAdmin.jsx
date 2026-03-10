import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API } from "@/App";
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
  Users, 
  Plus, 
  Upload,
  Download,
  Trash2,
  FileText,
  Briefcase,
  MapPin,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  UserX,
  Eye,
  Bell,
  ChevronRight,
  User
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const EmployeeManagementAdmin = ({ token, userRole, clientId = null, isAdmin = false, isConsulente = false }) => {
  const [employees, setEmployees] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showNotificationsDialog, setShowNotificationsDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const [uploadForm, setUploadForm] = useState({
    document_type: "contract",
    description: "",
    file: null
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchEmployees();
    fetchNotifications();
    fetchUnreadCount();
  }, [clientId]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Se c'è clientId, filtra per quel cliente
      const url = clientId 
        ? `${API}/employees?client_id=${clientId}` 
        : `${API}/employees`;
      const response = await axios.get(url, { headers });
      setEmployees(response.data);
    } catch (error) {
      console.error("Errore nel caricamento dipendenti:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/employee-notifications`, { headers });
      setNotifications(response.data);
    } catch (error) {
      console.error("Errore nel caricamento notifiche:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${API}/employee-notifications/count`, { headers });
      setUnreadCount(response.data.unread_count);
    } catch (error) {
      console.error("Errore nel conteggio notifiche:", error);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await axios.post(`${API}/employee-notifications/${notificationId}/read`, {}, { headers });
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      console.error("Errore:", error);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.post(`${API}/employee-notifications/read-all`, {}, { headers });
      toast.success("Tutte le notifiche segnate come lette");
      fetchNotifications();
      fetchUnreadCount();
    } catch (error) {
      toast.error("Errore");
    }
  };

  const updateEmployeeStatus = async (employeeId, newStatus) => {
    try {
      await axios.put(
        `${API}/employees/${employeeId}`,
        { status: newStatus },
        { headers }
      );
      toast.success("Stato dipendente aggiornato");
      fetchEmployees();
      if (selectedEmployee?.id === employeeId) {
        setSelectedEmployee({ ...selectedEmployee, status: newStatus });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'aggiornamento");
    }
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      toast.error("Seleziona un file");
      return;
    }
    setSubmitting(true);
    const formData = new FormData();
    formData.append("file", uploadForm.file);
    formData.append("document_type", uploadForm.document_type);
    formData.append("description", uploadForm.description || "");

    try {
      await axios.post(
        `${API}/employees/${selectedEmployee.id}/documents`,
        formData,
        { headers: { ...headers, "Content-Type": "multipart/form-data" } }
      );
      toast.success("Documento caricato");
      setShowUploadDialog(false);
      setUploadForm({ document_type: "contract", description: "", file: null });
      if (fileInputRef.current) fileInputRef.current.value = "";
      // Ricarica dettaglio dipendente
      const res = await axios.get(`${API}/employees/${selectedEmployee.id}`, { headers });
      setSelectedEmployee(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nel caricamento");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadDocument = async (docId) => {
    try {
      const response = await axios.get(
        `${API}/employees/${selectedEmployee.id}/documents/${docId}/download`,
        { headers }
      );
      const link = document.createElement("a");
      link.href = `data:${response.data.file_type};base64,${response.data.file_data}`;
      link.download = response.data.file_name;
      link.click();
    } catch (error) {
      toast.error("Errore nel download");
    }
  };

  const deleteDocument = async (docId) => {
    if (!confirm("Eliminare questo documento?")) return;
    try {
      await axios.delete(
        `${API}/employees/${selectedEmployee.id}/documents/${docId}`,
        { headers }
      );
      toast.success("Documento eliminato");
      const res = await axios.get(`${API}/employees/${selectedEmployee.id}`, { headers });
      setSelectedEmployee(res.data);
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const openEmployeeDetail = async (employee) => {
    try {
      const res = await axios.get(`${API}/employees/${employee.id}`, { headers });
      setSelectedEmployee(res.data);
      setShowDetailDialog(true);
    } catch (error) {
      toast.error("Errore nel caricamento dettagli");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500 text-white"><CheckCircle2 className="h-3 w-3 mr-1" /> Attivo</Badge>;
      case "pending":
        return <Badge className="bg-amber-500 text-white"><Clock className="h-3 w-3 mr-1" /> In attesa</Badge>;
      case "termination_pending":
        return <Badge className="bg-orange-500 text-white"><AlertCircle className="h-3 w-3 mr-1" /> Licenziamento richiesto</Badge>;
      case "terminated":
        return <Badge className="bg-red-500 text-white"><UserX className="h-3 w-3 mr-1" /> Cessato</Badge>;
      default:
        return <Badge className="bg-slate-500 text-white">{status}</Badge>;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "border-l-emerald-500 bg-emerald-50";
      case "pending": return "border-l-amber-500 bg-amber-50";
      case "termination_pending": return "border-l-orange-500 bg-orange-50";
      case "terminated": return "border-l-red-500 bg-red-50";
      default: return "border-l-slate-500 bg-slate-50";
    }
  };

  const filteredEmployees = statusFilter === "all" 
    ? employees 
    : employees.filter(e => e.status === statusFilter);

  const documentTypes = [
    { value: "id_document", label: "Documento di Identità" },
    { value: "nie", label: "NIE" },
    { value: "contract", label: "Contratto" },
    { value: "timesheet", label: "Registro Orario" },
    { value: "other", label: "Altro" }
  ];

  const getNotificationIcon = (type) => {
    switch (type) {
      case "hire_request": return <Users className="h-5 w-5 text-emerald-500" />;
      case "termination_request": return <UserX className="h-5 w-5 text-red-500" />;
      case "document_upload": return <FileText className="h-5 w-5 text-blue-500" />;
      default: return <Bell className="h-5 w-5 text-slate-500" />;
    }
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
      {/* Header con notifiche */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">Gestione Dipendenti</h2>
          <p className="text-slate-600">Visualizza e gestisci i dipendenti dei clienti</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="status-filter">
              <SelectValue placeholder="Filtra stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="active">Attivi</SelectItem>
              <SelectItem value="pending">In attesa</SelectItem>
              <SelectItem value="termination_pending">Licenziamento</SelectItem>
              <SelectItem value="terminated">Cessati</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setShowNotificationsDialog(true)}
            className="relative"
            data-testid="notifications-btn"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-emerald-50 border-emerald-200">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold text-emerald-700">{employees.filter(e => e.status === "active").length}</p>
              <p className="text-sm text-emerald-600">Attivi</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-amber-700">{employees.filter(e => e.status === "pending").length}</p>
              <p className="text-sm text-amber-600">In attesa</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold text-orange-700">{employees.filter(e => e.status === "termination_pending").length}</p>
              <p className="text-sm text-orange-600">Da gestire</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <UserX className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-700">{employees.filter(e => e.status === "terminated").length}</p>
              <p className="text-sm text-red-600">Cessati</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista dipendenti */}
      {filteredEmployees.length > 0 ? (
        <div className="space-y-3">
          {filteredEmployees.map((employee) => (
            <Card 
              key={employee.id} 
              className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${getStatusColor(employee.status)}`}
              onClick={() => openEmployeeDetail(employee)}
              data-testid={`employee-row-${employee.id}`}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    employee.status === "active" ? "bg-emerald-100" : 
                    employee.status === "terminated" ? "bg-red-100" : "bg-amber-100"
                  }`}>
                    <Users className={`h-6 w-6 ${
                      employee.status === "active" ? "text-emerald-600" : 
                      employee.status === "terminated" ? "text-red-600" : "text-amber-600"
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{employee.full_name}</h3>
                      {getStatusBadge(employee.status)}
                    </div>
                    <p className="text-sm text-slate-500">{employee.job_title} • {employee.work_location}</p>
                    <p className="text-xs text-slate-400">
                      Cliente: {employee.client_name} • Inizio: {employee.start_date}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Nessun dipendente</h3>
            <p className="text-slate-500">
              {statusFilter !== "all" ? "Nessun dipendente con questo stato." : "Non ci sono dipendenti registrati."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog Dettaglio Dipendente */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-500" />
              Dettaglio Dipendente
            </DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-6">
              {/* Info dipendente */}
              <div className={`p-4 rounded-lg border-l-4 ${getStatusColor(selectedEmployee.status)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedEmployee.full_name}</h3>
                    <p className="text-slate-600">{selectedEmployee.job_title}</p>
                  </div>
                  {getStatusBadge(selectedEmployee.status)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Cliente:</span>
                    <span className="ml-2 font-medium">{selectedEmployee.client_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Data Inizio:</span>
                    <span className="ml-2 font-medium">{selectedEmployee.start_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Luogo:</span>
                    <span className="ml-2 font-medium">{selectedEmployee.work_location}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Orario:</span>
                    <span className="ml-2 font-medium">{selectedEmployee.work_hours}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Giorni:</span>
                    <span className="ml-2 font-medium">{selectedEmployee.work_days}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Contratto:</span>
                    <span className="ml-2 font-medium">{selectedEmployee.contract_type || "N/D"}</span>
                  </div>
                </div>
              </div>

              {/* Azioni stato */}
              <div className="flex gap-2">
                {selectedEmployee.status === "pending" && (
                  <Button
                    onClick={() => updateEmployeeStatus(selectedEmployee.id, "active")}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Attiva Dipendente
                  </Button>
                )}
                {selectedEmployee.status === "termination_pending" && (
                  <Button
                    onClick={() => updateEmployeeStatus(selectedEmployee.id, "terminated")}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Conferma Licenziamento
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowUploadDialog(true)}
                  className="border-teal-200 text-teal-600 hover:bg-teal-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Carica Documento
                </Button>
              </div>

              {/* Documenti */}
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Documenti ({selectedEmployee.documents?.length || 0})</h4>
                {selectedEmployee.documents?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEmployee.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-slate-500" />
                          <div>
                            <p className="font-medium text-slate-900">
                              {documentTypes.find(d => d.value === doc.document_type)?.label || doc.document_type}
                            </p>
                            <p className="text-xs text-slate-500">{doc.file_name}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadDocument(doc.id)}
                            className="text-teal-600 hover:text-teal-700"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDocument(doc.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">Nessun documento caricato</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Upload Documento */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-teal-500" />
              Carica Documento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDocumentUpload} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo Documento *</Label>
              <Select
                value={uploadForm.document_type}
                onValueChange={(v) => setUploadForm({ ...uploadForm, document_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Input
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Descrizione documento"
              />
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <Input
                type="file"
                ref={fileInputRef}
                onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                accept=".pdf,.jpg,.jpeg,.png"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={submitting} className="bg-teal-500 hover:bg-teal-600 text-white">
                {submitting ? "Caricamento..." : "Carica"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Notifiche */}
      <Dialog open={showNotificationsDialog} onOpenChange={setShowNotificationsDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                Notifiche Dipendenti
              </DialogTitle>
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllRead}>
                  Segna tutte come lette
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="space-y-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationRead(notif.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      notif.read_by?.includes(token) ? "bg-slate-50" : "bg-amber-50 border border-amber-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notif.type)}
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{notif.title}</p>
                        <p className="text-sm text-slate-600">{notif.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {format(parseISO(notif.created_at), "dd/MM/yyyy HH:mm", { locale: it })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">Nessuna notifica</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeManagementAdmin;
