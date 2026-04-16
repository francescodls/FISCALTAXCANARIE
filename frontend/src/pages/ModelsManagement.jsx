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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from '@/components/ui/sonner';
import { 
  ArrowLeft, 
  Plus,
  Edit,
  Trash2,
  Save,
  BookOpen,
  Video,
  X,
  ExternalLink
} from "lucide-react";

const ModelsManagement = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [modelli, setModelli] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingModello, setEditingModello] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    codice: "",
    nome: "",
    descrizione: "",
    a_cosa_serve: "",
    chi_deve_presentarlo: "",
    periodicita: "trimestrale",
    scadenza_tipica: "",
    documenti_necessari: [],
    note_operative: "",
    video_youtube: "",
    link_approfondimento: ""
  });
  
  const [newDocumento, setNewDocumento] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/modelli-tributari`, { headers });
      setModelli(response.data);
    } catch (error) {
      toast.error("Errore nel caricamento");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      codice: "",
      nome: "",
      descrizione: "",
      a_cosa_serve: "",
      chi_deve_presentarlo: "",
      periodicita: "trimestrale",
      scadenza_tipica: "",
      documenti_necessari: [],
      note_operative: "",
      video_youtube: "",
      link_approfondimento: ""
    });
    setNewDocumento("");
    setEditingModello(null);
  };

  const openEditDialog = (modello) => {
    setEditingModello(modello);
    setForm({
      codice: modello.codice || "",
      nome: modello.nome || "",
      descrizione: modello.descrizione || "",
      a_cosa_serve: modello.a_cosa_serve || "",
      chi_deve_presentarlo: modello.chi_deve_presentarlo || "",
      periodicita: modello.periodicita || "trimestrale",
      scadenza_tipica: modello.scadenza_tipica || "",
      documenti_necessari: modello.documenti_necessari || [],
      note_operative: modello.note_operative || "",
      video_youtube: modello.video_youtube || "",
      link_approfondimento: modello.link_approfondimento || ""
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!form.codice.trim() || !form.nome.trim()) {
      toast.error("Codice e nome sono obbligatori");
      return;
    }
    
    // Validazione URL link approfondimento
    if (form.link_approfondimento && form.link_approfondimento.trim()) {
      try {
        new URL(form.link_approfondimento.trim());
      } catch {
        toast.error("Il link di approfondimento non è un URL valido");
        return;
      }
    }
    
    setSaving(true);
    try {
      const dataToSend = {
        ...form,
        link_approfondimento: form.link_approfondimento?.trim() || null
      };
      
      if (editingModello) {
        await axios.put(`${API}/modelli-tributari/${editingModello.id}`, dataToSend, { headers });
        toast.success("Modello aggiornato");
      } else {
        await axios.post(`${API}/modelli-tributari`, dataToSend, { headers });
        toast.success("Modello creato");
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (modelloId) => {
    if (!confirm("Sei sicuro di voler eliminare questo modello tributario?")) return;
    
    try {
      await axios.delete(`${API}/modelli-tributari/${modelloId}`, { headers });
      toast.success("Modello eliminato");
      fetchData();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
    }
  };

  const addDocumento = () => {
    if (newDocumento.trim()) {
      setForm({ ...form, documenti_necessari: [...form.documenti_necessari, newDocumento.trim()] });
      setNewDocumento("");
    }
  };

  const removeDocumento = (index) => {
    setForm({ 
      ...form, 
      documenti_necessari: form.documenti_necessari.filter((_, i) => i !== index) 
    });
  };

  // Estrai thumbnail YouTube per anteprima
  const getYoutubeThumbnail = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
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
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/admin")}
              className="text-slate-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <span className="font-heading font-bold text-xl text-slate-900">Gestione Modelli Tributari</span>
              <span className="text-xs text-slate-500 block">Modifica i modelli frequenti per i tuoi clienti</span>
            </div>
          </div>
          <Button 
            onClick={openNewDialog}
            className="bg-teal-500 hover:bg-teal-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Modello
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modelli.map((modello) => (
            <Card key={modello.id} className="bg-white border border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-teal-500 text-white">{modello.codice}</Badge>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(modello)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => handleDelete(modello.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="font-heading text-lg mt-2">{modello.nome}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600 line-clamp-2">{modello.descrizione}</p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-50 text-blue-700 text-xs">
                    {modello.periodicita}
                  </Badge>
                  <Badge className="bg-amber-50 text-amber-700 text-xs">
                    {modello.scadenza_tipica}
                  </Badge>
                </div>
                {modello.video_thumbnail && (
                  <div className="relative">
                    <img 
                      src={modello.video_thumbnail}
                      alt="Video"
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <Video className="h-8 w-8 text-white drop-shadow-lg" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {modelli.length === 0 && (
            <Card className="col-span-full bg-white border border-slate-200">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Nessun modello tributario</p>
                <p className="text-sm text-slate-400">Crea il tuo primo modello tributario</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingModello ? "Modifica Modello Tributario" : "Nuovo Modello Tributario"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Codice *</Label>
                <Input
                  value={form.codice}
                  onChange={(e) => setForm({...form, codice: e.target.value})}
                  placeholder="Es: Modelo-303"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({...form, nome: e.target.value})}
                  placeholder="Es: IGIC Trimestrale"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea
                value={form.descrizione}
                onChange={(e) => setForm({...form, descrizione: e.target.value})}
                placeholder="Breve descrizione del modello..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>A cosa serve</Label>
              <Textarea
                value={form.a_cosa_serve}
                onChange={(e) => setForm({...form, a_cosa_serve: e.target.value})}
                placeholder="Spiegazione di cosa serve questo modello..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Chi deve presentarlo</Label>
              <Textarea
                value={form.chi_deve_presentarlo}
                onChange={(e) => setForm({...form, chi_deve_presentarlo: e.target.value})}
                placeholder="Chi è tenuto a presentare questo modello..."
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Periodicità</Label>
                <select
                  value={form.periodicita}
                  onChange={(e) => setForm({...form, periodicita: e.target.value})}
                  className="w-full border border-slate-200 rounded-md px-3 py-2"
                >
                  <option value="mensile">Mensile</option>
                  <option value="trimestrale">Trimestrale</option>
                  <option value="annuale">Annuale</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Scadenza tipica</Label>
                <Input
                  value={form.scadenza_tipica}
                  onChange={(e) => setForm({...form, scadenza_tipica: e.target.value})}
                  placeholder="Es: 20 del mese successivo"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Documenti necessari</Label>
              <div className="flex gap-2">
                <Input
                  value={newDocumento}
                  onChange={(e) => setNewDocumento(e.target.value)}
                  placeholder="Aggiungi documento..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDocumento())}
                />
                <Button type="button" onClick={addDocumento} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.documenti_necessari.map((doc, idx) => (
                  <Badge key={idx} className="bg-slate-100 text-slate-700 pr-1">
                    {doc}
                    <button
                      type="button"
                      onClick={() => removeDocumento(idx)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Note operative</Label>
              <Textarea
                value={form.note_operative}
                onChange={(e) => setForm({...form, note_operative: e.target.value})}
                placeholder="Note aggiuntive per i clienti..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Video className="h-4 w-4 text-red-500" />
                Video YouTube (opzionale)
              </Label>
              <Input
                value={form.video_youtube}
                onChange={(e) => setForm({...form, video_youtube: e.target.value})}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {getYoutubeThumbnail(form.video_youtube) && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 mb-1">Anteprima:</p>
                  <img 
                    src={getYoutubeThumbnail(form.video_youtube)}
                    alt="Anteprima video"
                    className="w-48 rounded-lg border border-slate-200"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-blue-500" />
                Link di Approfondimento (opzionale)
              </Label>
              <Input
                value={form.link_approfondimento}
                onChange={(e) => setForm({...form, link_approfondimento: e.target.value})}
                placeholder="https://esempio.com/guida-modello-303"
                type="url"
                data-testid="link-approfondimento-input"
              />
              <p className="text-xs text-slate-500">
                URL di una pagina esterna con spiegazioni dettagliate. Sarà visibile ai clienti come "Approfondisci".
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={saving} className="bg-teal-500 hover:bg-teal-600 text-white">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvataggio..." : "Salva"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModelsManagement;
