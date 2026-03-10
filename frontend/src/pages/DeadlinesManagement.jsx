import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { 
  ArrowLeft, 
  Calendar,
  Plus,
  Bell,
  Send,
  Users,
  Tag,
  Repeat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Trash2
} from "lucide-react";

const DeadlinesManagement = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [deadlines, setDeadlines] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  
  const [form, setForm] = useState({
    title: "",
    description: "",
    due_date: "",
    category: "IGIC",
    priority: "normale",
    is_recurring: false,
    recurrence_type: "trimestrale",
    recurrence_end_date: "",
    list_ids: [],
    send_notification: true,
    send_reminders: true
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [deadlinesRes, listsRes] = await Promise.all([
        axios.get(`${API}/deadlines`, { headers }),
        axios.get(`${API}/client-lists`, { headers })
      ]);
      setDeadlines(deadlinesRes.data);
      setLists(listsRes.data);
    } catch (error) {
      toast.error("Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.title.trim() || !form.due_date) {
      toast.error("Titolo e data scadenza sono obbligatori");
      return;
    }
    
    if (form.list_ids.length === 0) {
      toast.error("Seleziona almeno una lista di clienti");
      return;
    }
    
    setSaving(true);
    try {
      const deadlineData = {
        ...form,
        client_ids: [],
        applies_to_all: false,
        status: "da_fare",
        reminder_days: [7, 3, 1, 0]
      };
      
      await axios.post(`${API}/deadlines`, deadlineData, { headers });
      
      let message = "Scadenza creata per le categorie selezionate";
      if (form.is_recurring) message += ` (ricorrente ${form.recurrence_type})`;
      if (form.send_notification) message += " - Notifiche inviate!";
      toast.success(message);
      
      setForm({
        title: "",
        description: "",
        due_date: "",
        category: "IGIC",
        priority: "normale",
        is_recurring: false,
        recurrence_type: "trimestrale",
        recurrence_end_date: "",
        list_ids: [],
        send_notification: true,
        send_reminders: true
      });
      
      fetchData();
    } catch (error) {
      toast.error("Errore nella creazione della scadenza");
    } finally {
      setSaving(false);
    }
  };

  const handleSendAllReminders = async () => {
    setSendingReminders(true);
    try {
      const response = await axios.post(`${API}/deadlines/send-reminders`, {}, { headers });
      if (response.data.success) {
        toast.success(`Promemoria inviati: ${response.data.reminders_sent}`);
      }
    } catch (error) {
      toast.error("Errore nell'invio dei promemoria");
    } finally {
      setSendingReminders(false);
    }
  };

  const toggleListSelection = (listId) => {
    if (form.list_ids.includes(listId)) {
      setForm({ ...form, list_ids: form.list_ids.filter(id => id !== listId) });
    } else {
      setForm({ ...form, list_ids: [...form.list_ids, listId] });
    }
  };

  const deleteDeadline = async (id) => {
    if (!confirm("Sei sicuro di voler eliminare questa scadenza?")) return;
    try {
      await axios.delete(`${API}/deadlines/${id}`, { headers });
      toast.success("Scadenza eliminata");
      fetchData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  // Filtra scadenze per categorie (non singoli clienti)
  const listDeadlines = deadlines.filter(d => d.list_ids && d.list_ids.length > 0);

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
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/admin")}
              className="text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <span className="font-heading font-bold text-xl text-slate-900">Scadenze per Categorie</span>
              <span className="text-xs text-slate-500 block">Gestisci scadenze ricorrenti per gruppi di clienti</span>
            </div>
          </div>
          <Button 
            onClick={handleSendAllReminders}
            disabled={sendingReminders}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            <Bell className="h-4 w-4 mr-2" />
            {sendingReminders ? "Invio..." : "Invia Promemoria Ora"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Create Form */}
        <Card className="bg-white border border-slate-200">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-teal-500" />
              Crea Scadenza per Categorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Titolo *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({...form, title: e.target.value})}
                    placeholder="Es: Dichiarazione IGIC Q1"
                    className="border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Scadenza *</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({...form, due_date: e.target.value})}
                    className="border-slate-200"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Descrizione</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Descrizione della scadenza..."
                  rows={2}
                  className="border-slate-200"
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IGIC">IGIC</SelectItem>
                      <SelectItem value="IRPF">IRPF</SelectItem>
                      <SelectItem value="Impuesto Sociedades">Impuesto Sociedades</SelectItem>
                      <SelectItem value="IVA">IVA</SelectItem>
                      <SelectItem value="Altro">Altro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priorità</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v})}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bassa">Bassa</SelectItem>
                      <SelectItem value="normale">Normale</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Categorie di clienti */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-teal-500" />
                  Seleziona Categorie Clienti *
                </Label>
                <div className="grid md:grid-cols-3 gap-3">
                  {lists.map((list) => (
                    <div 
                      key={list.id}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        form.list_ids.includes(list.id)
                          ? "border-teal-500 bg-teal-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => toggleListSelection(list.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            form.list_ids.includes(list.id)
                              ? "border-teal-500 bg-teal-500"
                              : "border-slate-300"
                          }`}
                        >
                          {form.list_ids.includes(list.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: list.color }}
                        />
                        <div>
                          <p className="font-medium text-slate-900">{list.name}</p>
                          <p className="text-xs text-slate-500">{list.client_count} clienti</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {lists.length === 0 && (
                  <p className="text-slate-500 text-sm">
                    Nessuna lista creata. <a href="/admin/lists" className="text-teal-600 underline">Crea una lista</a>
                  </p>
                )}
              </div>
              
              {/* Opzioni ricorrenza */}
              <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.is_recurring}
                    onCheckedChange={(v) => setForm({...form, is_recurring: v})}
                    id="recurring"
                  />
                  <Label htmlFor="recurring" className="flex items-center gap-2 font-medium">
                    <Repeat className="h-4 w-4 text-purple-500" />
                    Scadenza ricorrente
                  </Label>
                </div>
                
                {form.is_recurring && (
                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label>Frequenza</Label>
                      <Select value={form.recurrence_type} onValueChange={(v) => setForm({...form, recurrence_type: v})}>
                        <SelectTrigger className="border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mensile">Mensile</SelectItem>
                          <SelectItem value="trimestrale">Trimestrale</SelectItem>
                          <SelectItem value="annuale">Annuale</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data fine (opzionale)</Label>
                      <Input
                        type="date"
                        value={form.recurrence_end_date}
                        onChange={(e) => setForm({...form, recurrence_end_date: e.target.value})}
                        className="border-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Opzioni notifiche */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.send_reminders}
                    onCheckedChange={(v) => setForm({...form, send_reminders: v})}
                    id="reminders"
                  />
                  <Label htmlFor="reminders" className="text-sm text-slate-600">
                    Promemoria automatici (7, 3, 1 giorni prima e giorno stesso)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.send_notification}
                    onCheckedChange={(v) => setForm({...form, send_notification: v})}
                    id="notification"
                  />
                  <Label htmlFor="notification" className="text-sm text-slate-600">
                    Invia notifica email immediata a tutti i clienti
                  </Label>
                </div>
              </div>
              
              <Button type="submit" disabled={saving} className="bg-teal-500 hover:bg-teal-600 text-white">
                <Calendar className="h-4 w-4 mr-2" />
                {saving ? "Creazione..." : "Crea Scadenza per Categorie"}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* List of deadlines for lists */}
        <Card className="bg-white border border-slate-200">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-teal-500" />
              Scadenze Assegnate a Categorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            {listDeadlines.length > 0 ? (
              <div className="space-y-3">
                {listDeadlines.map((deadline) => (
                  <div 
                    key={deadline.id} 
                    className="flex items-center justify-between p-4 bg-stone-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        deadline.status === 'completata' ? 'bg-green-500' :
                        deadline.status === 'scaduta' ? 'bg-red-500' :
                        deadline.status === 'in_lavorazione' ? 'bg-blue-500' :
                        'bg-amber-500'
                      }`}></div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{deadline.title}</p>
                          {deadline.is_recurring && (
                            <Badge className="bg-purple-50 text-purple-700 text-xs">
                              <Repeat className="h-3 w-3 mr-1" />
                              {deadline.recurrence_type}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{deadline.description}</p>
                        <div className="flex gap-1 mt-1">
                          {deadline.list_ids?.map((listId) => {
                            const list = lists.find(l => l.id === listId);
                            return list ? (
                              <Badge 
                                key={listId} 
                                className="text-xs"
                                style={{ backgroundColor: `${list.color}20`, color: list.color, borderColor: list.color }}
                              >
                                {list.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-teal-50 text-teal-700">
                        {format(parseISO(deadline.due_date), "d MMM yyyy", { locale: it })}
                      </Badge>
                      {deadline.send_reminders && (
                        <Badge className="bg-amber-50 text-amber-700">
                          <Bell className="h-3 w-3 mr-1" />
                          Promemoria attivi
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteDeadline(deadline.id)}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessuna scadenza assegnata a categorie</p>
                <p className="text-sm text-slate-400">Crea una scadenza per una o più categorie di clienti</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Info Box */}
        <Card className="bg-amber-50 border border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800">Come funzionano i promemoria automatici</h4>
                <ul className="text-sm text-amber-700 mt-2 space-y-1">
                  <li>• I promemoria vengono inviati 7, 3, 1 giorni prima e il giorno della scadenza</li>
                  <li>• Usa il pulsante "Invia Promemoria Ora" per inviare manualmente</li>
                  <li>• Le scadenze ricorrenti si rigenerano automaticamente dopo il completamento</li>
                  <li>• I clienti ricevono email personalizzate con i dettagli della scadenza</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DeadlinesManagement;
