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
import { toast } from '@/components/ui/sonner';
import { 
  Briefcase, 
  Plus, 
  Trash2, 
  Users,
  Save,
  X,
  CheckCircle2,
  Copy
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
  const [createResult, setCreateResult] = useState(null);
  
  const [createForm, setCreateForm] = useState({
    email: "",
    full_name: "",
    password: ""
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
    if (!createForm.email || !createForm.full_name || !createForm.password) {
      toast.error("Compila tutti i campi");
      return;
    }
    if (createForm.password.length < 6) {
      toast.error("La password deve essere di almeno 6 caratteri");
      return;
    }
    setCreating(true);
    setCreateResult(null);
    try {
      const response = await axios.post(`${API}/consulenti`, createForm, { headers });
      toast.success(`Consulente ${createForm.full_name} creato con successo!`);
      setCreateResult({
        email: createForm.email,
        full_name: createForm.full_name,
        password: createForm.password
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nella creazione del consulente");
    } finally {
      setCreating(false);
    }
  };

  const closeCreateDialog = () => {
    setShowCreateDialog(false);
    setCreateResult(null);
    setCreateForm({ email: "", full_name: "", password: "" });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copiato negli appunti!");
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
        <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) closeCreateDialog(); else setShowCreateDialog(true); }}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-500 hover:bg-indigo-600 active:bg-slate-900 active:scale-95 text-white transition-all" data-testid="create-consulente-btn">
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
            
            {createResult ? (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Consulente creato!</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Account creato per <strong>{createResult.full_name}</strong>
                  </p>
                </div>
                
                <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="font-medium text-slate-700">Credenziali di accesso:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Email:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-white px-2 py-1 rounded border">{createResult.email}</code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(createResult.email);
                            toast.success("Email copiata!");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Password:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-white px-2 py-1 rounded border">{createResult.password}</code>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(createResult.password);
                            toast.success("Password copiata!");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Comunica queste credenziali al consulente in modo sicuro.
                  </p>
                </div>
                
                <DialogFooter>
                  <Button onClick={closeCreateDialog} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white">
                    Chiudi
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleCreateConsulente} className="space-y-4">
                <p className="text-sm text-slate-600">
                  Crea un account per il consulente del lavoro. Le credenziali verranno mostrate dopo la creazione.
                </p>
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                    placeholder="Mario Rossi"
                    className="border-slate-200"
                    required
                    data-testid="consulente-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email (sarà l'account) *</Label>
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="consulente@email.com"
                    className="border-slate-200"
                    required
                    data-testid="consulente-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="text"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Minimo 6 caratteri"
                    className="border-slate-200"
                    required
                    minLength={6}
                    data-testid="consulente-password-input"
                  />
                  <p className="text-xs text-slate-500">La password sarà visibile per poterla comunicare al consulente</p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeCreateDialog}>
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="bg-indigo-500 hover:bg-indigo-600 active:bg-slate-900 active:scale-95 text-white transition-all"
                    data-testid="create-consulente-submit-btn"
                  >
                    {creating ? "Creazione..." : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Crea Consulente
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}
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
                    data-testid={`delete-consulente-${consulente.id}`}
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
