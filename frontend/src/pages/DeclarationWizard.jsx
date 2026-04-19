/**
 * Dichiarazione dei Redditi - Wizard Compilazione Cliente
 * Nuova implementazione v2 - Step by Step
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  X,
  User,
  Users,
  Briefcase,
  Building,
  Home,
  TrendingUp,
  PiggyBank,
  Bitcoin,
  Receipt,
  Gift,
  FileText,
  StickyNote,
  PenTool,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Configurazione sezioni
const SECTIONS = [
  { id: 'dati_personali', name: 'Dati Personali', icon: User, description: 'Informazioni anagrafiche e residenza' },
  { id: 'situazione_familiare', name: 'Situazione Familiare', icon: Users, description: 'Stato civile e familiari a carico' },
  { id: 'redditi_lavoro', name: 'Redditi da Lavoro', icon: Briefcase, description: 'Stipendi, pensioni, CU' },
  { id: 'redditi_autonomo', name: 'Redditi Autonomo', icon: Building, description: 'Attività economica, P.IVA' },
  { id: 'immobili', name: 'Immobili', icon: Home, description: 'Proprietà immobiliari' },
  { id: 'canoni_locazione', name: 'Canoni di Locazione', icon: Receipt, description: 'Affitti percepiti o pagati' },
  { id: 'plusvalenze', name: 'Plusvalenze', icon: TrendingUp, description: 'Guadagni da vendite' },
  { id: 'investimenti_finanziari', name: 'Investimenti', icon: PiggyBank, description: 'Azioni, fondi, obbligazioni' },
  { id: 'criptomonete', name: 'Criptomonete', icon: Bitcoin, description: 'Bitcoin, Ethereum, etc.' },
  { id: 'spese_deducibili', name: 'Spese Deducibili', icon: Receipt, description: 'Spese mediche, interessi, etc.' },
  { id: 'deduzioni_agevolazioni', name: 'Deduzioni', icon: Gift, description: 'Bonus e agevolazioni fiscali' },
  { id: 'documenti_allegati', name: 'Documenti', icon: FileText, description: 'Carica documenti necessari' },
  { id: 'note_aggiuntive', name: 'Note', icon: StickyNote, description: 'Informazioni aggiuntive' },
  { id: 'autorizzazione_firma', name: 'Firma', icon: PenTool, description: 'Autorizzazione e firma finale' },
];

const DeclarationWizard = ({ token }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [declaration, setDeclaration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});
  const saveTimeoutRef = useRef(null);

  // Carica dichiarazione
  const fetchDeclaration = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/declarations/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDeclaration(data);
        setFormData(data.sections || {});
      } else {
        toast.error('Dichiarazione non trovata');
        navigate('/declarations');
      }
    } catch (error) {
      toast.error('Errore caricamento');
      navigate('/declarations');
    } finally {
      setLoading(false);
    }
  }, [id, token, navigate]);

  useEffect(() => {
    fetchDeclaration();
  }, [fetchDeclaration]);

  // Salvataggio automatico con debounce
  const saveSection = useCallback(async (sectionId, sectionData) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/declarations/${id}/section`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          section_name: sectionId,
          section_data: sectionData
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setDeclaration(updated);
      }
    } catch (error) {
      console.error('Errore salvataggio:', error);
    } finally {
      setSaving(false);
    }
  }, [id, token]);

  // Aggiorna campo con auto-save
  const updateField = (sectionId, field, value) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          data: {
            ...(prev[sectionId]?.data || {}),
            [field]: value
          }
        }
      };

      // Debounce salvataggio
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveSection(sectionId, newData[sectionId]);
      }, 1500);

      return newData;
    });
  };

  // Toggle "non applicabile"
  const toggleNotApplicable = (sectionId, value) => {
    const sectionData = {
      ...formData[sectionId],
      not_applicable: value,
      completed: value
    };
    setFormData(prev => ({ ...prev, [sectionId]: sectionData }));
    saveSection(sectionId, sectionData);
  };

  // Segna come completato
  const markCompleted = (sectionId, completed) => {
    const sectionData = {
      ...formData[sectionId],
      completed
    };
    setFormData(prev => ({ ...prev, [sectionId]: sectionData }));
    saveSection(sectionId, sectionData);
  };

  // Navigazione
  const goNext = () => {
    if (currentStep < SECTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render sezione generica
  const renderSectionContent = (section) => {
    const sectionData = formData[section.id] || {};
    const data = sectionData.data || {};
    const isNotApplicable = sectionData.not_applicable;

    // Sezione autorizzazione/firma - gestita separatamente
    if (section.id === 'autorizzazione_firma') {
      return renderSignatureSection();
    }

    // Sezione documenti - gestita separatamente
    if (section.id === 'documenti_allegati') {
      return renderDocumentsSection();
    }

    return (
      <div className="space-y-6">
        {/* Toggle "Non applicabile" */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
          <div>
            <p className="font-medium text-slate-900">Non ho questa tipologia</p>
            <p className="text-sm text-slate-500">
              Seleziona se non hai redditi/spese in questa categoria
            </p>
          </div>
          <Checkbox
            checked={isNotApplicable}
            onCheckedChange={(checked) => toggleNotApplicable(section.id, checked)}
            data-testid={`not-applicable-${section.id}`}
          />
        </div>

        {!isNotApplicable && (
          <div className="space-y-4">
            {renderSectionFields(section.id, data)}
            
            {/* Pulsante completa sezione */}
            <div className="flex justify-end pt-4">
              <Button
                variant={sectionData.completed ? "outline" : "default"}
                onClick={() => markCompleted(section.id, !sectionData.completed)}
                className={sectionData.completed ? "border-green-500 text-green-600" : "bg-teal-600 hover:bg-teal-700"}
              >
                {sectionData.completed ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Completata
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Segna come completata
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Campi specifici per sezione
  const renderSectionFields = (sectionId, data) => {
    switch (sectionId) {
      case 'dati_personali':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Nome</label>
              <Input
                value={data.nome || ''}
                onChange={(e) => updateField(sectionId, 'nome', e.target.value)}
                placeholder="Il tuo nome"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cognome</label>
              <Input
                value={data.cognome || ''}
                onChange={(e) => updateField(sectionId, 'cognome', e.target.value)}
                placeholder="Il tuo cognome"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Codice Fiscale / NIE</label>
              <Input
                value={data.codice_fiscale || ''}
                onChange={(e) => updateField(sectionId, 'codice_fiscale', e.target.value)}
                placeholder="Es. RSSMRA80A01H501Z"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data di Nascita</label>
              <Input
                type="date"
                value={data.data_nascita || ''}
                onChange={(e) => updateField(sectionId, 'data_nascita', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Luogo di Nascita</label>
              <Input
                value={data.luogo_nascita || ''}
                onChange={(e) => updateField(sectionId, 'luogo_nascita', e.target.value)}
                placeholder="Città di nascita"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nazionalità</label>
              <Input
                value={data.nazionalita || ''}
                onChange={(e) => updateField(sectionId, 'nazionalita', e.target.value)}
                placeholder="Es. Italiana"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Indirizzo di Residenza</label>
              <Input
                value={data.indirizzo || ''}
                onChange={(e) => updateField(sectionId, 'indirizzo', e.target.value)}
                placeholder="Via, numero civico, CAP, Città"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Telefono</label>
              <Input
                value={data.telefono || ''}
                onChange={(e) => updateField(sectionId, 'telefono', e.target.value)}
                placeholder="+34 612 345 678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={data.email || ''}
                onChange={(e) => updateField(sectionId, 'email', e.target.value)}
                placeholder="email@esempio.com"
              />
            </div>
          </div>
        );

      case 'situazione_familiare':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Stato Civile</label>
              <select
                value={data.stato_civile || ''}
                onChange={(e) => updateField(sectionId, 'stato_civile', e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Seleziona...</option>
                <option value="celibe_nubile">Celibe/Nubile</option>
                <option value="coniugato">Coniugato/a</option>
                <option value="separato">Separato/a</option>
                <option value="divorziato">Divorziato/a</option>
                <option value="vedovo">Vedovo/a</option>
                <option value="unione_civile">Unione Civile</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Numero Figli a Carico</label>
              <Input
                type="number"
                min="0"
                value={data.figli_carico || ''}
                onChange={(e) => updateField(sectionId, 'figli_carico', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Altri Familiari a Carico</label>
              <Textarea
                value={data.altri_familiari || ''}
                onChange={(e) => updateField(sectionId, 'altri_familiari', e.target.value)}
                placeholder="Descrivi eventuali altri familiari a carico (genitori, ecc.)"
                rows={3}
              />
            </div>
          </div>
        );

      case 'redditi_lavoro':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo di Contratto</label>
              <select
                value={data.tipo_contratto || ''}
                onChange={(e) => updateField(sectionId, 'tipo_contratto', e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">Seleziona...</option>
                <option value="dipendente">Dipendente</option>
                <option value="pensione">Pensione</option>
                <option value="collaborazione">Collaborazione</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Datore di Lavoro / Ente Pensionistico</label>
              <Input
                value={data.datore_lavoro || ''}
                onChange={(e) => updateField(sectionId, 'datore_lavoro', e.target.value)}
                placeholder="Nome azienda o ente"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reddito Lordo Annuo (€)</label>
              <Input
                type="number"
                value={data.reddito_lordo || ''}
                onChange={(e) => updateField(sectionId, 'reddito_lordo', e.target.value)}
                placeholder="Es. 35000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note Aggiuntive</label>
              <Textarea
                value={data.note || ''}
                onChange={(e) => updateField(sectionId, 'note', e.target.value)}
                placeholder="Eventuali dettagli aggiuntivi"
                rows={3}
              />
            </div>
          </div>
        );

      // Per le altre sezioni, un form generico
      default:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Descrizione</label>
              <Textarea
                value={data.descrizione || ''}
                onChange={(e) => updateField(sectionId, 'descrizione', e.target.value)}
                placeholder={`Descrivi i tuoi ${section.name.toLowerCase()}...`}
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Importo Totale (€)</label>
              <Input
                type="number"
                value={data.importo || ''}
                onChange={(e) => updateField(sectionId, 'importo', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <Textarea
                value={data.note || ''}
                onChange={(e) => updateField(sectionId, 'note', e.target.value)}
                placeholder="Eventuali note aggiuntive"
                rows={2}
              />
            </div>
          </div>
        );
    }
  };

  // Sezione documenti
  const renderDocumentsSection = () => {
    return (
      <div className="space-y-4">
        <p className="text-slate-600">
          Carica qui tutti i documenti necessari per la tua dichiarazione.
        </p>
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">
            Trascina i file qui o clicca per selezionarli
          </p>
          <Button variant="outline">
            Seleziona File
          </Button>
        </div>
        <p className="text-sm text-slate-500">
          Formati accettati: PDF, JPG, PNG. Max 10MB per file.
        </p>
      </div>
    );
  };

  // Sezione firma
  const renderSignatureSection = () => {
    const signature = declaration?.signature || {};
    const canSign = declaration?.completion_percentage >= 50;

    return (
      <div className="space-y-6">
        {!canSign && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600 inline mr-2" />
            <span className="text-yellow-800">
              Completa almeno il 50% delle sezioni prima di firmare.
            </span>
          </div>
        )}

        <div className="p-4 bg-slate-50 rounded-lg border">
          <h4 className="font-semibold mb-2">Autorizzazione al Trattamento</h4>
          <p className="text-sm text-slate-600 mb-4">
            Autorizzo Fiscal Tax Canarie S.L. al trattamento dei miei dati personali 
            ai fini della predisposizione e presentazione della dichiarazione dei redditi,
            in conformità al GDPR e alla normativa vigente.
          </p>
          <div className="flex items-center gap-2">
            <Checkbox
              id="accept-terms"
              checked={signature.accepted_terms}
              disabled={!canSign}
            />
            <label htmlFor="accept-terms" className="text-sm">
              Accetto i termini e le condizioni
            </label>
          </div>
        </div>

        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-4">Firma Digitale</h4>
          <div className="border rounded-lg h-40 bg-white flex items-center justify-center">
            <p className="text-slate-400">
              {canSign ? 'Firma qui con il mouse o il dito' : 'Completa prima le sezioni richieste'}
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" disabled={!canSign}>
              Cancella
            </Button>
          </div>
        </div>

        {signature.accepted_terms && signature.signature_image && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 inline mr-2" />
            <span className="text-green-800">
              Dichiarazione firmata il {new Date(signature.signed_at).toLocaleDateString('it-IT')}
            </span>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  const currentSection = SECTIONS[currentStep];
  const Icon = currentSection.icon;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/declarations')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Torna alla lista
            </Button>
            <div className="flex items-center gap-2">
              {saving && (
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvataggio...
                </span>
              )}
              <Badge variant="outline">
                {declaration?.completion_percentage}% completato
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex overflow-x-auto gap-1 pb-2">
            {SECTIONS.map((section, index) => {
              const sectionData = formData[section.id] || {};
              const isComplete = sectionData.completed || sectionData.not_applicable;
              const isCurrent = index === currentStep;
              const SectionIcon = section.icon;

              return (
                <button
                  key={section.id}
                  onClick={() => setCurrentStep(index)}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                    ${isCurrent ? 'bg-teal-100 text-teal-800 font-medium' : ''}
                    ${isComplete && !isCurrent ? 'bg-green-50 text-green-700' : ''}
                    ${!isComplete && !isCurrent ? 'text-slate-500 hover:bg-slate-100' : ''}
                  `}
                  data-testid={`step-${section.id}`}
                >
                  <SectionIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{section.name}</span>
                  {isComplete && <Check className="w-3 h-3 text-green-600" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                <Icon className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <CardTitle>{currentSection.name}</CardTitle>
                <p className="text-sm text-slate-500">{currentSection.description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {renderSectionContent(currentSection)}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Precedente
          </Button>

          {currentStep === SECTIONS.length - 1 ? (
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              disabled={!declaration?.is_signed || declaration?.status !== 'bozza'}
              onClick={async () => {
                try {
                  const res = await fetch(`${API_URL}/api/declarations/v2/declarations/${id}/submit`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  if (res.ok) {
                    toast.success('Dichiarazione inviata con successo!');
                    navigate('/declarations');
                  } else {
                    const err = await res.json();
                    toast.error(err.detail || 'Errore invio');
                  }
                } catch (e) {
                  toast.error('Errore di connessione');
                }
              }}
            >
              <Send className="w-4 h-4 mr-2" />
              Invia Dichiarazione
            </Button>
          ) : (
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={goNext}
            >
              Successivo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeclarationWizard;
