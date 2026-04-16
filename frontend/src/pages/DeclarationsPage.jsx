import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { 
  FileText, Plus, Search, Filter, Download, Eye, 
  CheckCircle, Clock, AlertCircle, Archive, RefreshCw,
  User, Calendar, FileCheck, ChevronRight, Building2,
  ArrowLeft, LogOut
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import TaxReturnFormWizard from '../components/TaxReturnFormWizard';
import AdminDeclarationsView from '../components/AdminDeclarationsView';
import DeclarationDetailView from '../components/DeclarationDetailView';
import LanguageSelector from '../components/LanguageSelector';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper per toast sicuro
const safeToastError = (msg) => {
  try {
    toast.error(String(msg || 'Errore'));
  } catch (e) {
    console.error('Error:', msg);
  }
};

const DeclarationsPage = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [declarationTypes, setDeclarationTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [taxReturns, setTaxReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showAdminDetail, setShowAdminDetail] = useState(false);
  const [filters, setFilters] = useState({
    anno: '',
    stato: '',
    search: ''
  });

  const isAdmin = ['commercialista', 'admin', 'super_admin'].includes(user?.role);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    fetchDeclarationTypes();
    fetchTaxReturns();
  }, []);

  const fetchDeclarationTypes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/types`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDeclarationTypes(data);
      if (data.length > 0) {
        setSelectedType(data[0]);
      }
    } catch (error) {
      console.error('Errore caricamento tipi:', error);
    }
  };

  const fetchTaxReturns = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/declarations/tax-returns`;
      const params = new URLSearchParams();
      if (filters.anno) params.append('anno_fiscale', filters.anno);
      if (filters.stato) params.append('stato', filters.stato);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      // Sanitizza i dati per evitare problemi di serializzazione
      setTaxReturns(JSON.parse(JSON.stringify(data)));
    } catch (error) {
      console.error('Errore caricamento pratiche:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewReturn = async () => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          anno_fiscale: 2025,
          tipo_dichiarazione: 'individual'
        })
      });
      
      // Clone per gestire errori
      const resClone = res.clone();
      
      if (!res.ok) {
        try {
          const errorData = await resClone.json();
          throw new Error(errorData.detail || `Errore HTTP ${res.status}`);
        } catch {
          throw new Error(`Errore HTTP ${res.status}`);
        }
      }
      
      const data = await res.json();
      
      toast.success('Pratica creata con successo');
      setSelectedReturn(data);
      setShowForm(true);
      fetchTaxReturns();
    } catch (error) {
      console.error('createNewReturn error:', error);
      safeToastError(error.message || 'Errore creazione pratica');
    }
  };

  const openReturn = async (returnId) => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${returnId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        // Leggi l'errore come testo prima
        let errorMessage = `Errore HTTP ${res.status}`;
        try {
          const errorText = await res.text();
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // Ignora errori di parsing
        }
        safeToastError(String(errorMessage));
        return;
      }
      
      // Leggi come testo e poi parse per evitare problemi di serializzazione
      const responseText = await res.text();
      const data = JSON.parse(responseText);
      
      // Sanitizza ulteriormente i dati
      const sanitizedData = JSON.parse(JSON.stringify(data));
      
      setSelectedReturn(sanitizedData);
      if (isAdmin) {
        setShowAdminDetail(true);
      } else {
        setShowForm(true);
      }
    } catch (error) {
      console.error('openReturn error:', error);
      // Assicurati che il toast riceva sempre una stringa
      const errorMsg = error instanceof Error ? error.message : String(error);
      safeToastError(errorMsg || 'Errore caricamento pratica');
    }
  };

  // Callback per admin quando seleziona dichiarazione dalla vista clienti
  const handleSelectDeclaration = async (decl) => {
    await openReturn(decl.id);
  };

  // Ricarica dichiarazione dopo modifica
  const reloadDeclaration = async () => {
    if (selectedReturn?.id) {
      await openReturn(selectedReturn.id);
    }
  };

  const downloadAuthPdf = async (returnId) => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${returnId}/authorization-pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        // Clona la response per poter leggere il JSON in caso di errore
        const errorData = await res.clone().json().catch(() => ({ detail: 'Errore download PDF' }));
        throw new Error(errorData.detail || 'Errore download');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autorizzazione_${returnId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      safeToastError(error.message);
    }
  };

  const getStatusBadge = (stato) => {
    const statusConfig = {
      bozza: { label: 'Bozza', color: 'bg-gray-100 text-gray-700' },
      inviata: { label: 'Inviata', color: 'bg-blue-100 text-blue-700' },
      documentazione_incompleta: { label: 'Doc. Incompleta', color: 'bg-yellow-100 text-yellow-700' },
      in_revisione: { label: 'In Revisione', color: 'bg-purple-100 text-purple-700' },
      pronta: { label: 'Pronta', color: 'bg-teal-100 text-teal-700' },
      presentata: { label: 'Presentata', color: 'bg-green-100 text-green-700' },
      archiviata: { label: 'Archiviata', color: 'bg-slate-100 text-slate-700' }
    };
    const config = statusConfig[stato] || { label: stato, color: 'bg-gray-100' };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredReturns = taxReturns.filter(tr => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!tr.client_name?.toLowerCase().includes(search) && 
          !tr.client_email?.toLowerCase().includes(search)) {
        return false;
      }
    }
    return true;
  });

  // Stats
  const stats = {
    totale: taxReturns.length,
    bozza: taxReturns.filter(t => t.stato === 'bozza').length,
    inviata: taxReturns.filter(t => t.stato === 'inviata').length,
    in_revisione: taxReturns.filter(t => t.stato === 'in_revisione').length,
    presentata: taxReturns.filter(t => t.stato === 'presentata').length
  };

  // Vista Admin: Dettaglio Dichiarazione
  if (isAdmin && showAdminDetail && selectedReturn) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/admin")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <div className="h-6 w-px bg-slate-200" />
              <h1 className="text-xl font-bold text-slate-900">Dichiarazioni</h1>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <Badge variant="outline" className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {user?.full_name || user?.email}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <DeclarationDetailView
            declaration={selectedReturn}
            token={token}
            user={user}
            onBack={() => {
              setShowAdminDetail(false);
              setSelectedReturn(null);
            }}
            onUpdate={reloadDeclaration}
          />
        </main>
      </div>
    );
  }

  // Vista Cliente: Form Dichiarazione
  if (showForm && selectedReturn) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(isAdmin ? "/admin" : "/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <div className="h-6 w-px bg-slate-200" />
              <h1 className="text-xl font-bold text-slate-900">Dichiarazioni</h1>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <Badge variant="outline" className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {user?.full_name || user?.email}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <TaxReturnFormWizard 
            taxReturn={selectedReturn}
            token={token}
            user={user}
            onBack={() => {
              setShowForm(false);
              setSelectedReturn(null);
              fetchTaxReturns();
            }}
            onUpdate={(updated) => setSelectedReturn(updated)}
          />
        </main>
      </div>
    );
  }

  // Vista Admin: Lista Clienti con Dichiarazioni
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/admin")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <div className="h-6 w-px bg-slate-200" />
              <h1 className="text-xl font-bold text-slate-900">Dichiarazioni</h1>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <Badge variant="outline" className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {user?.full_name || user?.email}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">
          <AdminDeclarationsView
            token={token}
            user={user}
            onSelectDeclaration={handleSelectDeclaration}
          />
        </main>
      </div>
    );
  }

  // Vista Cliente: Lista proprie dichiarazioni
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate(isAdmin ? "/admin" : "/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div className="h-6 w-px bg-slate-200" />
            <h1 className="text-xl font-bold text-slate-900">Dichiarazioni</h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Badge variant="outline" className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {user?.full_name || user?.email}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6" data-testid="declarations-page">
      {/* Section Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-slate-500">Gestione dichiarazioni fiscali</p>
        </div>
        {!isAdmin && (
          <Button onClick={createNewReturn} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuova Dichiarazione
          </Button>
        )}
      </div>

      {/* Tipi dichiarazione */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {declarationTypes.map(type => (
          <Card 
            key={type.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedType?.id === type.id ? 'ring-2 ring-teal-500' : ''
            }`}
            onClick={() => setSelectedType(type)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${type.color}20` }}
              >
                <FileText className="w-5 h-5" style={{ color: type.color }} />
              </div>
              <div>
                <p className="font-medium text-slate-900">{type.name}</p>
                <p className="text-xs text-slate-500">{type.description?.substring(0, 30)}...</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {isAdmin && (
          <Card className="cursor-pointer border-dashed hover:border-teal-500 transition-colors">
            <CardContent className="p-4 flex items-center justify-center gap-2 text-slate-500 hover:text-teal-600">
              <Plus className="w-5 h-5" />
              <span>Nuovo Tipo</span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Stats Cards (solo admin) */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-slate-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{stats.totale}</p>
              <p className="text-sm text-slate-500">Totale Pratiche</p>
            </CardContent>
          </Card>
          <Card className="bg-gray-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-600">{stats.bozza}</p>
              <p className="text-sm text-slate-500">In Bozza</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.inviata}</p>
              <p className="text-sm text-slate-500">Inviate</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.in_revisione}</p>
              <p className="text-sm text-slate-500">In Revisione</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.presentata}</p>
              <p className="text-sm text-slate-500">Presentate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtri */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Cerca per cliente..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </div>
            </div>
            <Select value={filters.anno || "all"} onValueChange={(v) => setFilters({...filters, anno: v === "all" ? "" : v})}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Anno fiscale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli anni</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.stato || "all"} onValueChange={(v) => setFilters({...filters, stato: v === "all" ? "" : v})}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stato pratica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="bozza">Bozza</SelectItem>
                <SelectItem value="inviata">Inviata</SelectItem>
                <SelectItem value="documentazione_incompleta">Doc. Incompleta</SelectItem>
                <SelectItem value="in_revisione">In Revisione</SelectItem>
                <SelectItem value="pronta">Pronta</SelectItem>
                <SelectItem value="presentata">Presentata</SelectItem>
                <SelectItem value="archiviata">Archiviata</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchTaxReturns}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Aggiorna
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista pratiche */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-600" />
            {selectedType?.name || 'Dichiarazione dei Redditi'}
            <Badge variant="outline" className="ml-2">{filteredReturns.length} pratiche</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Caricamento...</div>
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nessuna pratica trovata</p>
              {!isAdmin && (
                <Button onClick={createNewReturn} variant="outline" className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Crea la tua prima dichiarazione
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReturns.map(tr => (
                <div 
                  key={tr.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => openReturn(tr.id)}
                  data-testid={`tax-return-item-${tr.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {isAdmin ? tr.client_name : `Dichiarazione ${tr.anno_fiscale}`}
                        </span>
                        {getStatusBadge(tr.stato)}
                        {tr.tipo_dichiarazione === 'conjunta' && (
                          <Badge variant="outline">Congiunta</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                        {isAdmin && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {tr.client_email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Anno {tr.anno_fiscale}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileCheck className="w-3 h-3" />
                          {tr.documentos_count} documenti
                        </span>
                      </div>
                      {/* Indicatori sezioni */}
                      <div className="flex gap-1 mt-2">
                        {tr.has_rentas_trabajo && (
                          <Badge variant="outline" className="text-xs">Lavoro</Badge>
                        )}
                        {tr.has_autonomo && (
                          <Badge variant="outline" className="text-xs">Autonomo</Badge>
                        )}
                        {tr.has_inmuebles && (
                          <Badge variant="outline" className="text-xs">Immobili</Badge>
                        )}
                        {tr.has_criptomonedas && (
                          <Badge variant="outline" className="text-xs bg-orange-50">Crypto</Badge>
                        )}
                        {tr.has_deducciones_canarias && (
                          <Badge variant="outline" className="text-xs bg-teal-50">Ded. Canarie</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tr.richieste_pendenti > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-700">
                        {tr.richieste_pendenti} richieste
                      </Badge>
                    )}
                    {tr.has_authorization && isAdmin && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAuthPdf(tr.id);
                        }}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </main>
    </div>
  );
};

export default DeclarationsPage;
