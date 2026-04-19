/**
 * Dichiarazioni dei Redditi - Pagina Cliente
 * Nuova implementazione v2 - Pulita e modulare
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  FileText, 
  ChevronRight, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Send,
  Edit,
  Eye,
  Calendar
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useLanguage } from '@/i18n/LanguageContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Colori stati
const STATUS_CONFIG = {
  bozza: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Bozza', icon: Edit },
  inviata: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Inviata', icon: Send },
  documentazione_incompleta: { color: 'bg-orange-100 text-orange-800 border-orange-300', label: 'Documentazione Incompleta', icon: AlertCircle },
  in_revisione: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'In Revisione', icon: Clock },
  pronta: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Pronta', icon: CheckCircle },
  presentata: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Presentata', icon: CheckCircle },
  rifiutata: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Rifiutata', icon: AlertCircle },
};

const ClientDeclarationsPage = ({ token }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [declarations, setDeclarations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newYear, setNewYear] = useState(new Date().getFullYear() - 1);
  const [creating, setCreating] = useState(false);

  const fetchDeclarations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/declarations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeclarations(data);
      }
    } catch (error) {
      console.error('Errore caricamento dichiarazioni:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDeclarations();
  }, [fetchDeclarations]);

  const createDeclaration = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/declarations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          anno_fiscale: newYear,
          tipo_dichiarazione: 'redditi'
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Dichiarazione creata con successo');
        setShowNewModal(false);
        navigate(`/declarations/${data.id}`);
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Errore nella creazione');
      }
    } catch (error) {
      toast.error('Errore di connessione');
    } finally {
      setCreating(false);
    }
  };

  const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.bozza;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Dichiarazione dei Redditi
          </h1>
          <p className="text-slate-600 mt-1">
            Gestisci le tue dichiarazioni fiscali
          </p>
        </div>
        <Button 
          onClick={() => setShowNewModal(true)}
          className="bg-teal-600 hover:bg-teal-700"
          data-testid="new-declaration-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuova Dichiarazione
        </Button>
      </div>

      {/* Lista Dichiarazioni */}
      {declarations.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Nessuna dichiarazione
            </h3>
            <p className="text-slate-500 mb-4">
              Non hai ancora creato nessuna dichiarazione dei redditi.
            </p>
            <Button 
              onClick={() => setShowNewModal(true)}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crea la tua prima dichiarazione
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {declarations.map((decl) => (
            <Card 
              key={decl.id}
              className="hover:border-teal-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate(`/declarations/${decl.id}`)}
              data-testid={`declaration-card-${decl.id}`}
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Info principale */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">
                        Dichiarazione {decl.anno_fiscale}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <StatusBadge status={decl.status} />
                        <span className="text-sm text-slate-500">
                          {decl.completion_percentage}% completato
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress e azioni */}
                  <div className="flex items-center gap-4">
                    {/* Progress bar */}
                    <div className="hidden md:block w-32">
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-teal-500 transition-all"
                          style={{ width: `${decl.completion_percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Badge notifiche */}
                    {decl.pending_integration_requests > 0 && (
                      <Badge variant="destructive" className="animate-pulse">
                        {decl.pending_integration_requests} richieste
                      </Badge>
                    )}

                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>

                {/* Info aggiuntive */}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Creata: {new Date(decl.created_at).toLocaleDateString('it-IT')}
                  </span>
                  {decl.submitted_at && (
                    <span className="flex items-center gap-1">
                      <Send className="w-4 h-4" />
                      Inviata: {new Date(decl.submitted_at).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Nuova Dichiarazione */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Nuova Dichiarazione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Anno Fiscale
                </label>
                <select
                  value={newYear}
                  onChange={(e) => setNewYear(parseInt(e.target.value))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  data-testid="year-select"
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - 1 - i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>
              <p className="text-sm text-slate-500">
                Creerai una dichiarazione per i redditi dell'anno {newYear}.
              </p>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowNewModal(false)}
                  disabled={creating}
                >
                  Annulla
                </Button>
                <Button
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                  onClick={createDeclaration}
                  disabled={creating}
                  data-testid="create-declaration-btn"
                >
                  {creating ? 'Creazione...' : 'Crea Dichiarazione'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ClientDeclarationsPage;
