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
  Eye
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const EmployeeManagementClient = ({ token, clientId }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHireDialog, setShowHireDialog] = useState(false);
  const [showTerminateDialog, setShowTerminateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const [hireForm, setHireForm] = useState({
    full_name: "",
    start_date: "",
    job_title: "",
    work_hours: "08:00-17:00",
    work_location: "",
    work_days: "Lunedì-Venerdì",
    salary: "",
    contract_type: "indeterminato",
    notes: ""
  });

  const [terminateForm, setTerminateForm] = useState({
    reason: "",
    termination_date: ""
  });

  const [uploadForm, setUploadForm] = useState({
    document_type: "id_document",
    description: "",
    file: null
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/employees`, { headers });
      setEmployees(response.data);
    } catch (error) {
      console.error("Errore nel caricamento dipendenti:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleHireRequest = async (e) => {
    e.preventDefault();
    if (!hireForm.full_name || !hireForm.start_date || !hireForm.job_title || !hireForm.work_location) {
      toast.error("Compila i campi obbligatori");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...hireForm,
        salary: hireForm.salary ? parseFloat(hireForm.salary) : null
      };
      await axios.post(`${API}/employees/hire-request`, payload, { headers });
      toast.success("Richiesta di assunzione inviata con successo!");
      setShowHireDialog(false);
      setHireForm({
        full_name: "",
        start_date: "",
        job_title: "",
        work_hours: "08:00-17:00",
        work_location: "",
        work_days: "Lunedì-Venerdì",
        salary: "",
        contract_type: "indeterminato",
        notes: ""
      });
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'invio della richiesta");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTerminationRequest = async (e) => {
    e.preventDefault();
    if (!terminateForm.termination_date) {
      toast.error("Inserisci la data di cessazione");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(
        `${API}/employees/${selectedEmployee.id}/terminate`,
        terminateForm,
        { headers }
      );
      toast.success("Richiesta di licenziamento inviata");
      setShowTerminateDialog(false);
      setSelectedEmployee(null);
      setTerminateForm({ reason: "", termination_date: "" });
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'invio della richiesta");
    } finally {
      setSubmitting(false);
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
      toast.success("Documento caricato con successo");
      setShowUploadDialog(false);
      setUploadForm({ document_type: "id_document", description: "", file: null });
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchEmployees();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nel caricamento");
    } finally {
      setSubmitting(false);
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

  const documentTypes = [
    { value: "id_document", label: "Documento di Identità" },
    { value: "nie", label: "NIE" },
    { value: "contract", label: "Contratto" },
    { value: "timesheet", label: "Registro Orario" },
    { value: "other", label: "Altro" }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">I Miei Dipendenti</h2>
          <p className="text-slate-600">Gestisci i tuoi dipendenti e richiedi assunzioni</p>
        </div>
        <Dialog open={showHireDialog} onOpenChange={setShowHireDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="hire-employee-btn">
              <Plus className="h-4 w-4 mr-2" />
              Richiedi Assunzione
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" />
                Richiedi Assunzione Dipendente
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleHireRequest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Nome Completo Dipendente *</Label>
                  <Input
                    value={hireForm.full_name}
                    onChange={(e) => setHireForm({ ...hireForm, full_name: e.target.value })}
                    placeholder="Mario Rossi"
                    required
                    data-testid="hire-fullname"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Inizio Lavoro *</Label>
                  <Input
                    type="date"
                    value={hireForm.start_date}
                    onChange={(e) => setHireForm({ ...hireForm, start_date: e.target.value })}
                    required
                    data-testid="hire-start-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mansione *</Label>
                  <Input
                    value={hireForm.job_title}
                    onChange={(e) => setHireForm({ ...hireForm, job_title: e.target.value })}
                    placeholder="Es: Cameriere, Cuoco..."
                    required
                    data-testid="hire-job-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Orario di Lavoro</Label>
                  <Input
                    value={hireForm.work_hours}
                    onChange={(e) => setHireForm({ ...hireForm, work_hours: e.target.value })}
                    placeholder="08:00-17:00"
                    data-testid="hire-work-hours"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Giorni Lavorativi</Label>
                  <Input
                    value={hireForm.work_days}
                    onChange={(e) => setHireForm({ ...hireForm, work_days: e.target.value })}
                    placeholder="Lunedì-Venerdì"
                    data-testid="hire-work-days"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Luogo di Lavoro *</Label>
                  <Input
                    value={hireForm.work_location}
                    onChange={(e) => setHireForm({ ...hireForm, work_location: e.target.value })}
                    placeholder="Indirizzo o nome azienda"
                    required
                    data-testid="hire-work-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo Contratto</Label>
                  <Select
                    value={hireForm.contract_type}
                    onValueChange={(v) => setHireForm({ ...hireForm, contract_type: v })}
                  >
                    <SelectTrigger data-testid="hire-contract-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indeterminato">Tempo Indeterminato</SelectItem>
                      <SelectItem value="determinato">Tempo Determinato</SelectItem>
                      <SelectItem value="stagionale">Stagionale</SelectItem>
                      <SelectItem value="part-time">Part-Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stipendio (€/mese)</Label>
                  <Input
                    type="number"
                    value={hireForm.salary}
                    onChange={(e) => setHireForm({ ...hireForm, salary: e.target.value })}
                    placeholder="1500"
                    data-testid="hire-salary"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Note Aggiuntive</Label>
                  <Textarea
                    value={hireForm.notes}
                    onChange={(e) => setHireForm({ ...hireForm, notes: e.target.value })}
                    placeholder="Altre informazioni utili..."
                    rows={3}
                    data-testid="hire-notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowHireDialog(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={submitting} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  {submitting ? "Invio..." : "Invia Richiesta"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {employees.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((employee) => (
            <Card 
              key={employee.id} 
              className={`bg-white border-2 ${
                employee.status === "active" ? "border-emerald-200" : 
                employee.status === "terminated" ? "border-red-200" : "border-amber-200"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
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
                      <h3 className="font-semibold text-slate-900">{employee.full_name}</h3>
                      <p className="text-sm text-slate-500">{employee.job_title}</p>
                    </div>
                  </div>
                  {getStatusBadge(employee.status)}
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-4 w-4" />
                    <span>Inizio: {employee.start_date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4" />
                    <span>{employee.work_location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="h-4 w-4" />
                    <span>{employee.work_hours} | {employee.work_days}</span>
                  </div>
                  {employee.documents && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <FileText className="h-4 w-4" />
                      <span>{employee.documents.length} documenti</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setShowUploadDialog(true);
                    }}
                    className="flex-1 border-teal-200 text-teal-600 hover:bg-teal-50"
                    data-testid={`upload-doc-${employee.id}`}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Carica Doc
                  </Button>
                  {employee.status === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowTerminateDialog(true);
                      }}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      data-testid={`terminate-${employee.id}`}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Nessun dipendente</h3>
            <p className="text-slate-500 mb-4">
              Non hai ancora dipendenti registrati. Clicca "Richiedi Assunzione" per iniziare.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog Upload Documento */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-teal-500" />
              Carica Documento per {selectedEmployee?.full_name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDocumentUpload} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo Documento *</Label>
              <Select
                value={uploadForm.document_type}
                onValueChange={(v) => setUploadForm({ ...uploadForm, document_type: v })}
              >
                <SelectTrigger data-testid="upload-doc-type">
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
              <Label>Descrizione (opzionale)</Label>
              <Input
                value={uploadForm.description}
                onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                placeholder="Es: Passaporto fronte/retro"
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
                data-testid="upload-file-input"
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

      {/* Dialog Richiesta Licenziamento */}
      <Dialog open={showTerminateDialog} onOpenChange={setShowTerminateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserX className="h-5 w-5" />
              Richiedi Licenziamento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleTerminationRequest} className="space-y-4">
            <div className="p-3 bg-red-50 rounded-lg border border-red-100">
              <p className="text-sm text-red-700">
                Stai richiedendo il licenziamento di <strong>{selectedEmployee?.full_name}</strong>
              </p>
            </div>
            <div className="space-y-2">
              <Label>Data Cessazione *</Label>
              <Input
                type="date"
                value={terminateForm.termination_date}
                onChange={(e) => setTerminateForm({ ...terminateForm, termination_date: e.target.value })}
                required
                data-testid="terminate-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo (opzionale)</Label>
              <Textarea
                value={terminateForm.reason}
                onChange={(e) => setTerminateForm({ ...terminateForm, reason: e.target.value })}
                placeholder="Motivo del licenziamento..."
                rows={3}
                data-testid="terminate-reason"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTerminateDialog(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={submitting} className="bg-red-500 hover:bg-red-600 text-white">
                {submitting ? "Invio..." : "Invia Richiesta"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeManagementClient;
