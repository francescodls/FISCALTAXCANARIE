import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  ArrowLeft, ArrowRight, Save, Send, CheckCircle, 
  User, Users, Briefcase, Building, Home, Euro, 
  Bitcoin, TrendingUp, Receipt, MapPin, FileText,
  Upload, Pen, AlertCircle, Check, X, Plus, Trash2,
  MessageSquare, FileUp, Eye, CreditCard, Clock, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import ClientIntegrationRequests from './ClientIntegrationRequests';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Sezioni del form
const SECTIONS = [
  { id: 'filtro', name: 'Introduzione', icon: CheckCircle, required: true },
  { id: 'datos_personales', name: 'Dati Personali', icon: User, required: true },
  { id: 'situacion_familiar', name: 'Situazione Familiare', icon: Users },
  { id: 'rentas_trabajo', name: 'Redditi da Lavoro', icon: Briefcase },
  { id: 'autonomo', name: 'Autónomo', icon: Building },
  { id: 'inmuebles', name: 'Immobili', icon: Home },
  { id: 'alquileres_cobrados', name: 'Canoni Locazione', icon: Euro },
  { id: 'alquiler_pagado', name: 'Affitto Pagato', icon: Home },
  { id: 'inversiones', name: 'Investimenti', icon: TrendingUp },
  { id: 'criptomonedas', name: 'Criptomonete', icon: Bitcoin },
  { id: 'ganancias_patrimoniales', name: 'Plusvalenze', icon: TrendingUp },
  { id: 'deducciones', name: 'Spese Deducibili', icon: Receipt },
  { id: 'deducciones_canarias', name: 'Deduzioni Canarie', icon: MapPin },
  { id: 'documentos', name: 'Documenti', icon: FileText },
  { id: 'comunicazioni', name: 'Richieste e Messaggi', icon: MessageSquare, showBadge: true },
  { id: 'notas', name: 'Note', icon: MessageSquare },
  { id: 'autorizacion', name: 'Autorizzazione', icon: Pen, required: true }
];

// Categorie documenti
const DOC_CATEGORIES = [
  { value: 'certificado_fiscal', label: 'Certificato Fiscale' },
  { value: 'nomina', label: 'Busta Paga' },
  { value: 'bancario', label: 'Documento Bancario' },
  { value: 'contrato', label: 'Contratto' },
  { value: 'factura', label: 'Fattura' },
  { value: 'crypto', label: 'Report Crypto' },
  { value: 'catastral', label: 'Documento Catastale' },
  { value: 'discapacidad', label: 'Certificato Disabilità' },
  { value: 'familiar', label: 'Documento Familiare' },
  { value: 'otro', label: 'Altro' }
];

