import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Users, Search, FileText, ChevronRight, MessageCircle, 
  AlertCircle, Clock, CheckCircle, FileCheck, RefreshCw,
  ArrowLeft, User, Calendar, Send, Paperclip, Eye
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDeclarationsView = ({ token, user, onSelectDeclaration }) => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDeclarations, setClientDeclarations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    tipoCliente: '',
    hasPendingRequests: ''
  });

  useEffect(() => {
    fetchClientsWithDeclarations();
  }, []);

  const fetchClientsWithDeclarations = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/declarations/clients-with-declarations`;
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.tipoCliente) params.append('tipo_cliente', filters.tipoCliente);
      if (filters.hasPendingRequests === 'true') params.append('has_pending_requests', 'true');
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error('Errore caricamento clienti:', error);
      toast.error('Errore caricamento clienti');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDeclarations = async (clientId) => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns?client_id=${clientId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setClientDeclarations(data);
    } catch (error) {
      console.error('Errore caricamento dichiarazioni:', error);
    }
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    fetchClientDeclarations(client.client_id);
  };

  const handleBackToClients = () => {
    setSelectedClient(null);
    setClientDeclarations([]);
  };

  const getStatusBadge = (stato) => {
    // Codifica colore:
    // VERDE = presentata
    // GIALLO = pendente (bozza, inviata, doc_incompleta, in_revisione, pronta)
    // ROSSO = errata, non_presentare
    // GRIGIO = archiviata, eliminata
    const config = {
      bozza: { label: 'Bozza', color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: Clock },
      inviata: { label: 'Inviata', color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: Send },
      documentazione_incompleta: { label: 'Doc. Incompleta', color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: AlertCircle },
      in_revisione: { label: 'In Revisione', color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: Eye },
      pronta: { label: 'Pronta', color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: FileCheck },
      presentata: { label: 'Presentata', color: 'bg-green-100 text-green-700 border border-green-300', icon: CheckCircle },
      errata: { label: 'Errata', color: 'bg-red-100 text-red-700 border border-red-300', icon: AlertCircle },
      non_presentare: { label: 'Non Presentare', color: 'bg-red-100 text-red-700 border border-red-300', icon: AlertCircle },
      archiviata: { label: 'Archiviata', color: 'bg-slate-100 text-slate-600 border border-slate-300', icon: FileText },
      eliminata: { label: 'Eliminata', color: 'bg-slate-200 text-slate-500 border border-slate-300', icon: FileText }
    };
    const cfg = config[stato] || { label: stato, color: 'bg-gray-100 text-gray-600', icon: FileText };
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </Badge>
    );
  };

  const getClientTypeLabel = (tipo) => {
    const types = {
      autonomo: 'Autonomo',
      societa: 'Società',
      vivienda_vacacional: 'Vivienda Vacacional',
      persona_fisica: 'Persona Fisica'
    };
    return types[tipo] || tipo || 'N/D';
  };

  // Stats totali
  const totalStats = {
    totalClients: clients.length,
    totalDeclarations: clients.reduce((acc, c) => acc + c.total_declarations, 0),
    totalPending: clients.reduce((acc, c) => acc + c.total_richieste_pendenti, 0),
    totalUnread: clients.reduce((acc, c) => acc + c.unread_messages, 0)
  };

  // Vista Lista Clienti
  if (!selectedClient) {
    return (
      <div className="space-y-6" data-testid="admin-declarations-clients-view">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-50">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-slate-600" />
              <p className="text-2xl font-bold text-slate-900">{totalStats.totalClients}</p>
              <p className="text-sm text-slate-500">Clienti con Dichiarazioni</p>
            </CardContent>
          </Card>
          <Card className="bg-teal-50">
            <CardContent className="p-4 text-center">
              <FileText className="w-6 h-6 mx-auto mb-2 text-teal-600" />
              <p className="text-2xl font-bold text-teal-700">{totalStats.totalDeclarations}</p>
              <p className="text-sm text-slate-500">Totale Dichiarazioni</p>
            </CardContent>
          </Card>
          <Card className={`${totalStats.totalPending > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50'}`}>
            <CardContent className="p-4 text-center">
              <AlertCircle className={`w-6 h-6 mx-auto mb-2 ${totalStats.totalPending > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
              <p className={`text-2xl font-bold ${totalStats.totalPending > 0 ? 'text-yellow-700' : 'text-gray-500'}`}>{totalStats.totalPending}</p>
              <p className="text-sm text-slate-500">Richieste Pendenti</p>
            </CardContent>
          </Card>
          <Card className={`${totalStats.totalUnread > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
            <CardContent className="p-4 text-center">
              <MessageCircle className={`w-6 h-6 mx-auto mb-2 ${totalStats.totalUnread > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
              <p className={`text-2xl font-bold ${totalStats.totalUnread > 0 ? 'text-blue-700' : 'text-gray-500'}`}>{totalStats.totalUnread}</p>
              <p className="text-sm text-slate-500">Messaggi Non Letti</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtri */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Cerca cliente..."
                    className="pl-10"
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    onKeyPress={(e) => e.key === 'Enter' && fetchClientsWithDeclarations()}
                  />
                </div>
              </div>
              <Select 
                value={filters.tipoCliente || "all"} 
                onValueChange={(v) => setFilters({...filters, tipoCliente: v === "all" ? "" : v})}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="autonomo">Autonomo</SelectItem>
                  <SelectItem value="societa">Società</SelectItem>
                  <SelectItem value="vivienda_vacacional">Vivienda Vacacional</SelectItem>
                  <SelectItem value="persona_fisica">Persona Fisica</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={filters.hasPendingRequests || "all"} 
                onValueChange={(v) => setFilters({...filters, hasPendingRequests: v === "all" ? "" : v})}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Stato Richieste" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  <SelectItem value="true">Con richieste pendenti</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchClientsWithDeclarations}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Aggiorna
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista Clienti */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              Clienti con Dichiarazioni
              <Badge variant="outline" className="ml-2">{clients.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-500">Caricamento...</div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Nessun cliente con dichiarazioni trovato
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map(client => (
                  <div
                    key={client.client_id}
                    className="p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectClient(client)}
                    data-testid={`client-row-${client.client_id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{client.client_name}</h3>
                          <p className="text-sm text-slate-500">{client.client_email}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {getClientTypeLabel(client.tipo_cliente)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {/* Conteggio Dichiarazioni */}
                        <div className="text-center">
                          <p className="text-xl font-bold text-slate-700">{client.total_declarations}</p>
                          <p className="text-xs text-slate-500">Dichiarazioni</p>
                        </div>
                        
                        {/* Indicatori Stato */}
                        <div className="flex gap-2">
                          {client.declarations_inviate > 0 && (
                            <Badge className="bg-blue-100 text-blue-700">
                              {client.declarations_inviate} Inviate
                            </Badge>
                          )}
                          {client.declarations_in_revisione > 0 && (
                            <Badge className="bg-purple-100 text-purple-700">
                              {client.declarations_in_revisione} In Rev.
                            </Badge>
                          )}
                          {client.declarations_doc_incompleta > 0 && (
                            <Badge className="bg-yellow-100 text-yellow-700">
                              {client.declarations_doc_incompleta} Doc. Inc.
                            </Badge>
                          )}
                        </div>
                        
                        {/* Indicatori Alert */}
                        <div className="flex items-center gap-2">
                          {client.total_richieste_pendenti > 0 && (
                            <div className="flex items-center gap-1 text-yellow-600">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">{client.total_richieste_pendenti}</span>
                            </div>
                          )}
                          {client.unread_messages > 0 && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">{client.unread_messages}</span>
                            </div>
                          )}
                        </div>
                        
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista Dichiarazioni del Cliente Selezionato
  return (
    <div className="space-y-6" data-testid="admin-declarations-client-detail">
      {/* Header con info cliente */}
      <Card className="bg-gradient-to-r from-teal-50 to-slate-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={handleBackToClients}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna ai Clienti
              </Button>
              <div className="h-8 w-px bg-slate-200" />
              <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center">
                <User className="w-7 h-7 text-teal-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedClient.client_name}</h2>
                <p className="text-slate-500">{selectedClient.client_email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-teal-600">{selectedClient.total_declarations}</p>
                <p className="text-sm text-slate-500">Dichiarazioni</p>
              </div>
              {selectedClient.total_richieste_pendenti > 0 && (
                <Badge className="bg-yellow-100 text-yellow-700 text-lg px-3 py-1">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {selectedClient.total_richieste_pendenti} Richieste Pendenti
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista Dichiarazioni */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            Dichiarazioni di {selectedClient.client_name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientDeclarations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              Nessuna dichiarazione trovata per questo cliente
            </div>
          ) : (
            <div className="space-y-4">
              {clientDeclarations.map(decl => (
                <div
                  key={decl.id}
                  className="p-4 border rounded-lg hover:border-teal-300 hover:bg-teal-50/50 cursor-pointer transition-all"
                  onClick={() => onSelectDeclaration(decl)}
                  data-testid={`declaration-row-${decl.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          Dichiarazione Redditi {decl.anno_fiscale}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          {getStatusBadge(decl.stato)}
                          {decl.has_authorization && (
                            <Badge className="bg-green-50 text-green-700 border border-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Firmata
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      {/* Indicatori Sezioni */}
                      <div className="flex gap-1">
                        {decl.has_rentas_trabajo && (
                          <Badge variant="outline" className="text-xs">Lavoro</Badge>
                        )}
                        {decl.has_autonomo && (
                          <Badge variant="outline" className="text-xs">Autonomo</Badge>
                        )}
                        {decl.has_inmuebles && (
                          <Badge variant="outline" className="text-xs">Immobili</Badge>
                        )}
                        {decl.has_criptomonedas && (
                          <Badge variant="outline" className="text-xs">Crypto</Badge>
                        )}
                      </div>
                      
                      {/* Documenti */}
                      <div className="flex items-center gap-1 text-slate-500">
                        <Paperclip className="w-4 h-4" />
                        <span className="text-sm">{decl.documentos_count}</span>
                      </div>
                      
                      {/* Richieste pendenti */}
                      {decl.richieste_pendenti > 0 && (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {decl.richieste_pendenti} Richieste
                        </Badge>
                      )}
                      
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizza
                      </Button>
                    </div>
                  </div>
                  
                  {/* Data ultima modifica */}
                  <div className="mt-3 pt-3 border-t text-xs text-slate-400">
                    Ultima modifica: {new Date(decl.updated_at).toLocaleString('it-IT')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDeclarationsView;
