import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  Users,
  Save,
  X
} from "lucide-react";

const ConsulentiManagement = ({ token }) => {
  const [consulenti, setConsulenti] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedConsulente, setSelectedConsulente] = useState(null);
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    full_name: ""
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [consulentiRes, clientsRes] = await Promise.all([
        axios.get(`${API}/consulenti`, { headers }),
        axios.get(`${API}/clients`, { headers })
      ]);
      setConsulenti(consulentiRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConsulente = async (e) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password || !createForm.full_name) {
      toast.error("Compila tutti i campi");
      return;
    }
    setCreating(true);
    try {
      await axios.post(`${API}/consulenti`, createForm, { headers });
      toast.success("Consulente creato con successo");
      setCreateForm({ email: "", password: "", full_name: "" });
      setShowCreateDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nella creazione");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConsulente = async (consulenteId) => {
    if (!confirm("Sei sicuro di voler eliminare questo consulente?")) return;
    try {
      await axios.delete(`${API}/consulenti/${consulenteId}`, { headers });
      toast.success("Consulente eliminato");
      fetchData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const openAssignDialog = (consulente) => {
    setSelectedConsulente(consulente);
    setSelectedClientIds(consulente.assigned_clients || []);
    setShowAssignDialog(true);
  };

  const handleAssignClients = async () => {
    setAssigning(true);
    try {
      await axios.post(
        `${API}/consulenti/${selectedConsulente.id}/assign-clients`,
        { client_ids: selectedClientIds },
        { headers }
      );
      toast.success(`Clienti assegnati a ${selectedConsulente.full_name}`);
      setShowAssignDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'assegnazione");
    } finally {
      setAssigning(false);
    }
  };

  const toggleClientSelection = (clientId) => {
    if (selectedClientIds.includes(clientId)) {
      setSelectedClientIds(selectedClientIds.filter(id => id !== clientId));
    } else {
      setSelectedClientIds([...selectedClientIds, clientId]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">Consulenti del Lavoro</h2>
          <p className="text-slate-600">Gestisci i consulenti e assegna loro i clienti</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-500 hover:bg-indigo-600 text-white" data-testid="create-consulente-btn">
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Consulente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-indigo-500" />
                Crea Consulente del Lavoro
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateConsulente} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  placeholder="Mario Rossi"
                  className="border-slate-200"
                  required
                  data-testid="consulente-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="consulente@email.com"
                  className="border-slate-200"
                  required
                  data-testid="consulente-email"
                />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Password sicura"
                  className="border-slate-200"
                  required
                  data-testid="consulente-password"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white"
                >
                  {creating ? "Creazione..." : "Crea Consulente"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {consulenti.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {consulenti.map((consulente) => (
            <Card key={consulente.id} className="bg-white border border-slate-200">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{consulente.full_name}</h3>
                      <p className="text-sm text-slate-500">{consulente.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteConsulente(consulente.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-sm text-slate-600">
                      {consulente.assigned_clients?.length || 0} clienti assegnati
                    </span>
                  </div>
                  {consulente.assigned_clients?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {consulente.assigned_clients.slice(0, 3).map(cid => {
                        const client = clients.find(c => c.id === cid);
                        return client ? (
                          <Badge key={cid} className="bg-slate-100 text-slate-600 text-xs">
                            {client.full_name?.split(" ")[0]}
                          </Badge>
                        ) : null;
                      })}
                      {consulente.assigned_clients.length > 3 && (
                        <Badge className="bg-slate-100 text-slate-600 text-xs">
                          +{consulente.assigned_clients.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openAssignDialog(consulente)}
                  className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  data-testid={`assign-clients-${consulente.id}`}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Assegna Clienti
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-12 text-center">
            <Briefcase className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Nessun consulente</h3>
            <p className="text-slate-500 mb-4">
              Crea un consulente del lavoro per delegare la gestione delle buste paga.
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crea il primo consulente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog assegnazione clienti */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-500" />
              Assegna Clienti a {selectedConsulente?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {clients.length > 0 ? (
              <div className="space-y-2">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => toggleClientSelection(client.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedClientIds.includes(client.id)
                        ? "bg-indigo-50 border border-indigo-200"
                        : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <Checkbox
                      checked={selectedClientIds.includes(client.id)}
                      onCheckedChange={() => toggleClientSelection(client.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{client.full_name}</p>
                      <p className="text-sm text-slate-500">{client.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">Nessun cliente disponibile</p>
            )}
          </div>
          <DialogFooter className="border-t pt-4">
            <div className="flex items-center gap-2 mr-auto">
              <Badge className="bg-indigo-100 text-indigo-700">
                {selectedClientIds.length} selezionati
              </Badge>
            </div>
            <Button type="button" variant="outline" onClick={() => setShowAssignDialog(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleAssignClients}
              disabled={assigning}
              className="bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              {assigning ? "Salvataggio..." : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salva Assegnazioni
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConsulentiManagement;