const TaxReturnForm = ({ taxReturn, token, user, onBack, onUpdate }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState({
    secciones_habilitadas: taxReturn.secciones_habilitadas || {},
    datos_personales: taxReturn.datos_personales || {},
    situacion_familiar: taxReturn.situacion_familiar || {},
    rentas_trabajo: taxReturn.rentas_trabajo || {},
    autonomo: taxReturn.autonomo || {},
    inmuebles: taxReturn.inmuebles || { tiene_inmuebles: false, inmuebles: [], notas: '' },
    alquileres_cobrados: taxReturn.alquileres_cobrados || { tiene_alquileres: false, alquileres: [], notas: '' },
    alquiler_pagado: taxReturn.alquiler_pagado || {},
    inversiones: taxReturn.inversiones || { tiene_inversiones: false, inversiones: [], notas: '' },
    criptomonedas: taxReturn.criptomonedas || { tiene_criptomonedas: false, operaciones: [], notas: '' },
    ganancias_patrimoniales: taxReturn.ganancias_patrimoniales || { tiene_ganancias_patrimoniales: false, operaciones: [], notas: '' },
    deducciones: taxReturn.deducciones || {},
    deducciones_canarias: taxReturn.deducciones_canarias || {}
  });
  const [saving, setSaving] = useState(false);
  const [authText, setAuthText] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [documents, setDocuments] = useState(taxReturn.documentos || []);
  const [clientNotes, setClientNotes] = useState(taxReturn.notas_cliente || []);
  const [adminNotes, setAdminNotes] = useState(taxReturn.notas_admin || []);
  const [integrationRequests, setIntegrationRequests] = useState(taxReturn.richieste_integrazione || []);
  const [conversazione, setConversazione] = useState(taxReturn.conversazione || []);
  const [uploading, setUploading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newAdminNote, setNewAdminNote] = useState('');
  const [newIntegrationRequest, setNewIntegrationRequest] = useState({ seccion: '', mensaje: '' });
  const signatureRef = useRef(null);
  const fileInputRef = useRef(null);

  // Determina se l'utente è un admin (commercialista, admin, super_admin)
  const isAdmin = ['commercialista', 'admin', 'super_admin'].includes(user?.role);
  
  // Il cliente può editare se: non è admin E lo stato lo permette
  // Stati editabili: bozza, documentazione_incompleta
  // Se stato non definito, assumiamo che sia una nuova dichiarazione (editabile)
  const currentStatus = taxReturn?.stato || 'bozza';
  const isEditable = !isAdmin && ['bozza', 'documentazione_incompleta'].includes(currentStatus);
  
  // Debug log per capire lo stato
  useEffect(() => {
    console.log('TaxReturnForm - User role:', user?.role);
    console.log('TaxReturnForm - isAdmin:', isAdmin);
    console.log('TaxReturnForm - stato:', currentStatus);
    console.log('TaxReturnForm - isEditable:', isEditable);
  }, [user?.role, currentStatus]);

  useEffect(() => {
    fetchAuthText();
  }, []);

  const fetchAuthText = async () => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${taxReturn.id}/authorization-text`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAuthText(data.text);
    } catch (error) {
      console.error('Errore caricamento testo autorizzazione:', error);
    }
  };

  const saveSection = async (sectionName, data) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${taxReturn.id}/sections/${sectionName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.detail || 'Errore salvataggio');
      }
      
      toast.success('Sezione salvata');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSaveCurrentSection = async () => {
    const section = visibleSections[currentSection];
    if (section.id === 'filtro') {
      await saveSection('secciones_habilitadas', formData.secciones_habilitadas);
    } else if (section.id !== 'documentos' && section.id !== 'notas' && section.id !== 'autorizacion') {
      await saveSection(section.id, formData[section.id]);
    }
  };

  // Upload documento
  const handleUploadDocument = async (file, category, sectionId) => {
    setUploading(true);
    try {
      const formDataObj = new FormData();
      formDataObj.append('file', file);
      formDataObj.append('categoria', category);
      formDataObj.append('seccion', sectionId);

      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${taxReturn.id}/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataObj
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Errore upload');

      toast.success('Documento caricato');
      // Refresh documents
      setDocuments(prev => [...prev, { id: data.document_id, nombre: file.name, categoria: category, seccion: sectionId }]);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  // Aggiungi nota cliente
  const handleAddClientNote = async () => {
    if (!newNote.trim()) return;
    try {
      const formDataObj = new FormData();
      formDataObj.append('texto', newNote);
      formDataObj.append('seccion', visibleSections[currentSection]?.id || 'generale');

      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${taxReturn.id}/client-notes`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataObj
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Errore');

      toast.success('Nota aggiunta');
      setClientNotes(prev => [...prev, { id: data.note_id, texto: newNote, created_at: new Date().toISOString() }]);
      setNewNote('');
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Aggiungi nota admin
  const handleAddAdminNote = async () => {
    if (!newAdminNote.trim()) return;
    try {
      const formDataObj = new FormData();
      formDataObj.append('texto', newAdminNote);
      formDataObj.append('seccion', visibleSections[currentSection]?.id || 'generale');

      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${taxReturn.id}/admin-notes`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataObj
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Errore');

      toast.success('Nota interna aggiunta');
      setAdminNotes(prev => [...prev, { id: data.note_id, texto: newAdminNote, created_at: new Date().toISOString() }]);
      setNewAdminNote('');
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Invia richiesta integrazione (admin)
  const handleSendIntegrationRequest = async () => {
    if (!newIntegrationRequest.messaggio?.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${taxReturn.id}/integration-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          seccion: newIntegrationRequest.seccion || 'generale',
          mensaje: newIntegrationRequest.messaggio,
          documentos_richiesti: []
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Errore');

      toast.success('Richiesta inviata al cliente');
      setIntegrationRequests(prev => [...prev, { 
        id: data.request_id, 
        seccion: newIntegrationRequest.seccion,
        mensaje: newIntegrationRequest.messaggio,
        stato: 'pendente',
        created_at: new Date().toISOString()
      }]);
      setNewIntegrationRequest({ seccion: '', messaggio: '' });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSign = async () => {
    if (!consentAccepted) {
      toast.error('Devi accettare il consenso');
      return;
    }
    
    if (signatureRef.current?.isEmpty()) {
      toast.error('Devi apporre la firma');
      return;
    }

    const signatureData = signatureRef.current.toDataURL('image/png');
    
    try {
      const formDataObj = new FormData();
      formDataObj.append('consent_accepted', 'true');
      formDataObj.append('signature_data', signatureData);

      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${taxReturn.id}/sign`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataObj
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.detail || 'Errore firma');
      }
      
      toast.success('Autorizzazione firmata con successo!');
      onBack();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSubmit = async () => {
    if (!taxReturn.autorizacion?.signed_at) {
      toast.error('Devi prima firmare l\'autorizzazione');
      return;
    }

    try {
      const formDataObj = new FormData();
      formDataObj.append('nuovo_stato', 'inviata');

      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${taxReturn.id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formDataObj
      });
      
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.detail || 'Errore invio');
      }
      
      toast.success('Pratica inviata con successo!');
      onBack();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

  // Mostra TUTTE le sezioni (non più filtrate per checkbox)
  // L'admin vede tutto, il cliente può compilare tutto
  const visibleSections = SECTIONS;

  const currentSectionData = visibleSections[currentSection];

  // Componente riutilizzabile per upload documenti nella sezione
  const SectionDocuments = ({ sectionId, sectionName }) => {
    const sectionDocs = documents.filter(d => d.seccion === sectionId);
    const [selectedCategory, setSelectedCategory] = useState('otro');

    return (
      <div className="mt-6 p-4 bg-slate-50 rounded-lg">
        <h4 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
          <FileUp className="w-4 h-4" />
          Documenti per {sectionName}
        </h4>
        
        {sectionDocs.length > 0 && (
          <div className="mb-4 space-y-2">
            {sectionDocs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border">
                <span className="text-sm">{doc.nombre}</span>
                <Badge variant="outline">{DOC_CATEGORIES.find(c => c.value === doc.categoria)?.label || doc.categoria}</Badge>
              </div>
            ))}
          </div>
        )}

        {isEditable && (
          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.onchange = (e) => {
                  const file = e.target.files[0];
                  if (file) handleUploadDocument(file, selectedCategory, sectionId);
                };
                input.click();
              }}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Caricamento...' : 'Carica Documento'}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderSectionContent = () => {
    switch (currentSectionData?.id) {
      case 'filtro':
        return renderSectionFilter();
      case 'datos_personales':
        return renderPersonalData();
      case 'situacion_familiar':
        return renderFamilyData();
      case 'rentas_trabajo':
        return renderEmploymentData();
      case 'autonomo':
        return renderSelfEmploymentData();
      case 'inmuebles':
        return renderPropertiesData();
      case 'alquileres_cobrados':
        return renderRentalsReceivedData();
      case 'alquiler_pagado':
        return renderRentPaidData();
      case 'inversiones':
        return renderInvestmentsData();
      case 'criptomonedas':
        return renderCryptoData();
      case 'ganancias_patrimoniales':
        return renderCapitalGainsData();
      case 'deducciones':
        return renderDeductionsData();
      case 'deducciones_canarias':
        return renderCanaryDeductionsData();
      case 'documentos':
        return renderDocumentsSection();
      case 'comunicazioni':
        return renderCommunicationsSection();
      case 'notas':
        return renderNotesSection();
      case 'autorizacion':
        return renderAuthorization();
      default:
        return null;
    }
  };

  // Helper per formattare l'importo dell'onorario
  const formatFeeDisplay = () => {
    if (!taxReturn.declaration_fee) return null;
    const grossAmount = taxReturn.declaration_fee_gross_amount || taxReturn.declaration_fee;
    const netAmount = taxReturn.declaration_fee_net_amount;
    const taxAmount = taxReturn.declaration_fee_tax_amount;
    const taxType = taxReturn.declaration_fee_tax_type;
    
    if (taxAmount > 0) {
      const taxLabel = {
        'IGIC_7': 'IGIC 7%',
        'IVA_21': 'IVA 21%',
        'IVA_22': 'IVA 22%'
      }[taxType] || taxType;
      return {
        total: `€${grossAmount?.toFixed(2)}`,
        breakdown: `(Netto €${netAmount?.toFixed(2)} + ${taxLabel} €${taxAmount?.toFixed(2)})`
      };
    }
    return {
      total: `€${grossAmount?.toFixed(2)}`,
      breakdown: '(Esente IVA)'
    };
  };

  const renderSectionFilter = () => {
    const feeDisplay = formatFeeDisplay();
    
    return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Dichiarazione dei Redditi {taxReturn.anno_fiscale}
        </h3>
        <p className="text-slate-500">
          Compila le sezioni pertinenti alla tua situazione. Puoi navigare tra le sezioni usando i pulsanti in alto o "Precedente" / "Successivo".
        </p>
      </div>

      {/* Card Onorario Dichiarazione - visibile solo al cliente se impostato */}
      {!isAdmin && taxReturn.declaration_fee && (
        <Card className={`border-2 ${
          taxReturn.declaration_fee_status === 'paid' 
            ? 'border-green-300 bg-green-50' 
            : 'border-amber-300 bg-amber-50'
        }`}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${
                taxReturn.declaration_fee_status === 'paid' 
                  ? 'bg-green-100' 
                  : 'bg-amber-100'
              }`}>
                {taxReturn.declaration_fee_status === 'paid' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <CreditCard className="w-6 h-6 text-amber-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`font-semibold ${
                    taxReturn.declaration_fee_status === 'paid' 
                      ? 'text-green-800' 
                      : 'text-amber-800'
                  }`}>
                    Onorario Presentazione Dichiarazione
                  </h4>
                  <Badge className={
                    taxReturn.declaration_fee_status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : taxReturn.declaration_fee_status === 'notified'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                  }>
                    {taxReturn.declaration_fee_status === 'paid' ? 'Pagato' : 
                     taxReturn.declaration_fee_status === 'notified' ? 'Da pagare' : 'In attesa'}
                  </Badge>
                </div>
                
                <div className="mt-2">
                  <p className={`text-2xl font-bold ${
                    taxReturn.declaration_fee_status === 'paid' 
                      ? 'text-green-700' 
                      : 'text-amber-700'
                  }`}>
                    {feeDisplay?.total}
                  </p>
                  <p className="text-sm text-slate-500">{feeDisplay?.breakdown}</p>
                </div>
                
                {taxReturn.declaration_fee_notes && (
                  <p className="mt-2 text-sm text-slate-600 bg-white/50 p-2 rounded">
                    {taxReturn.declaration_fee_notes}
                  </p>
                )}
                
                {taxReturn.declaration_fee_notified_at && (
                  <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                    <Bell className="w-3 h-3" />
                    Comunicato il {new Date(taxReturn.declaration_fee_notified_at).toLocaleDateString('it-IT')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-teal-50 border-teal-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-teal-800 mb-3">Sezioni disponibili:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SECTIONS.filter(s => !s.required && s.id !== 'documentos' && s.id !== 'notas').map(section => (
              <div key={section.id} className="flex items-center gap-2 text-sm">
                <section.icon className="w-4 h-4 text-teal-600" />
                <span>{section.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-800 mb-2">Come procedere:</h4>
          <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
            <li>Compila i <strong>Dati Personali</strong> (obbligatori)</li>
            <li>Vai alle sezioni pertinenti e inserisci i tuoi dati</li>
            <li>In ogni sezione puoi aggiungere note e caricare documenti</li>
            <li>Alla fine, firma l'<strong>Autorizzazione</strong> e invia la pratica</li>
          </ol>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button 
          onClick={() => setCurrentSection(1)} 
          className="bg-teal-600 hover:bg-teal-700"
          size="lg"
        >
          Inizia la compilazione
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
  };

  const renderPersonalData = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Nome *</Label>
          <Input 
            value={formData.datos_personales.nombre || ''}
            onChange={(e) => handleFieldChange('datos_personales', 'nombre', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div>
          <Label>Cognome *</Label>
          <Input 
            value={formData.datos_personales.apellidos || ''}
            onChange={(e) => handleFieldChange('datos_personales', 'apellidos', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div>
          <Label>DNI/NIE *</Label>
          <Input 
            value={formData.datos_personales.dni_nie || ''}
            onChange={(e) => handleFieldChange('datos_personales', 'dni_nie', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div>
          <Label>Data di Nascita *</Label>
          <Input 
            type="date"
            value={formData.datos_personales.fecha_nacimiento || ''}
            onChange={(e) => handleFieldChange('datos_personales', 'fecha_nacimiento', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Indirizzo *</Label>
          <Input 
            value={formData.datos_personales.direccion || ''}
            onChange={(e) => handleFieldChange('datos_personales', 'direccion', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div>
          <Label>Comune *</Label>
          <Input 
            value={formData.datos_personales.municipio || ''}
            onChange={(e) => handleFieldChange('datos_personales', 'municipio', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div>
          <Label>Provincia *</Label>
          <Input 
            value={formData.datos_personales.provincia || ''}
            onChange={(e) => handleFieldChange('datos_personales', 'provincia', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div>
          <Label>CAP *</Label>
          <Input 
            value={formData.datos_personales.codigo_postal || ''}
            onChange={(e) => handleFieldChange('datos_personales', 'codigo_postal', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div>
          <Label>Paese</Label>
          <Input 
            value={formData.datos_personales.pais || 'España'}
            onChange={(e) => handleFieldChange('datos_personales', 'pais', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div>
          <Label>Telefono *</Label>
          <Input 
            value={formData.datos_personales.telefono || ''}
            onChange={(e) => handleFieldChange('datos_personales', 'telefono', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div>
          <Label>Email *</Label>
          <Input 
            type="email"
            value={formData.datos_personales.email || user?.email || ''}
            onChange={(e) => handleFieldChange('datos_personales', 'email', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div>
          <Label>Stato Civile *</Label>
          <Select 
            value={formData.datos_personales.estado_civil || ''}
            onValueChange={(v) => handleFieldChange('datos_personales', 'estado_civil', v)}
            disabled={!isEditable}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="soltero">Celibe/Nubile</SelectItem>
              <SelectItem value="casado">Coniugato/a</SelectItem>
              <SelectItem value="divorciado">Divorziato/a</SelectItem>
              <SelectItem value="viudo">Vedovo/a</SelectItem>
              <SelectItem value="pareja_hecho">Coppia di fatto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={formData.datos_personales.residente_canarias || false}
            onCheckedChange={(c) => handleFieldChange('datos_personales', 'residente_canarias', c)}
            disabled={!isEditable}
          />
          <span>Residente nelle Isole Canarie</span>
        </label>
      </div>
      <SectionDocuments sectionId="datos_personales" sectionName="Dati Personali" />
    </div>
  );

  const renderFamilyData = () => (
    <div className="space-y-6">
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <Checkbox
          checked={formData.situacion_familiar.tiene_conyuge || false}
          onCheckedChange={(c) => handleFieldChange('situacion_familiar', 'tiene_conyuge', c)}
          disabled={!isEditable}
        />
        <span>Ho un coniuge/partner</span>
      </label>

      {formData.situacion_familiar.tiene_conyuge && (
        <Card className="bg-slate-50">
          <CardContent className="p-4 space-y-4">
            <h4 className="font-medium">Dati Coniuge</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input 
                placeholder="Nome"
                value={formData.situacion_familiar.conyuge?.nombre || ''}
                onChange={(e) => handleFieldChange('situacion_familiar', 'conyuge', {
                  ...formData.situacion_familiar.conyuge,
                  nombre: e.target.value
                })}
                disabled={!isEditable}
              />
              <Input 
                placeholder="Cognome"
                value={formData.situacion_familiar.conyuge?.apellidos || ''}
                onChange={(e) => handleFieldChange('situacion_familiar', 'conyuge', {
                  ...formData.situacion_familiar.conyuge,
                  apellidos: e.target.value
                })}
                disabled={!isEditable}
              />
              <Input 
                placeholder="DNI/NIE"
                value={formData.situacion_familiar.conyuge?.dni_nie || ''}
                onChange={(e) => handleFieldChange('situacion_familiar', 'conyuge', {
                  ...formData.situacion_familiar.conyuge,
                  dni_nie: e.target.value
                })}
                disabled={!isEditable}
              />
              <Input 
                type="date"
                value={formData.situacion_familiar.conyuge?.fecha_nacimiento || ''}
                onChange={(e) => handleFieldChange('situacion_familiar', 'conyuge', {
                  ...formData.situacion_familiar.conyuge,
                  fecha_nacimiento: e.target.value
                })}
                disabled={!isEditable}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={formData.situacion_familiar.discapacidad_contribuyente || false}
            onCheckedChange={(c) => handleFieldChange('situacion_familiar', 'discapacidad_contribuyente', c)}
            disabled={!isEditable}
          />
          <span>Ho una disabilità riconosciuta</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={formData.situacion_familiar.familia_numerosa || false}
            onCheckedChange={(c) => handleFieldChange('situacion_familiar', 'familia_numerosa', c)}
            disabled={!isEditable}
          />
          <span>Famiglia numerosa</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={formData.situacion_familiar.familia_monoparental || false}
            onCheckedChange={(c) => handleFieldChange('situacion_familiar', 'familia_monoparental', c)}
            disabled={!isEditable}
          />
          <span>Famiglia monoparentale</span>
        </label>
      </div>

      <div>
        <Label>Variazioni familiari durante l'anno (note)</Label>
        <Textarea
          value={formData.situacion_familiar.variaciones_familiares || ''}
          onChange={(e) => handleFieldChange('situacion_familiar', 'variaciones_familiares', e.target.value)}
          placeholder="Descrivi eventuali variazioni..."
          disabled={!isEditable}
        />
      </div>
      <SectionDocuments sectionId="situacion_familiar" sectionName="Situazione Familiare" />
    </div>
  );

  const renderEmploymentData = () => (
    <div className="space-y-6">
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <Checkbox
          checked={formData.rentas_trabajo.tiene_rentas_trabajo || false}
          onCheckedChange={(c) => handleFieldChange('rentas_trabajo', 'tiene_rentas_trabajo', c)}
          disabled={!isEditable}
        />
        <span>Ho percepito redditi da lavoro dipendente</span>
      </label>

      {formData.rentas_trabajo.tiene_rentas_trabajo && (
        <>
          <div>
            <Label>Numero di pagatori</Label>
            <Input 
              type="number"
              min="0"
              value={formData.rentas_trabajo.numero_pagadores || 0}
              onChange={(e) => handleFieldChange('rentas_trabajo', 'numero_pagadores', parseInt(e.target.value))}
              disabled={!isEditable}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.rentas_trabajo.tiene_desempleo || false}
                onCheckedChange={(c) => handleFieldChange('rentas_trabajo', 'tiene_desempleo', c)}
                disabled={!isEditable}
              />
              <span>Ho percepito disoccupazione</span>
            </label>
            {formData.rentas_trabajo.tiene_desempleo && (
              <div>
                <Label>Importo disoccupazione (€)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.rentas_trabajo.importe_desempleo || 0}
                  onChange={(e) => handleFieldChange('rentas_trabajo', 'importe_desempleo', parseFloat(e.target.value))}
                  disabled={!isEditable}
                />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.rentas_trabajo.tiene_pension || false}
                onCheckedChange={(c) => handleFieldChange('rentas_trabajo', 'tiene_pension', c)}
                disabled={!isEditable}
              />
              <span>Ho percepito pensione</span>
            </label>
            {formData.rentas_trabajo.tiene_pension && (
              <div>
                <Label>Importo pensione (€)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.rentas_trabajo.importe_pension || 0}
                  onChange={(e) => handleFieldChange('rentas_trabajo', 'importe_pension', parseFloat(e.target.value))}
                  disabled={!isEditable}
                />
              </div>
            )}
          </div>
        </>
      )}

      <div>
        <Label>Note aggiuntive</Label>
        <Textarea
          value={formData.rentas_trabajo.notas || ''}
          onChange={(e) => handleFieldChange('rentas_trabajo', 'notas', e.target.value)}
          placeholder="Informazioni aggiuntive sui redditi da lavoro..."
          disabled={!isEditable}
        />
      </div>
      <SectionDocuments sectionId="rentas_trabajo" sectionName="Redditi da Lavoro" />
    </div>
  );

  const renderSelfEmploymentData = () => (
    <div className="space-y-6">
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <Checkbox
          checked={formData.autonomo.es_autonomo || false}
          onCheckedChange={(c) => handleFieldChange('autonomo', 'es_autonomo', c)}
          disabled={!isEditable}
        />
        <span>Sono lavoratore autonomo</span>
      </label>

      {formData.autonomo.es_autonomo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Attività svolta</Label>
            <Input 
              value={formData.autonomo.actividad || ''}
              onChange={(e) => handleFieldChange('autonomo', 'actividad', e.target.value)}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label>Epígrafe IAE</Label>
            <Input 
              value={formData.autonomo.epigrafe_iae || ''}
              onChange={(e) => handleFieldChange('autonomo', 'epigrafe_iae', e.target.value)}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label>Regime fiscale</Label>
            <Select 
              value={formData.autonomo.regimen_fiscal || ''}
              onValueChange={(v) => handleFieldChange('autonomo', 'regimen_fiscal', v)}
              disabled={!isEditable}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="estimacion_directa">Estimación Directa</SelectItem>
                <SelectItem value="estimacion_objetiva">Estimación Objetiva (Módulos)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Redditi annuali (€)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.autonomo.ingresos_anuales || 0}
              onChange={(e) => handleFieldChange('autonomo', 'ingresos_anuales', parseFloat(e.target.value))}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label>Spese deducibili (€)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.autonomo.gastos_deducibles || 0}
              onChange={(e) => handleFieldChange('autonomo', 'gastos_deducibles', parseFloat(e.target.value))}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label>Quota autonomi annuale (€)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.autonomo.cuota_autonomos || 0}
              onChange={(e) => handleFieldChange('autonomo', 'cuota_autonomos', parseFloat(e.target.value))}
              disabled={!isEditable}
            />
          </div>
        </div>
      )}

      <div>
        <Label>Note</Label>
        <Textarea
          value={formData.autonomo.notas || ''}
          onChange={(e) => handleFieldChange('autonomo', 'notas', e.target.value)}
          placeholder="Informazioni aggiuntive sull'attività autonoma..."
          disabled={!isEditable}
        />
      </div>
      <SectionDocuments sectionId="autonomo" sectionName="Attività Autonoma" />
    </div>
  );

  const renderPropertiesData = () => (
    <div className="space-y-6">
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <Checkbox
          checked={formData.inmuebles.tiene_inmuebles || false}
          onCheckedChange={(c) => handleFieldChange('inmuebles', 'tiene_inmuebles', c)}
          disabled={!isEditable}
        />
        <span>Possiedo immobili</span>
      </label>

      {formData.inmuebles.tiene_inmuebles && (
        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-800">
                Per ogni immobile inserisci: indirizzo, riferimento catastale, percentuale proprietà, uso (abitazione principale, affittato, vuoto, seconda casa), valore acquisto.
              </p>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Indirizzo immobile principale</Label>
              <Input 
                value={formData.inmuebles.direccion_principal || ''}
                onChange={(e) => handleFieldChange('inmuebles', 'direccion_principal', e.target.value)}
                placeholder="Via, numero, città"
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Riferimento Catastale</Label>
              <Input 
                value={formData.inmuebles.referencia_catastral || ''}
                onChange={(e) => handleFieldChange('inmuebles', 'referencia_catastral', e.target.value)}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>% Proprietà</Label>
              <Input 
                type="number"
                min="0"
                max="100"
                value={formData.inmuebles.porcentaje_propiedad || 100}
                onChange={(e) => handleFieldChange('inmuebles', 'porcentaje_propiedad', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Uso dell'immobile</Label>
              <Select 
                value={formData.inmuebles.uso || ''}
                onValueChange={(v) => handleFieldChange('inmuebles', 'uso', v)}
                disabled={!isEditable}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vivienda_habitual">Abitazione Principale</SelectItem>
                  <SelectItem value="alquilado">Affittato</SelectItem>
                  <SelectItem value="vacio">Vuoto/Non locato</SelectItem>
                  <SelectItem value="segunda_residencia">Seconda Casa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valore di acquisto (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.inmuebles.valor_adquisicion || 0}
                onChange={(e) => handleFieldChange('inmuebles', 'valor_adquisicion', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <Label>Note sugli immobili</Label>
        <Textarea
          value={formData.inmuebles.notas || ''}
          onChange={(e) => handleFieldChange('inmuebles', 'notas', e.target.value)}
          placeholder="Descrivi altri immobili o particolarità..."
          rows={4}
          disabled={!isEditable}
        />
      </div>
      <SectionDocuments sectionId="inmuebles" sectionName="Immobili" />
    </div>
  );

  // ==================== NUOVE SEZIONI ====================

  const renderRentalsReceivedData = () => (
    <div className="space-y-6">
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <Checkbox
          checked={formData.alquileres_cobrados.tiene_alquileres || false}
          onCheckedChange={(c) => handleFieldChange('alquileres_cobrados', 'tiene_alquileres', c)}
          disabled={!isEditable}
        />
        <span>Percepisco canoni di locazione</span>
      </label>

      {formData.alquileres_cobrados.tiene_alquileres && (
        <div className="space-y-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <p className="text-sm text-green-800">
                Inserisci i dati relativi agli immobili che hai affittato durante l'anno.
              </p>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Immobile di riferimento</Label>
              <Input 
                value={formData.alquileres_cobrados.inmueble_referencia || ''}
                onChange={(e) => handleFieldChange('alquileres_cobrados', 'inmueble_referencia', e.target.value)}
                placeholder="Indirizzo dell'immobile affittato"
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Canone annuo percepito (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.alquileres_cobrados.canon_anual || 0}
                onChange={(e) => handleFieldChange('alquileres_cobrados', 'canon_anual', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Mesi di locazione</Label>
              <Input 
                type="number"
                min="1"
                max="12"
                value={formData.alquileres_cobrados.meses_locacion || 12}
                onChange={(e) => handleFieldChange('alquileres_cobrados', 'meses_locacion', parseInt(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Nome inquilino/locatario</Label>
              <Input 
                value={formData.alquileres_cobrados.nombre_inquilino || ''}
                onChange={(e) => handleFieldChange('alquileres_cobrados', 'nombre_inquilino', e.target.value)}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>NIF/NIE inquilino</Label>
              <Input 
                value={formData.alquileres_cobrados.nif_inquilino || ''}
                onChange={(e) => handleFieldChange('alquileres_cobrados', 'nif_inquilino', e.target.value)}
                disabled={!isEditable}
              />
            </div>
          </div>

          <h4 className="font-medium mt-4">Spese sostenute</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>IBI (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.alquileres_cobrados.gastos_ibi || 0}
                onChange={(e) => handleFieldChange('alquileres_cobrados', 'gastos_ibi', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Comunidad (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.alquileres_cobrados.gastos_comunidad || 0}
                onChange={(e) => handleFieldChange('alquileres_cobrados', 'gastos_comunidad', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Assicurazione (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.alquileres_cobrados.gastos_seguro || 0}
                onChange={(e) => handleFieldChange('alquileres_cobrados', 'gastos_seguro', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Manutenzione (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.alquileres_cobrados.gastos_mantenimiento || 0}
                onChange={(e) => handleFieldChange('alquileres_cobrados', 'gastos_mantenimiento', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.alquileres_cobrados.tiene_morosidad || false}
              onCheckedChange={(c) => handleFieldChange('alquileres_cobrados', 'tiene_morosidad', c)}
              disabled={!isEditable}
            />
            <Label>Ho avuto morosità</Label>
          </div>
        </div>
      )}

      <div>
        <Label>Note aggiuntive</Label>
        <Textarea
          value={formData.alquileres_cobrados.notas || ''}
          onChange={(e) => handleFieldChange('alquileres_cobrados', 'notas', e.target.value)}
          placeholder="Altri dettagli sui canoni percepiti..."
          rows={3}
          disabled={!isEditable}
        />
      </div>
      <SectionDocuments sectionId="alquileres_cobrados" sectionName="Canoni di Locazione" />
    </div>
  );

  const renderRentPaidData = () => (
    <div className="space-y-6">
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <Checkbox
          checked={formData.alquiler_pagado.paga_alquiler || false}
          onCheckedChange={(c) => handleFieldChange('alquiler_pagado', 'paga_alquiler', c)}
          disabled={!isEditable}
        />
        <span>Pago un affitto per la mia abitazione principale</span>
      </label>

      {formData.alquiler_pagado.paga_alquiler && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Importo affitto annuale (€)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.alquiler_pagado.importe_anual || 0}
              onChange={(e) => handleFieldChange('alquiler_pagado', 'importe_anual', parseFloat(e.target.value))}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label>Nome proprietario/locatore</Label>
            <Input 
              value={formData.alquiler_pagado.nombre_arrendador || ''}
              onChange={(e) => handleFieldChange('alquiler_pagado', 'nombre_arrendador', e.target.value)}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label>NIF/NIE proprietario</Label>
            <Input 
              value={formData.alquiler_pagado.nif_arrendador || ''}
              onChange={(e) => handleFieldChange('alquiler_pagado', 'nif_arrendador', e.target.value)}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label>Riferimento catastale immobile</Label>
            <Input 
              value={formData.alquiler_pagado.referencia_catastral || ''}
              onChange={(e) => handleFieldChange('alquiler_pagado', 'referencia_catastral', e.target.value)}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label>Data inizio contratto</Label>
            <Input 
              type="date"
              value={formData.alquiler_pagado.fecha_inicio_contrato || ''}
              onChange={(e) => handleFieldChange('alquiler_pagado', 'fecha_inicio_contrato', e.target.value)}
              disabled={!isEditable}
            />
          </div>
        </div>
      )}

      <div>
        <Label>Note</Label>
        <Textarea
          value={formData.alquiler_pagado.notas || ''}
          onChange={(e) => handleFieldChange('alquiler_pagado', 'notas', e.target.value)}
          placeholder="Dettagli aggiuntivi sull'affitto..."
          disabled={!isEditable}
        />
      </div>
      <SectionDocuments sectionId="alquiler_pagado" sectionName="Affitto Pagato" />
    </div>
  );

  const renderInvestmentsData = () => (
    <div className="space-y-6">
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <Checkbox
          checked={formData.inversiones.tiene_inversiones || false}
          onCheckedChange={(c) => handleFieldChange('inversiones', 'tiene_inversiones', c)}
          disabled={!isEditable}
        />
        <span>Ho investimenti finanziari</span>
      </label>

      {formData.inversiones.tiene_inversiones && (
        <div className="space-y-4">
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <p className="text-sm text-purple-800">
                Indica banche, broker, tipologia investimenti, dividendi e interessi percepiti.
              </p>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Banca / Broker principale</Label>
              <Input 
                value={formData.inversiones.entidad_principal || ''}
                onChange={(e) => handleFieldChange('inversiones', 'entidad_principal', e.target.value)}
                placeholder="Es. Banco Santander, Interactive Brokers..."
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Tipologia investimento</Label>
              <Select 
                value={formData.inversiones.tipo_inversion || ''}
                onValueChange={(v) => handleFieldChange('inversiones', 'tipo_inversion', v)}
                disabled={!isEditable}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cuenta_bancaria">Conto Corrente</SelectItem>
                  <SelectItem value="deposito">Deposito a Termine</SelectItem>
                  <SelectItem value="fondos">Fondi di Investimento</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="acciones">Azioni</SelectItem>
                  <SelectItem value="bonos">Obbligazioni</SelectItem>
                  <SelectItem value="mixto">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Interessi bancari percepiti (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.inversiones.intereses_bancarios || 0}
                onChange={(e) => handleFieldChange('inversiones', 'intereses_bancarios', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Dividendi percepiti (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.inversiones.dividendos || 0}
                onChange={(e) => handleFieldChange('inversiones', 'dividendos', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.inversiones.tiene_inversiones_extranjero || false}
                onCheckedChange={(c) => handleFieldChange('inversiones', 'tiene_inversiones_extranjero', c)}
                disabled={!isEditable}
              />
              <Label>Ho investimenti all'estero</Label>
            </div>
            {formData.inversiones.tiene_inversiones_extranjero && (
              <div>
                <Label>Paese investimenti esteri</Label>
                <Input 
                  value={formData.inversiones.pais_extranjero || ''}
                  onChange={(e) => handleFieldChange('inversiones', 'pais_extranjero', e.target.value)}
                  disabled={!isEditable}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <Label>Note aggiuntive</Label>
        <Textarea
          value={formData.inversiones.notas || ''}
          onChange={(e) => handleFieldChange('inversiones', 'notas', e.target.value)}
          placeholder="Dettagli su altri investimenti, vendite, plusvalenze realizzate..."
          rows={3}
          disabled={!isEditable}
        />
      </div>
      <SectionDocuments sectionId="inversiones" sectionName="Investimenti" />
    </div>
  );

  const renderCryptoData = () => (
    <div className="space-y-6">
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <Checkbox
          checked={formData.criptomonedas.tiene_criptomonedas || false}
          onCheckedChange={(c) => handleFieldChange('criptomonedas', 'tiene_criptomonedas', c)}
          disabled={!isEditable}
        />
        <span>Ho operato con criptovalute</span>
      </label>

      {formData.criptomonedas.tiene_criptomonedas && (
        <div className="space-y-4">
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <p className="text-sm text-orange-800">
                Indica gli exchange utilizzati, le operazioni effettuate (acquisti, vendite, permute, staking).
                Allega i report degli exchange in formato CSV o PDF.
              </p>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Exchange utilizzati</Label>
              <Input 
                value={formData.criptomonedas.exchanges || ''}
                onChange={(e) => handleFieldChange('criptomonedas', 'exchanges', e.target.value)}
                placeholder="Es. Binance, Coinbase, Kraken..."
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Wallet / Piattaforme</Label>
              <Input 
                value={formData.criptomonedas.wallets || ''}
                onChange={(e) => handleFieldChange('criptomonedas', 'wallets', e.target.value)}
                placeholder="Es. MetaMask, Ledger..."
                disabled={!isEditable}
              />
            </div>
          </div>

          <h4 className="font-medium mt-4">Tipologia operazioni</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.criptomonedas.ha_comprado || false}
                onCheckedChange={(c) => handleFieldChange('criptomonedas', 'ha_comprado', c)}
                disabled={!isEditable}
              />
              <span>Acquisti</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.criptomonedas.ha_vendido || false}
                onCheckedChange={(c) => handleFieldChange('criptomonedas', 'ha_vendido', c)}
                disabled={!isEditable}
              />
              <span>Vendite</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.criptomonedas.ha_permutado || false}
                onCheckedChange={(c) => handleFieldChange('criptomonedas', 'ha_permutado', c)}
                disabled={!isEditable}
              />
              <span>Permute</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.criptomonedas.tiene_staking || false}
                onCheckedChange={(c) => handleFieldChange('criptomonedas', 'tiene_staking', c)}
                disabled={!isEditable}
              />
              <span>Staking/Reward</span>
            </label>
          </div>

          {formData.criptomonedas.tiene_staking && (
            <div>
              <Label>Importo staking/rewards percepiti (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.criptomonedas.importe_staking || 0}
                onChange={(e) => handleFieldChange('criptomonedas', 'importe_staking', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
          )}

          <div>
            <Label>Periodo di riferimento operazioni</Label>
            <Input 
              value={formData.criptomonedas.periodo_operaciones || ''}
              onChange={(e) => handleFieldChange('criptomonedas', 'periodo_operaciones', e.target.value)}
              placeholder="Es. Gennaio - Dicembre 2025"
              disabled={!isEditable}
            />
          </div>
        </div>
      )}

      <div>
        <Label>Note aggiuntive</Label>
        <Textarea
          value={formData.criptomonedas.notas || ''}
          onChange={(e) => handleFieldChange('criptomonedas', 'notas', e.target.value)}
          placeholder="Dettagli sulle operazioni crypto, plusvalenze/minusvalenze realizzate..."
          rows={3}
          disabled={!isEditable}
        />
      </div>
      <SectionDocuments sectionId="criptomonedas" sectionName="Criptomonete" />
    </div>
  );

  const renderCapitalGainsData = () => (
    <div className="space-y-6">
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <Checkbox
          checked={formData.ganancias_patrimoniales.tiene_ganancias_patrimoniales || false}
          onCheckedChange={(c) => handleFieldChange('ganancias_patrimoniales', 'tiene_ganancias_patrimoniales', c)}
          disabled={!isEditable}
        />
        <span>Ho avuto plusvalenze o minusvalenze patrimoniali</span>
      </label>

      {formData.ganancias_patrimoniales.tiene_ganancias_patrimoniales && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.ganancias_patrimoniales.vendita_immobili || false}
                onCheckedChange={(c) => handleFieldChange('ganancias_patrimoniales', 'vendita_immobili', c)}
                disabled={!isEditable}
              />
              <span>Vendita di immobili</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.ganancias_patrimoniales.vendita_azioni || false}
                onCheckedChange={(c) => handleFieldChange('ganancias_patrimoniales', 'vendita_azioni', c)}
                disabled={!isEditable}
              />
              <span>Vendita azioni/fondi</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.ganancias_patrimoniales.indennizzi || false}
                onCheckedChange={(c) => handleFieldChange('ganancias_patrimoniales', 'indennizzi', c)}
                disabled={!isEditable}
              />
              <span>Indennizzi ricevuti</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.ganancias_patrimoniales.aiuti_pubblici || false}
                onCheckedChange={(c) => handleFieldChange('ganancias_patrimoniales', 'aiuti_pubblici', c)}
                disabled={!isEditable}
              />
              <span>Aiuti pubblici</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <Label>Prezzo di acquisto totale (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.ganancias_patrimoniales.precio_adquisicion || 0}
                onChange={(e) => handleFieldChange('ganancias_patrimoniales', 'precio_adquisicion', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Prezzo di vendita totale (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.ganancias_patrimoniales.precio_venta || 0}
                onChange={(e) => handleFieldChange('ganancias_patrimoniales', 'precio_venta', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Costi associati (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.ganancias_patrimoniales.costes_asociados || 0}
                onChange={(e) => handleFieldChange('ganancias_patrimoniales', 'costes_asociados', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Date operazioni</Label>
              <Input 
                value={formData.ganancias_patrimoniales.fechas_operaciones || ''}
                onChange={(e) => handleFieldChange('ganancias_patrimoniales', 'fechas_operaciones', e.target.value)}
                placeholder="Es. 15/03/2025 - 20/06/2025"
                disabled={!isEditable}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <Label>Note aggiuntive</Label>
        <Textarea
          value={formData.ganancias_patrimoniales.notas || ''}
          onChange={(e) => handleFieldChange('ganancias_patrimoniales', 'notas', e.target.value)}
          placeholder="Descrizione dettagliata delle operazioni..."
          rows={3}
          disabled={!isEditable}
        />
      </div>
      <SectionDocuments sectionId="ganancias_patrimoniales" sectionName="Plusvalenze" />
    </div>
  );

  const renderDeductionsData = () => (
    <div className="space-y-6">
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <Checkbox
          checked={formData.deducciones.tiene_deducciones || false}
          onCheckedChange={(c) => handleFieldChange('deducciones', 'tiene_deducciones', c)}
          disabled={!isEditable}
        />
        <span>Ho spese deducibili</span>
      </label>

      {formData.deducciones.tiene_deducciones && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Donazioni (€)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.deducciones.donaciones || 0}
              onChange={(e) => handleFieldChange('deducciones', 'donaciones', parseFloat(e.target.value))}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label>Spese mediche (€)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.deducciones.gastos_medicos || 0}
              onChange={(e) => handleFieldChange('deducciones', 'gastos_medicos', parseFloat(e.target.value))}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label>Asilo nido / Guardería (€)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.deducciones.guarderia || 0}
              onChange={(e) => handleFieldChange('deducciones', 'guarderia', parseFloat(e.target.value))}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label>Spese istruzione (€)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.deducciones.educacion || 0}
              onChange={(e) => handleFieldChange('deducciones', 'educacion', parseFloat(e.target.value))}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label>Contributi piani pensione (€)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.deducciones.aportaciones_planes_pensiones || 0}
              onChange={(e) => handleFieldChange('deducciones', 'aportaciones_planes_pensiones', parseFloat(e.target.value))}
              disabled={!isEditable}
            />
          </div>
          <div>
            <Label>Altre deduzioni (€)</Label>
            <Input 
              type="number"
              step="0.01"
              value={formData.deducciones.otras_deducciones || 0}
              onChange={(e) => handleFieldChange('deducciones', 'otras_deducciones', parseFloat(e.target.value))}
              disabled={!isEditable}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Descrizione altre deduzioni</Label>
            <Input 
              value={formData.deducciones.descripcion_otras || ''}
              onChange={(e) => handleFieldChange('deducciones', 'descripcion_otras', e.target.value)}
              disabled={!isEditable}
            />
          </div>
        </div>
      )}

      <div>
        <Label>Note</Label>
        <Textarea
          value={formData.deducciones.notas || ''}
          onChange={(e) => handleFieldChange('deducciones', 'notas', e.target.value)}
          placeholder="Dettagli sulle spese deducibili..."
          disabled={!isEditable}
        />
      </div>
      <SectionDocuments sectionId="deducciones" sectionName="Spese Deducibili" />
    </div>
  );

  const renderCanaryDeductionsData = () => (
    <div className="space-y-6">
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <Checkbox
          checked={formData.deducciones_canarias.tiene_deducciones_canarias || false}
          onCheckedChange={(c) => handleFieldChange('deducciones_canarias', 'tiene_deducciones_canarias', c)}
          disabled={!isEditable}
        />
        <span>Ho diritto a deduzioni regionali canarie</span>
      </label>

      {formData.deducciones_canarias.tiene_deducciones_canarias && (
        <div className="space-y-4">
          <Card className="bg-teal-50 border-teal-200">
            <CardContent className="p-4">
              <p className="text-sm text-teal-800">
                Le deduzioni canarie sono specifiche per i residenti nelle Isole Canarie.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Affitto abitazione abituale (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.deducciones_canarias.alquiler_vivienda_habitual || 0}
                onChange={(e) => handleFieldChange('deducciones_canarias', 'alquiler_vivienda_habitual', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Spese di studio (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.deducciones_canarias.gastos_estudios || 0}
                onChange={(e) => handleFieldChange('deducciones_canarias', 'gastos_estudios', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Spese guardería (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.deducciones_canarias.gastos_guarderia || 0}
                onChange={(e) => handleFieldChange('deducciones_canarias', 'gastos_guarderia', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Famiglia numerosa (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.deducciones_canarias.familia_numerosa || 0}
                onChange={(e) => handleFieldChange('deducciones_canarias', 'familia_numerosa', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Famiglia monoparentale (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.deducciones_canarias.familia_monoparental || 0}
                onChange={(e) => handleFieldChange('deducciones_canarias', 'familia_monoparental', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Disabilità / Maggiori 65 anni (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.deducciones_canarias.discapacidad_mayores_65 || 0}
                onChange={(e) => handleFieldChange('deducciones_canarias', 'discapacidad_mayores_65', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Donazioni (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.deducciones_canarias.donaciones || 0}
                onChange={(e) => handleFieldChange('deducciones_canarias', 'donaciones', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Spese malattia (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.deducciones_canarias.gastos_enfermedad || 0}
                onChange={(e) => handleFieldChange('deducciones_canarias', 'gastos_enfermedad', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Adeguamento immobile per locazione (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.deducciones_canarias.adecuacion_vivienda_alquiler || 0}
                onChange={(e) => handleFieldChange('deducciones_canarias', 'adecuacion_vivienda_alquiler', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
            <div>
              <Label>Assicurazione impagati (€)</Label>
              <Input 
                type="number"
                step="0.01"
                value={formData.deducciones_canarias.seguro_impago_alquiler || 0}
                onChange={(e) => handleFieldChange('deducciones_canarias', 'seguro_impago_alquiler', parseFloat(e.target.value))}
                disabled={!isEditable}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <Label>Note</Label>
        <Textarea
          value={formData.deducciones_canarias.notas || ''}
          onChange={(e) => handleFieldChange('deducciones_canarias', 'notas', e.target.value)}
          placeholder="Dettagli sulle deduzioni canarie..."
          disabled={!isEditable}
        />
      </div>
      <SectionDocuments sectionId="deducciones_canarias" sectionName="Deduzioni Canarie" />
    </div>
  );

  const renderDocumentsSection = () => (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            Qui puoi caricare tutti i documenti relativi alla tua dichiarazione dei redditi.
            I documenti saranno associati alla categoria selezionata.
          </p>
        </CardContent>
      </Card>

      {/* Lista documenti esistenti */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Documenti caricati ({documents.length})</h4>
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="font-medium text-sm">{doc.nombre}</p>
                  <p className="text-xs text-slate-500">
                    {DOC_CATEGORIES.find(c => c.value === doc.categoria)?.label || doc.categoria}
                    {doc.seccion && ` • ${SECTIONS.find(s => s.id === doc.seccion)?.name || doc.seccion}`}
                  </p>
                </div>
              </div>
              <Badge variant="outline">Caricato</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Upload nuovo documento */}
      {isEditable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Carica nuovo documento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>Categoria</Label>
                <Select defaultValue="otro">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) handleUploadDocument(file, 'otro', 'generale');
                  };
                  input.click();
                }}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Caricamento...' : 'Seleziona File'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Richieste integrazione pendenti */}
      {integrationRequests.filter(r => r.stato === 'pendente').length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-base text-yellow-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Documenti richiesti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {integrationRequests.filter(r => r.stato === 'pendente').map(req => (
              <div key={req.id} className="p-3 bg-white rounded border">
                <p className="text-sm font-medium">{req.mensaje}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Sezione: {SECTIONS.find(s => s.id === req.seccion)?.name || req.seccion}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Funzione per ricaricare i dati della dichiarazione
  const reloadTaxReturn = async () => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${taxReturn.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && onUpdate) {
        onUpdate(data);
        setIntegrationRequests(data.richieste_integrazione || []);
        setConversazione(data.conversazione || []);
        setDocuments(data.documentos || []);
      }
    } catch (error) {
      console.error('Errore ricaricamento dati:', error);
    }
  };

  const renderCommunicationsSection = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Richieste e Comunicazioni
        </h3>
        <p className="text-slate-500">
          Qui trovi le richieste di documentazione dal commercialista e puoi comunicare direttamente con lui.
        </p>
      </div>
      
      <ClientIntegrationRequests
        taxReturn={{
          ...taxReturn,
          richieste_integrazione: integrationRequests,
          conversazione: conversazione
        }}
        token={token}
        user={user}
        onUpdate={reloadTaxReturn}
      />
    </div>
  );

  const renderNotesSection = () => (
    <div className="space-y-6">
      {/* Note del cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-teal-600" />
            Le tue note
          </CardTitle>
          <CardDescription>
            Aggiungi note o spiegazioni per il commercialista
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {clientNotes.length > 0 && (
            <div className="space-y-2">
              {clientNotes.map(note => (
                <div key={note.id} className="p-3 bg-teal-50 rounded-lg">
                  <p className="text-sm">{note.texto}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(note.created_at).toLocaleString('it-IT')}
                  </p>
                </div>
              ))}
            </div>
          )}

          {isEditable && (
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Scrivi una nota..."
                rows={2}
              />
              <Button onClick={handleAddClientNote} disabled={!newNote.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comunicazioni admin (visibili al cliente) */}
      {adminNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Comunicazioni dal commercialista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {adminNotes.map(note => (
                <div key={note.id} className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm">{note.texto}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(note.created_at).toLocaleString('it-IT')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sezione admin per aggiungere note e richieste */}
      {isAdmin && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aggiungi nota interna</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Textarea
                  value={newAdminNote}
                  onChange={(e) => setNewAdminNote(e.target.value)}
                  placeholder="Nota interna per il cliente..."
                  rows={2}
                />
                <Button onClick={handleAddAdminNote} disabled={!newAdminNote.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Richiedi documentazione</CardTitle>
              <CardDescription>
                Invia una richiesta di integrazione al cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Sezione</Label>
                <Select 
                  value={newIntegrationRequest.seccion}
                  onValueChange={(v) => setNewIntegrationRequest(prev => ({...prev, seccion: v}))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona sezione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="generale">Generale</SelectItem>
                    {SECTIONS.filter(s => !s.required).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Messaggio</Label>
                <Textarea
                  value={newIntegrationRequest.messaggio || ''}
                  onChange={(e) => setNewIntegrationRequest(prev => ({...prev, messaggio: e.target.value}))}
                  placeholder="Es. Per favore carica il contratto di locazione..."
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleSendIntegrationRequest} 
                disabled={!newIntegrationRequest.messaggio?.trim()}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                Invia Richiesta
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  const renderAuthorization = () => (
    <div className="space-y-6">
      {taxReturn.autorizacion?.signed_at ? (
        <div className="text-center py-8 bg-green-50 rounded-lg">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-green-800">Autorizzazione Firmata</h3>
          <p className="text-green-600 mt-2">
            Firmata il {new Date(taxReturn.autorizacion.signed_at).toLocaleString('it-IT')}
          </p>
          {taxReturn.stato === 'bozza' && !isAdmin && (
            <Button 
              onClick={handleSubmit}
              className="mt-6 bg-teal-600 hover:bg-teal-700"
              size="lg"
            >
              <Send className="w-4 h-4 mr-2" />
              Invia Pratica
            </Button>
          )}
        </div>
      ) : (
        <>
          <Card className="border-2 border-teal-200 bg-teal-50">
            <CardHeader>
              <CardTitle className="text-teal-800">Autorizzazione alla Presentazione</CardTitle>
              <CardDescription>
                Leggi attentamente e firma per autorizzare Fiscal Tax Canarie
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-slate-700 leading-relaxed">{authText}</p>
              </div>

              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Firmando questo documento, autorizzi Fiscal Tax Canarie SLP a predisporre e 
                  presentare la tua dichiarazione dei redditi per l'anno {taxReturn.anno_fiscale}.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="consent"
                  checked={consentAccepted}
                  onCheckedChange={setConsentAccepted}
                  disabled={!isEditable}
                />
                <Label htmlFor="consent" className="font-medium cursor-pointer">
                  Acconsento e autorizzo quanto sopra indicato
                </Label>
              </div>

              <div>
                <Label className="mb-2 block">La tua firma</Label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white">
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      className: 'w-full h-40',
                      style: { width: '100%', height: '160px' }
                    }}
                    backgroundColor="white"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Button variant="outline" size="sm" onClick={clearSignature}>
                    <X className="w-4 h-4 mr-1" />
                    Cancella firma
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleSign}
                disabled={!consentAccepted || !isEditable}
                className="w-full bg-teal-600 hover:bg-teal-700"
                size="lg"
              >
                <Pen className="w-4 h-4 mr-2" />
                Firma e Conferma
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6" data-testid="tax-return-form">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Dichiarazione dei Redditi {taxReturn.anno_fiscale}
            </h1>
            <div className="text-sm text-slate-500 flex items-center gap-1">
              <span>{taxReturn.tipo_dichiarazione === 'individual' ? 'Individuale' : 'Congiunta'}</span>
              <span>•</span>
              <Badge variant="outline">{taxReturn.stato}</Badge>
            </div>
          </div>
        </div>
        {(isEditable || isAdmin) && currentSectionData?.id !== 'documentos' && currentSectionData?.id !== 'notas' && currentSectionData?.id !== 'autorizacion' && (
          <Button onClick={handleSaveCurrentSection} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvataggio...' : 'Salva'}
          </Button>
        )}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {visibleSections.map((section, idx) => {
              // Conta richieste pendenti per sezione comunicazioni
              const pendingRequests = section.id === 'comunicazioni' 
                ? integrationRequests.filter(r => r.stato === 'pendente').length 
                : 0;
              const unreadMessages = section.id === 'comunicazioni'
                ? conversazione.filter(m => m.sender_role === 'commercialista' && !m.read_by_client).length
                : 0;
              const totalBadge = pendingRequests + unreadMessages;
              
              return (
                <Button
                  key={section.id}
                  variant={idx === currentSection ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentSection(idx)}
                  className={`relative ${idx === currentSection ? 'bg-teal-600' : ''} ${section.id === 'comunicazioni' && totalBadge > 0 ? 'border-yellow-400' : ''}`}
                >
                  <section.icon className="w-4 h-4 mr-1" />
                  <span className="hidden md:inline">{section.name}</span>
                  <span className="md:hidden">{idx + 1}</span>
                  {section.id === 'comunicazioni' && totalBadge > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {totalBadge}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentSectionData && <currentSectionData.icon className="w-5 h-5 text-teal-600" />}
            {currentSectionData?.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderSectionContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button 
          variant="outline"
          onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
          disabled={currentSection === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Precedente
        </Button>
        <Button 
          onClick={() => setCurrentSection(Math.min(visibleSections.length - 1, currentSection + 1))}
          disabled={currentSection === visibleSections.length - 1}
          className="bg-teal-600 hover:bg-teal-700"
        >
          Successivo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default TaxReturnForm;
