/**
 * Dichiarazioni dei Redditi - Dashboard Admin
 * Nuova implementazione v2
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search,
  Filter,
  FileText,
  User,
  Calendar,
  ChevronRight,
  Eye,
  Download,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  RefreshCw
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Configurazione stati
const STATUS_CONFIG = {
  bozza: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Bozza' },
  inviata: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Inviata' },
  documentazione_incompleta: { color: 'bg-orange-100 text-orange-800 border-orange-300', label: 'Doc. Incompleta' },
  in_revisione: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'In Revisione' },
  pronta: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Pronta' },
  presentata: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Presentata' },
  rifiutata: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Rifiutata' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Tutti gli stati' },
  { value: 'bozza', label: 'Bozza' },
  { value: 'inviata', label: 'Inviata' },
  { value: 'documentazione_incompleta', label: 'Doc. Incompleta' },
  { value: 'in_revisione', label: 'In Revisione' },
  { value: 'pronta', label: 'Pronta' },
  { value: 'presentata', label: 'Presentata' },
  { value: 'rifiutata', label: 'Rifiutata' },
];

const AdminDeclarationsPage = ({ token, user }) => {
  const [declarations, setDeclarations] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_status: {}, new_submissions: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [selectedDeclaration, setSelectedDeclaration] = useState(null);

  // Fetch dichiarazioni
  const fetchDeclarations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (yearFilter) params.append('anno', yearFilter);

      const res = await fetch(`${API_URL}/api/declarations/v2/admin/declarations?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeclarations(data);
      }
    } catch (error) {
      console.error('Errore caricamento:', error);
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, yearFilter]);

  // Fetch statistiche
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Errore stats:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchDeclarations();
    fetchStats();
  }, [fetchDeclarations, fetchStats]);

  // Fetch dettaglio dichiarazione
  const openDetail = async (declId) => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/declarations/${declId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedDeclaration(data);
      }
    } catch (error) {
      toast.error('Errore caricamento dettaglio');
    }
  };

  // Aggiorna stato
  const updateStatus = async (declId, newStatus, note = '') => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/admin/declarations/${declId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ new_status: newStatus, note })
      });
      if (res.ok) {
        toast.success('Stato aggiornato');
        fetchDeclarations();
        if (selectedDeclaration?.id === declId) {
          const updated = await res.json();
          setSelectedDeclaration(updated);
        }
      }
    } catch (error) {
      toast.error('Errore aggiornamento stato');
    }
  };

  const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.bozza;
    return (
      <Badge className={`${config.color} border`}>
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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-sm text-slate-500">Totale</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.new_submissions}</p>
            <p className="text-sm text-slate-500">Nuove (7gg)</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.pending_review || 0}</p>
            <p className="text-sm text-slate-500">Da Revisionare</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.by_status?.presentata || 0}</p>
            <p className="text-sm text-slate-500">Presentate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtri */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Cerca cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="search-declarations"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 border rounded-lg"
              data-testid="status-filter"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="p-2 border rounded-lg"
            >
              <option value="">Tutti gli anni</option>
              {[2024, 2023, 2022, 2021].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <Button variant="outline" onClick={fetchDeclarations}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista Dichiarazioni */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Dichiarazioni ({declarations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {declarations.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Nessuna dichiarazione trovata</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-slate-500">
                    <th className="pb-3 font-medium">Cliente</th>
                    <th className="pb-3 font-medium">Anno</th>
                    <th className="pb-3 font-medium">Stato</th>
                    <th className="pb-3 font-medium">Completamento</th>
                    <th className="pb-3 font-medium">Data</th>
                    <th className="pb-3 font-medium text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {declarations.map((decl) => (
                    <tr 
                      key={decl.id} 
                      className="border-b hover:bg-slate-50 cursor-pointer"
                      onClick={() => openDetail(decl.id)}
                      data-testid={`declaration-row-${decl.id}`}
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{decl.client_name}</p>
                            <p className="text-sm text-slate-500">{decl.client_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="font-mono">{decl.anno_fiscale}</span>
                      </td>
                      <td className="py-4">
                        <StatusBadge status={decl.status} />
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-teal-500"
                              style={{ width: `${decl.completion_percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-500">{decl.completion_percentage}%</span>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-slate-500">
                        {new Date(decl.updated_at).toLocaleDateString('it-IT')}
                      </td>
                      <td className="py-4 text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Dettaglio */}
      {selectedDeclaration && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-4xl my-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Dettaglio Dichiarazione</CardTitle>
                <p className="text-sm text-slate-500">
                  {selectedDeclaration.client_name} - Anno {selectedDeclaration.anno_fiscale}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDeclaration(null)}>
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Info e Stato */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Stato attuale</p>
                  <StatusBadge status={selectedDeclaration.status} />
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500 mb-1">Completamento</p>
                  <p className="text-2xl font-bold">{selectedDeclaration.completion_percentage}%</p>
                </div>
              </div>

              {/* Cambio Stato */}
              <div className="p-4 border rounded-lg">
                <p className="font-medium mb-3">Cambia Stato</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.filter(s => s.value).map(status => (
                    <Button
                      key={status.value}
                      variant={selectedDeclaration.status === status.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateStatus(selectedDeclaration.id, status.value)}
                      disabled={selectedDeclaration.status === status.value}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Sezioni compilate */}
              <div>
                <p className="font-medium mb-3">Sezioni Compilate</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(selectedDeclaration.sections || {}).map(([key, section]) => (
                    <div 
                      key={key}
                      className={`p-3 rounded-lg border text-sm ${
                        section.completed ? 'bg-green-50 border-green-200' :
                        section.not_applicable ? 'bg-slate-50 border-slate-200' :
                        'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {section.completed && <CheckCircle className="w-4 h-4 text-green-600" />}
                        {section.not_applicable && <X className="w-4 h-4 text-slate-400" />}
                        {!section.completed && !section.not_applicable && <Clock className="w-4 h-4 text-slate-400" />}
                        <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Azioni */}
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Scarica Documenti
                </Button>
                <Button variant="outline" className="flex-1">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Messaggi ({selectedDeclaration.messages_count})
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminDeclarationsPage;
