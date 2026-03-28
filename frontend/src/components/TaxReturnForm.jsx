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
  Upload, Pen, AlertCircle, Check, X
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Sezioni del form
const SECTIONS = [
  { id: 'filtro', name: 'Selezione Sezioni', icon: CheckCircle, required: true },
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
  { id: 'notas', name: 'Note', icon: FileText },
  { id: 'autorizacion', name: 'Autorizzazione', icon: Pen, required: true }
];

const TaxReturnForm = ({ taxReturn, token, user, onBack, onUpdate }) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState({
    secciones_habilitadas: taxReturn.secciones_habilitadas || {},
    datos_personales: taxReturn.datos_personales || {},
    situacion_familiar: taxReturn.situacion_familiar || {},
    rentas_trabajo: taxReturn.rentas_trabajo || {},
    autonomo: taxReturn.autonomo || {},
    inmuebles: taxReturn.inmuebles || {},
    alquileres_cobrados: taxReturn.alquileres_cobrados || {},
    alquiler_pagado: taxReturn.alquiler_pagado || {},
    inversiones: taxReturn.inversiones || {},
    criptomonedas: taxReturn.criptomonedas || {},
    ganancias_patrimoniales: taxReturn.ganancias_patrimoniales || {},
    deducciones: taxReturn.deducciones || {},
    deducciones_canarias: taxReturn.deducciones_canarias || {}
  });
  const [saving, setSaving] = useState(false);
  const [authText, setAuthText] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const signatureRef = useRef(null);

  const isAdmin = user?.role === 'commercialista';
  const isEditable = !isAdmin && ['bozza', 'documentazione_incompleta'].includes(taxReturn.stato);

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
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Errore salvataggio');
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
    const section = SECTIONS[currentSection];
    if (section.id === 'filtro') {
      await saveSection('secciones_habilitadas', formData.secciones_habilitadas);
    } else if (section.id !== 'documentos' && section.id !== 'notas' && section.id !== 'autorizacion') {
      await saveSection(section.id, formData[section.id]);
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
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Errore firma');
      }
      
      toast.success('Autorizzazione firmata con successo!');
      onBack();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSubmit = async () => {
    // Verifica che l'autorizzazione sia firmata
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
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Errore invio');
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

  // Filtra sezioni visibili
  const visibleSections = SECTIONS.filter(section => {
    if (section.required) return true;
    if (section.id === 'documentos' || section.id === 'notas') return true;
    return formData.secciones_habilitadas[section.id];
  });

  const currentSectionData = visibleSections[currentSection];

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
      case 'autorizacion':
        return renderAuthorization();
      default:
        return renderPlaceholder(currentSectionData?.name);
    }
  };

  const renderSectionFilter = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Quali situazioni hai avuto nell'anno {taxReturn.anno_fiscale}?
        </h3>
        <p className="text-slate-500">
          Seleziona le sezioni pertinenti. Le altre non verranno mostrate.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.filter(s => !s.required && s.id !== 'documentos' && s.id !== 'notas').map(section => (
          <label 
            key={section.id}
            className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
              formData.secciones_habilitadas[section.id] 
                ? 'border-teal-500 bg-teal-50' 
                : 'hover:border-slate-300'
            }`}
          >
            <Checkbox
              checked={formData.secciones_habilitadas[section.id] || false}
              onCheckedChange={(checked) => handleFieldChange('secciones_habilitadas', section.id, checked)}
              disabled={!isEditable}
            />
            <div className="flex items-center gap-3">
              <section.icon className={`w-5 h-5 ${
                formData.secciones_habilitadas[section.id] ? 'text-teal-600' : 'text-slate-400'
              }`} />
              <span className="font-medium">{section.name}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

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
        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.datos_personales.residente_canarias || false}
            onCheckedChange={(c) => handleFieldChange('datos_personales', 'residente_canarias', c)}
            disabled={!isEditable}
          />
          <Label>Residente nelle Isole Canarie</Label>
        </div>
      </div>
    </div>
  );

  const renderFamilyData = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Checkbox
          checked={formData.situacion_familiar.tiene_conyuge || false}
          onCheckedChange={(c) => handleFieldChange('situacion_familiar', 'tiene_conyuge', c)}
          disabled={!isEditable}
        />
        <Label>Ho un coniuge/partner</Label>
      </div>

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
                placeholder="Data di nascita"
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
        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.situacion_familiar.discapacidad_contribuyente || false}
            onCheckedChange={(c) => handleFieldChange('situacion_familiar', 'discapacidad_contribuyente', c)}
            disabled={!isEditable}
          />
          <Label>Ho una disabilità riconosciuta</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.situacion_familiar.familia_numerosa || false}
            onCheckedChange={(c) => handleFieldChange('situacion_familiar', 'familia_numerosa', c)}
            disabled={!isEditable}
          />
          <Label>Famiglia numerosa</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={formData.situacion_familiar.familia_monoparental || false}
            onCheckedChange={(c) => handleFieldChange('situacion_familiar', 'familia_monoparental', c)}
            disabled={!isEditable}
          />
          <Label>Famiglia monoparentale</Label>
        </div>
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
    </div>
  );

  const renderEmploymentData = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Checkbox
          checked={formData.rentas_trabajo.tiene_rentas_trabajo || false}
          onCheckedChange={(c) => handleFieldChange('rentas_trabajo', 'tiene_rentas_trabajo', c)}
          disabled={!isEditable}
        />
        <Label>Ho percepito redditi da lavoro dipendente</Label>
      </div>

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
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.rentas_trabajo.tiene_desempleo || false}
                onCheckedChange={(c) => handleFieldChange('rentas_trabajo', 'tiene_desempleo', c)}
                disabled={!isEditable}
              />
              <Label>Ho percepito disoccupazione</Label>
            </div>
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

            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.rentas_trabajo.tiene_pension || false}
                onCheckedChange={(c) => handleFieldChange('rentas_trabajo', 'tiene_pension', c)}
                disabled={!isEditable}
              />
              <Label>Ho percepito pensione</Label>
            </div>
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
    </div>
  );

  const renderSelfEmploymentData = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Checkbox
          checked={formData.autonomo.es_autonomo || false}
          onCheckedChange={(c) => handleFieldChange('autonomo', 'es_autonomo', c)}
          disabled={!isEditable}
        />
        <Label>Sono lavoratore autonomo</Label>
      </div>

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
              value={formData.autonomo.epígrafe_iae || ''}
              onChange={(e) => handleFieldChange('autonomo', 'epígrafe_iae', e.target.value)}
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
    </div>
  );

  const renderPropertiesData = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Checkbox
          checked={formData.inmuebles.tiene_inmuebles || false}
          onCheckedChange={(c) => handleFieldChange('inmuebles', 'tiene_inmuebles', c)}
          disabled={!isEditable}
        />
        <Label>Possiedo immobili</Label>
      </div>

      {formData.inmuebles.tiene_inmuebles && (
        <div className="text-center py-8 bg-slate-50 rounded-lg">
          <Home className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            Funzionalità per aggiungere immobili in sviluppo.
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Per ora, descrivi i tuoi immobili nelle note sottostanti.
          </p>
        </div>
      )}

      <div>
        <Label>Note sugli immobili</Label>
        <Textarea
          value={formData.inmuebles.notas || ''}
          onChange={(e) => handleFieldChange('inmuebles', 'notas', e.target.value)}
          placeholder="Descrivi i tuoi immobili (indirizzo, riferimento catastale, uso, ecc.)..."
          rows={5}
          disabled={!isEditable}
        />
      </div>
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
          {taxReturn.stato === 'bozza' && (
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

  const renderPlaceholder = (sectionName) => (
    <div className="text-center py-12 bg-slate-50 rounded-lg">
      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
      <p className="text-slate-500">Sezione "{sectionName}" in sviluppo</p>
      <p className="text-sm text-slate-400 mt-2">
        Questa sezione sarà disponibile nella prossima versione.
      </p>
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
            <p className="text-sm text-slate-500">
              {taxReturn.tipo_dichiarazione === 'individual' ? 'Individuale' : 'Congiunta'} • 
              <Badge className="ml-2" variant="outline">{taxReturn.stato}</Badge>
            </p>
          </div>
        </div>
        {isEditable && (
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
            {visibleSections.map((section, idx) => (
              <Button
                key={section.id}
                variant={idx === currentSection ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentSection(idx)}
                className={idx === currentSection ? 'bg-teal-600' : ''}
              >
                <section.icon className="w-4 h-4 mr-1" />
                <span className="hidden md:inline">{section.name}</span>
                <span className="md:hidden">{idx + 1}</span>
              </Button>
            ))}
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
