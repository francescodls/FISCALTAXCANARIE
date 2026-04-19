/**
 * Dichiarazione dei Redditi - Wizard Compilazione Cliente
 * Versione 2 - Step by Step con Firma Canvas
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
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
  Loader2,
  Upload,
  Trash2,
  RotateCcw,
  Download
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const saveTimeoutRef = useRef(null);
  const signatureRef = useRef(null);
  const fileInputRef = useRef(null);

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
        setAcceptedTerms(data.signature?.accepted_terms || false);
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

  // Salvataggio sezione
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

  // Aggiorna campo con auto-save (debounce 1.5s)
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Cancella firma
  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  // Salva firma
  const saveSignature = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast.error('Per favore, inserisci la tua firma');
      return;
    }

    if (!acceptedTerms) {
      toast.error('Devi accettare i termini e condizioni');
      return;
    }

    setSaving(true);
    try {
      const signatureImage = signatureRef.current.toDataURL('image/png');
      
      const formDataToSend = new FormData();
      formDataToSend.append('accepted_terms', 'true');
      formDataToSend.append('signature_image', signatureImage);

      const res = await fetch(`${API_URL}/api/declarations/v2/declarations/${id}/sign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (res.ok) {
        const updated = await res.json();
        setDeclaration(updated);
        toast.success('Firma salvata con successo!');
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Errore nel salvataggio della firma');
      }
    } catch (error) {
      toast.error('Errore di connessione');
    } finally {
      setSaving(false);
    }
  };

  // Invia dichiarazione
  const submitDeclaration = async () => {
    if (!declaration?.is_signed) {
      toast.error('Devi firmare la dichiarazione prima di inviarla');
      return;
    }

    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };

  // Render campi specifici per sezione
  const renderSectionFields = (sectionId, data) => {
    switch (sectionId) {
      case 'dati_personali':
        return (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Nome *</label>
              <Input
                value={data.nome || ''}
                onChange={(e) => updateField(sectionId, 'nome', e.target.value)}
                placeholder="Il tuo nome"
                data-testid="field-nome"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cognome *</label>
              <Input
                value={data.cognome || ''}
                onChange={(e) => updateField(sectionId, 'cognome', e.target.value)}
                placeholder="Il tuo cognome"
                data-testid="field-cognome"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Codice Fiscale / NIE *</label>
              <Input
                value={data.codice_fiscale || ''}
                onChange={(e) => updateField(sectionId, 'codice_fiscale', e.target.value.toUpperCase())}
                placeholder="Es. RSSMRA80A01H501Z"
                data-testid="field-codice-fiscale"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data di Nascita</label>
              <Input
                type="date"
                value={data.data_nascita || ''}
                onChange={(e) => updateField(sectionId, 'data_nascita', e.target.value)}
                data-testid="field-data-nascita"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Luogo di Nascita</label>
              <Input
                value={data.luogo_nascita || ''}
                onChange={(e) => updateField(sectionId, 'luogo_nascita', e.target.value)}
                placeholder="Citta di nascita"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nazionalita</label>
              <Input
                value={data.nazionalita || ''}
                onChange={(e) => updateField(sectionId, 'nazionalita', e.target.value)}
                placeholder="Es. Italiana"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Indirizzo di Residenza *</label>
              <Input
                value={data.indirizzo || ''}
                onChange={(e) => updateField(sectionId, 'indirizzo', e.target.value)}
                placeholder="Via, numero civico, CAP, Citta"
                data-testid="field-indirizzo"
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
              <label className="block text-sm font-medium mb-1">Email *</label>
              <Input
                type="email"
                value={data.email || ''}
                onChange={(e) => updateField(sectionId, 'email', e.target.value)}
                placeholder="email@esempio.com"
                data-testid="field-email"
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
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                data-testid="field-stato-civile"
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
              <label className="block text-sm font-medium mb-1">Eta Figli (se presenti)</label>
              <Input
                value={data.eta_figli || ''}
                onChange={(e) => updateField(sectionId, 'eta_figli', e.target.value)}
                placeholder="Es: 5, 12, 18"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Coniuge a Carico</label>
              <select
                value={data.coniuge_carico || ''}
                onChange={(e) => updateField(sectionId, 'coniuge_carico', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Seleziona...</option>
                <option value="si">Si</option>
                <option value="no">No</option>
              </select>
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
              <label className="block text-sm font-medium mb-1">Tipo di Reddito</label>
              <select
                value={data.tipo_reddito || ''}
                onChange={(e) => updateField(sectionId, 'tipo_reddito', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                data-testid="field-tipo-reddito"
              >
                <option value="">Seleziona...</option>
                <option value="dipendente">Lavoro Dipendente</option>
                <option value="pensione">Pensione</option>
                <option value="collaborazione">Collaborazione/CoCoCo</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Datore di Lavoro / Ente</label>
              <Input
                value={data.datore_lavoro || ''}
                onChange={(e) => updateField(sectionId, 'datore_lavoro', e.target.value)}
                placeholder="Nome azienda o ente pensionistico"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Reddito Lordo Annuo (EUR)</label>
                <Input
                  type="number"
                  value={data.reddito_lordo || ''}
                  onChange={(e) => updateField(sectionId, 'reddito_lordo', e.target.value)}
                  placeholder="Es. 35000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ritenute Subite (EUR)</label>
                <Input
                  type="number"
                  value={data.ritenute || ''}
                  onChange={(e) => updateField(sectionId, 'ritenute', e.target.value)}
                  placeholder="Es. 7000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hai la CU (Certificazione Unica)?</label>
              <select
                value={data.ha_cu || ''}
                onChange={(e) => updateField(sectionId, 'ha_cu', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Seleziona...</option>
                <option value="si">Si, la carichero nella sezione documenti</option>
                <option value="no">No, non l'ho ancora ricevuta</option>
              </select>
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

      case 'redditi_autonomo':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipologia Attivita</label>
              <select
                value={data.tipo_attivita || ''}
                onChange={(e) => updateField(sectionId, 'tipo_attivita', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Seleziona...</option>
                <option value="libero_professionista">Libero Professionista</option>
                <option value="impresa_individuale">Impresa Individuale</option>
                <option value="societa">Societa (SRL, SAS, ecc.)</option>
                <option value="occasionale">Prestazioni Occasionali</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Partita IVA (se presente)</label>
              <Input
                value={data.partita_iva || ''}
                onChange={(e) => updateField(sectionId, 'partita_iva', e.target.value)}
                placeholder="Es. IT12345678901"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Codice ATECO</label>
              <Input
                value={data.codice_ateco || ''}
                onChange={(e) => updateField(sectionId, 'codice_ateco', e.target.value)}
                placeholder="Es. 62.01.00"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Fatturato Annuo (EUR)</label>
                <Input
                  type="number"
                  value={data.fatturato || ''}
                  onChange={(e) => updateField(sectionId, 'fatturato', e.target.value)}
                  placeholder="Es. 50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Costi Deducibili (EUR)</label>
                <Input
                  type="number"
                  value={data.costi || ''}
                  onChange={(e) => updateField(sectionId, 'costi', e.target.value)}
                  placeholder="Es. 15000"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Regime Fiscale</label>
              <select
                value={data.regime_fiscale || ''}
                onChange={(e) => updateField(sectionId, 'regime_fiscale', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Seleziona...</option>
                <option value="forfettario">Regime Forfettario</option>
                <option value="ordinario">Regime Ordinario</option>
                <option value="semplificato">Contabilita Semplificata</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descrizione Attivita</label>
              <Textarea
                value={data.descrizione_attivita || ''}
                onChange={(e) => updateField(sectionId, 'descrizione_attivita', e.target.value)}
                placeholder="Descrivi brevemente la tua attivita"
                rows={3}
              />
            </div>
          </div>
        );

      case 'immobili':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                Inserisci le informazioni su ogni immobile di tua proprieta o in comproprieta.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Numero di Immobili Posseduti</label>
              <Input
                type="number"
                min="0"
                value={data.numero_immobili || ''}
                onChange={(e) => updateField(sectionId, 'numero_immobili', e.target.value)}
                placeholder="Es. 2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipologia Immobili</label>
              <Textarea
                value={data.tipologia_immobili || ''}
                onChange={(e) => updateField(sectionId, 'tipologia_immobili', e.target.value)}
                placeholder="Es: Appartamento a Milano (abitazione principale), Box auto a Roma"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valore Catastale Totale (EUR)</label>
              <Input
                type="number"
                value={data.valore_catastale || ''}
                onChange={(e) => updateField(sectionId, 'valore_catastale', e.target.value)}
                placeholder="Es. 150000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ubicazione Immobili (Italia/Estero)</label>
              <select
                value={data.ubicazione || ''}
                onChange={(e) => updateField(sectionId, 'ubicazione', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Seleziona...</option>
                <option value="italia">Solo in Italia</option>
                <option value="estero">Solo all'Estero</option>
                <option value="entrambi">Sia Italia che Estero</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note sugli Immobili</label>
              <Textarea
                value={data.note || ''}
                onChange={(e) => updateField(sectionId, 'note', e.target.value)}
                placeholder="Eventuali dettagli aggiuntivi (mutui, ristrutturazioni, ecc.)"
                rows={3}
              />
            </div>
          </div>
        );

      case 'canoni_locazione':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hai percepito affitti?</label>
              <select
                value={data.affitti_percepiti || ''}
                onChange={(e) => updateField(sectionId, 'affitti_percepiti', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Seleziona...</option>
                <option value="si">Si</option>
                <option value="no">No</option>
              </select>
            </div>
            {data.affitti_percepiti === 'si' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Totale Affitti Percepiti (EUR/anno)</label>
                  <Input
                    type="number"
                    value={data.totale_affitti_percepiti || ''}
                    onChange={(e) => updateField(sectionId, 'totale_affitti_percepiti', e.target.value)}
                    placeholder="Es. 12000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo di Contratto</label>
                  <select
                    value={data.tipo_contratto || ''}
                    onChange={(e) => updateField(sectionId, 'tipo_contratto', e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Seleziona...</option>
                    <option value="cedolare_secca">Cedolare Secca</option>
                    <option value="ordinario">Regime Ordinario</option>
                    <option value="transitorio">Transitorio</option>
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Hai pagato affitti (come inquilino)?</label>
              <select
                value={data.affitti_pagati || ''}
                onChange={(e) => updateField(sectionId, 'affitti_pagati', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Seleziona...</option>
                <option value="si">Si</option>
                <option value="no">No</option>
              </select>
            </div>
            {data.affitti_pagati === 'si' && (
              <div>
                <label className="block text-sm font-medium mb-1">Totale Affitti Pagati (EUR/anno)</label>
                <Input
                  type="number"
                  value={data.totale_affitti_pagati || ''}
                  onChange={(e) => updateField(sectionId, 'totale_affitti_pagati', e.target.value)}
                  placeholder="Es. 9600"
                />
              </div>
            )}
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

      case 'plusvalenze':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                Indica eventuali guadagni derivanti dalla vendita di beni (immobili, partecipazioni, ecc.)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hai realizzato plusvalenze nell'anno?</label>
              <select
                value={data.ha_plusvalenze || ''}
                onChange={(e) => updateField(sectionId, 'ha_plusvalenze', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Seleziona...</option>
                <option value="si">Si</option>
                <option value="no">No</option>
              </select>
            </div>
            {data.ha_plusvalenze === 'si' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipologia di Plusvalenza</label>
                  <select
                    value={data.tipo_plusvalenza || ''}
                    onChange={(e) => updateField(sectionId, 'tipo_plusvalenza', e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Seleziona...</option>
                    <option value="immobiliare">Vendita Immobili</option>
                    <option value="partecipazioni">Vendita Partecipazioni</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Importo Plusvalenza (EUR)</label>
                  <Input
                    type="number"
                    value={data.importo_plusvalenza || ''}
                    onChange={(e) => updateField(sectionId, 'importo_plusvalenza', e.target.value)}
                    placeholder="Es. 25000"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Descrizione Dettagliata</label>
              <Textarea
                value={data.descrizione || ''}
                onChange={(e) => updateField(sectionId, 'descrizione', e.target.value)}
                placeholder="Descrivi le operazioni che hanno generato plusvalenze"
                rows={3}
              />
            </div>
          </div>
        );

      case 'investimenti_finanziari':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Possiedi Investimenti Finanziari?</label>
              <select
                value={data.ha_investimenti || ''}
                onChange={(e) => updateField(sectionId, 'ha_investimenti', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Seleziona...</option>
                <option value="si">Si</option>
                <option value="no">No</option>
              </select>
            </div>
            {data.ha_investimenti === 'si' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipologie di Investimento</label>
                  <div className="space-y-2">
                    {['Azioni', 'Obbligazioni', 'Fondi/ETF', 'Conti Deposito', 'Polizze Vita', 'Altro'].map(tipo => (
                      <label key={tipo} className="flex items-center gap-2">
                        <Checkbox
                          checked={(data.tipologie || []).includes(tipo)}
                          onCheckedChange={(checked) => {
                            const current = data.tipologie || [];
                            const updated = checked 
                              ? [...current, tipo]
                              : current.filter(t => t !== tipo);
                            updateField(sectionId, 'tipologie', updated);
                          }}
                        />
                        <span className="text-sm">{tipo}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Valore Totale Portafoglio (EUR)</label>
                  <Input
                    type="number"
                    value={data.valore_portafoglio || ''}
                    onChange={(e) => updateField(sectionId, 'valore_portafoglio', e.target.value)}
                    placeholder="Es. 50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ubicazione Investimenti</label>
                  <select
                    value={data.ubicazione_investimenti || ''}
                    onChange={(e) => updateField(sectionId, 'ubicazione_investimenti', e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Seleziona...</option>
                    <option value="italia">Broker/Banca Italiana</option>
                    <option value="estero">Broker/Banca Estera</option>
                    <option value="entrambi">Sia Italia che Estero</option>
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <Textarea
                value={data.note || ''}
                onChange={(e) => updateField(sectionId, 'note', e.target.value)}
                placeholder="Eventuali dettagli aggiuntivi"
                rows={2}
              />
            </div>
          </div>
        );

      case 'criptomonete':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-800">
                Le criptovalute sono soggette a monitoraggio fiscale. Indica se possiedi o hai effettuato operazioni.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Possiedi Criptovalute?</label>
              <select
                value={data.ha_cripto || ''}
                onChange={(e) => updateField(sectionId, 'ha_cripto', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                data-testid="field-ha-cripto"
              >
                <option value="">Seleziona...</option>
                <option value="si">Si</option>
                <option value="no">No</option>
              </select>
            </div>
            {data.ha_cripto === 'si' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Criptovalute Possedute</label>
                  <Input
                    value={data.cripto_possedute || ''}
                    onChange={(e) => updateField(sectionId, 'cripto_possedute', e.target.value)}
                    placeholder="Es: Bitcoin, Ethereum, Solana"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Valore Totale al 31/12 (EUR)</label>
                  <Input
                    type="number"
                    value={data.valore_cripto || ''}
                    onChange={(e) => updateField(sectionId, 'valore_cripto', e.target.value)}
                    placeholder="Es. 10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hai effettuato vendite/conversioni?</label>
                  <select
                    value={data.ha_vendite_cripto || ''}
                    onChange={(e) => updateField(sectionId, 'ha_vendite_cripto', e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Seleziona...</option>
                    <option value="si">Si</option>
                    <option value="no">No</option>
                  </select>
                </div>
                {data.ha_vendite_cripto === 'si' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Plusvalenze/Minusvalenze Realizzate (EUR)</label>
                    <Input
                      type="number"
                      value={data.plusminus_cripto || ''}
                      onChange={(e) => updateField(sectionId, 'plusminus_cripto', e.target.value)}
                      placeholder="Es. 5000 (positivo) o -2000 (negativo)"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Exchange/Wallet Utilizzati</label>
                  <Input
                    value={data.exchange || ''}
                    onChange={(e) => updateField(sectionId, 'exchange', e.target.value)}
                    placeholder="Es: Binance, Coinbase, Ledger"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Note</label>
              <Textarea
                value={data.note || ''}
                onChange={(e) => updateField(sectionId, 'note', e.target.value)}
                placeholder="Eventuali dettagli aggiuntivi"
                rows={2}
              />
            </div>
          </div>
        );

      case 'spese_deducibili':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                Indica le spese sostenute che potrebbero essere deducibili o detraibili dalla dichiarazione.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Spese Mediche (EUR)</label>
                <Input
                  type="number"
                  value={data.spese_mediche || ''}
                  onChange={(e) => updateField(sectionId, 'spese_mediche', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Interessi Mutuo (EUR)</label>
                <Input
                  type="number"
                  value={data.interessi_mutuo || ''}
                  onChange={(e) => updateField(sectionId, 'interessi_mutuo', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assicurazioni Vita/Infortuni (EUR)</label>
                <Input
                  type="number"
                  value={data.assicurazioni || ''}
                  onChange={(e) => updateField(sectionId, 'assicurazioni', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Spese Istruzione (EUR)</label>
                <Input
                  type="number"
                  value={data.spese_istruzione || ''}
                  onChange={(e) => updateField(sectionId, 'spese_istruzione', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contributi Previdenziali (EUR)</label>
                <Input
                  type="number"
                  value={data.contributi_previdenziali || ''}
                  onChange={(e) => updateField(sectionId, 'contributi_previdenziali', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Donazioni/Erogazioni Liberali (EUR)</label>
                <Input
                  type="number"
                  value={data.donazioni || ''}
                  onChange={(e) => updateField(sectionId, 'donazioni', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Altre Spese Deducibili</label>
              <Textarea
                value={data.altre_spese || ''}
                onChange={(e) => updateField(sectionId, 'altre_spese', e.target.value)}
                placeholder="Indica altre spese deducibili non elencate sopra"
                rows={3}
              />
            </div>
          </div>
        );

      case 'deduzioni_agevolazioni':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hai usufruito di Bonus/Agevolazioni?</label>
              <select
                value={data.ha_bonus || ''}
                onChange={(e) => updateField(sectionId, 'ha_bonus', e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Seleziona...</option>
                <option value="si">Si</option>
                <option value="no">No</option>
              </select>
            </div>
            {data.ha_bonus === 'si' && (
              <div>
                <label className="block text-sm font-medium mb-1">Tipologie di Agevolazioni</label>
                <div className="space-y-2">
                  {[
                    'Bonus Ristrutturazione',
                    'Ecobonus',
                    'Superbonus 110%',
                    'Bonus Mobili',
                    'Bonus Verde',
                    'Bonus Facciate',
                    'Sismabonus',
                    'Altro'
                  ].map(bonus => (
                    <label key={bonus} className="flex items-center gap-2">
                      <Checkbox
                        checked={(data.bonus_utilizzati || []).includes(bonus)}
                        onCheckedChange={(checked) => {
                          const current = data.bonus_utilizzati || [];
                          const updated = checked 
                            ? [...current, bonus]
                            : current.filter(b => b !== bonus);
                          updateField(sectionId, 'bonus_utilizzati', updated);
                        }}
                      />
                      <span className="text-sm">{bonus}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Importo Totale Agevolazioni (EUR)</label>
              <Input
                type="number"
                value={data.importo_agevolazioni || ''}
                onChange={(e) => updateField(sectionId, 'importo_agevolazioni', e.target.value)}
                placeholder="Es. 10000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descrizione Agevolazioni</label>
              <Textarea
                value={data.descrizione_agevolazioni || ''}
                onChange={(e) => updateField(sectionId, 'descrizione_agevolazioni', e.target.value)}
                placeholder="Descrivi le agevolazioni di cui hai usufruito"
                rows={3}
              />
            </div>
          </div>
        );

      case 'note_aggiuntive':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border">
              <p className="text-sm text-slate-600">
                Utilizza questo spazio per comunicare al commercialista informazioni aggiuntive 
                che ritieni rilevanti per la tua dichiarazione dei redditi.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Note e Comunicazioni</label>
              <Textarea
                value={data.note || ''}
                onChange={(e) => updateField(sectionId, 'note', e.target.value)}
                placeholder="Scrivi qui le tue note..."
                rows={6}
                data-testid="field-note-aggiuntive"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Domande per il Commercialista</label>
              <Textarea
                value={data.domande || ''}
                onChange={(e) => updateField(sectionId, 'domande', e.target.value)}
                placeholder="Hai domande specifiche? Scrivile qui."
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Descrizione</label>
              <Textarea
                value={data.descrizione || ''}
                onChange={(e) => updateField(sectionId, 'descrizione', e.target.value)}
                placeholder="Inserisci i dettagli..."
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Importo (EUR)</label>
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

  // Upload documento
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);

  // Carica lista documenti
  const fetchDocuments = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/declarations/${id}/documents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const docs = await res.json();
        setDocuments(docs);
      }
    } catch (e) {
      console.error('Errore caricamento documenti:', e);
    }
  }, [id, token]);

  useEffect(() => {
    if (declaration) {
      fetchDocuments();
    }
  }, [declaration, fetchDocuments]);

  // Upload file
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setUploading(true);
    let successCount = 0;
    
    for (const file of files) {
      // Validazione
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error(`${file.name}: File troppo grande (max 10MB)`);
        continue;
      }
      
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
        toast.error(`${file.name}: Formato non supportato`);
        continue;
      }
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'generale');
        formData.append('description', '');
        
        const res = await fetch(`${API_URL}/api/declarations/v2/declarations/${id}/documents`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        
        if (res.ok) {
          successCount++;
        } else {
          const err = await res.json();
          toast.error(`${file.name}: ${err.detail || 'Errore upload'}`);
        }
      } catch (e) {
        toast.error(`${file.name}: Errore di connessione`);
      }
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} file caricati con successo`);
      fetchDocuments();
      fetchDeclaration(); // Aggiorna contatore
    }
    
    setUploading(false);
  };

  // Elimina documento
  const deleteDocument = async (docId, docName) => {
    if (!confirm(`Eliminare "${docName}"?`)) return;
    
    try {
      const res = await fetch(`${API_URL}/api/declarations/v2/declarations/${id}/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        toast.success('Documento eliminato');
        fetchDocuments();
        fetchDeclaration();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Errore eliminazione');
      }
    } catch (e) {
      toast.error('Errore di connessione');
    }
  };

  // Sezione documenti
  const renderDocumentsSection = () => {
    const sectionData = formData['documenti_allegati'] || {};
    const isNotApplicable = sectionData.not_applicable;
    const canUpload = declaration?.status === 'bozza' || declaration?.status === 'documentazione_incompleta';

    return (
      <div className="space-y-6">
        {/* Toggle "Non applicabile" */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
          <div>
            <p className="font-medium text-slate-900">Non ho documenti da caricare</p>
            <p className="text-sm text-slate-500">
              Seleziona se non hai documenti da allegare
            </p>
          </div>
          <Checkbox
            checked={isNotApplicable}
            onCheckedChange={(checked) => toggleNotApplicable('documenti_allegati', checked)}
            data-testid="not-applicable-documenti"
          />
        </div>

        {!isNotApplicable && (
          <>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                Carica qui tutti i documenti necessari: CU, fatture, ricevute, visure catastali, ecc.
                Formati accettati: PDF, JPG, PNG (max 10MB per file).
              </p>
            </div>

            {/* Area upload */}
            {canUpload && (
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-teal-400 transition-colors cursor-pointer"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-teal-400', 'bg-teal-50'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('border-teal-400', 'bg-teal-50'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-teal-400', 'bg-teal-50');
                  handleFileUpload(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-12 h-12 text-teal-500 mx-auto mb-4 animate-spin" />
                    <p className="text-teal-600">Caricamento in corso...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 mb-2">
                      Trascina i file qui o clicca per selezionarli
                    </p>
                    <p className="text-xs text-slate-400 mb-4">
                      PDF, JPG, PNG - Max 10MB per file
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  data-testid="file-upload-input"
                />
              </div>
            )}

            {/* Lista documenti caricati */}
            {documents.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-slate-900">Documenti caricati ({documents.length})</h4>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div 
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-teal-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 truncate">{doc.filename}</p>
                          <p className="text-xs text-slate-500">
                            {(doc.file_size / 1024).toFixed(1)} KB - {new Date(doc.created_at).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a
                          href={`${API_URL}/api/declarations/v2/declarations/${id}/documents/${doc.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-slate-100 rounded-lg"
                          title="Scarica"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="w-4 h-4 text-slate-600" />
                        </a>
                        {canUpload && (
                          <button
                            onClick={() => deleteDocument(doc.id, doc.filename)}
                            className="p-2 hover:bg-red-100 rounded-lg"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {documents.length === 0 && !canUpload && (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Nessun documento caricato</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Note sui documenti</label>
              <Textarea
                value={sectionData.data?.note || ''}
                onChange={(e) => updateField('documenti_allegati', 'note', e.target.value)}
                placeholder="Descrivi brevemente i documenti caricati"
                rows={2}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button
                variant={sectionData.completed ? "outline" : "default"}
                onClick={() => markCompleted('documenti_allegati', !sectionData.completed)}
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
          </>
        )}
      </div>
    );
  };

  // Sezione firma
  const renderSignatureSection = () => {
    const signature = declaration?.signature || {};
    const completedSections = SECTIONS.filter(s => {
      if (s.id === 'autorizzazione_firma') return false;
      const sd = formData[s.id] || {};
      return sd.completed || sd.not_applicable;
    }).length;
    const totalSections = SECTIONS.length - 1;
    const canSign = completedSections >= Math.ceil(totalSections * 0.5);

    return (
      <div className="space-y-6">
        {/* Riepilogo completamento */}
        <div className={`p-4 rounded-lg border ${canSign ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {canSign ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            <span className={`font-medium ${canSign ? 'text-green-800' : 'text-yellow-800'}`}>
              {completedSections}/{totalSections} sezioni completate
            </span>
          </div>
          <p className={`text-sm ${canSign ? 'text-green-700' : 'text-yellow-700'}`}>
            {canSign 
              ? 'Puoi procedere con la firma della dichiarazione.'
              : 'Completa almeno il 50% delle sezioni prima di firmare.'}
          </p>
        </div>

        {/* Termini e condizioni */}
        <div className="p-4 bg-slate-50 rounded-lg border">
          <h4 className="font-semibold mb-3">Autorizzazione al Trattamento Dati</h4>
          <div className="text-sm text-slate-600 space-y-2 mb-4 max-h-40 overflow-y-auto">
            <p>
              Autorizzo Fiscal Tax Canarie S.L. al trattamento dei miei dati personali 
              ai fini della predisposizione e presentazione della dichiarazione dei redditi,
              in conformita al GDPR (Regolamento UE 2016/679) e alla normativa vigente in materia di protezione dei dati.
            </p>
            <p>
              Dichiaro che le informazioni fornite in questa dichiarazione sono veritiere e complete,
              e mi impegno a fornire eventuale documentazione integrativa su richiesta.
            </p>
            <p>
              Sono consapevole che la responsabilita delle informazioni dichiarate rimane in capo al sottoscritto.
            </p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              id="accept-terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked)}
              disabled={!canSign || declaration?.is_signed}
              data-testid="accept-terms-checkbox"
            />
            <span className="text-sm font-medium">
              Accetto i termini e le condizioni
            </span>
          </label>
        </div>

        {/* Area firma */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-semibold mb-4">Firma Autografa</h4>
          
          {declaration?.is_signed ? (
            // Mostra firma salvata
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">Dichiarazione Firmata</span>
                </div>
                <p className="text-sm text-green-700">
                  Firmata il {new Date(signature.signed_at).toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              {signature.signature_image && (
                <div className="border rounded-lg p-2 bg-white">
                  <img 
                    src={signature.signature_image} 
                    alt="Firma" 
                    className="max-h-32 mx-auto"
                  />
                </div>
              )}
            </div>
          ) : (
            // Area per nuova firma
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {canSign 
                  ? 'Firma con il mouse o il dito nel riquadro sottostante.'
                  : 'Completa prima le sezioni richieste per abilitare la firma.'}
              </p>
              
              <div className={`border-2 rounded-lg bg-white ${canSign ? 'border-slate-300' : 'border-slate-200 opacity-50'}`}>
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: 'w-full h-40 touch-none',
                    style: { 
                      width: '100%', 
                      height: '160px',
                      touchAction: 'none'
                    }
                  }}
                  penColor="black"
                  backgroundColor="white"
                  data-testid="signature-canvas"
                />
              </div>

              <div className="flex justify-between gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearSignature}
                  disabled={!canSign}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Cancella
                </Button>
                <Button
                  onClick={saveSignature}
                  disabled={!canSign || !acceptedTerms || saving}
                  className="bg-teal-600 hover:bg-teal-700"
                  data-testid="save-signature-btn"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Salva Firma
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render sezione generica
  const renderSectionContent = (section) => {
    const sectionData = formData[section.id] || {};
    const data = sectionData.data || {};
    const isNotApplicable = sectionData.not_applicable;

    // Sezione autorizzazione/firma
    if (section.id === 'autorizzazione_firma') {
      return renderSignatureSection();
    }

    // Sezione documenti
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
                data-testid={`complete-${section.id}`}
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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-slate-600">Caricamento dichiarazione...</p>
        </div>
      </div>
    );
  }

  const currentSection = SECTIONS[currentStep];
  const Icon = currentSection.icon;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header fisso */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate('/declarations')}
              className="gap-2"
              data-testid="back-to-list-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Torna alla lista</span>
            </Button>
            <div className="flex items-center gap-3">
              {saving && (
                <span className="text-sm text-slate-500 flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Salvataggio...</span>
                </span>
              )}
              <Badge 
                variant="outline" 
                className={declaration?.completion_percentage >= 100 ? 'bg-green-50 text-green-700 border-green-300' : ''}
              >
                {declaration?.completion_percentage || 0}% completato
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps - Scrollabile orizzontalmente */}
      <div className="bg-white border-b sticky top-[65px] z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex overflow-x-auto gap-1 pb-2 -mx-4 px-4 scrollbar-hide">
            {SECTIONS.map((section, index) => {
              const sectionData = formData[section.id] || {};
              const isComplete = sectionData.completed || sectionData.not_applicable;
              const isCurrent = index === currentStep;
              const SectionIcon = section.icon;

              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setCurrentStep(index);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                    ${isCurrent ? 'bg-teal-100 text-teal-800 font-medium shadow-sm' : ''}
                    ${isComplete && !isCurrent ? 'bg-green-50 text-green-700' : ''}
                    ${!isComplete && !isCurrent ? 'text-slate-500 hover:bg-slate-100' : ''}
                  `}
                  data-testid={`step-${section.id}`}
                >
                  <SectionIcon className="w-4 h-4" />
                  <span className="hidden sm:inline whitespace-nowrap">{section.name}</span>
                  <span className="sm:hidden">{index + 1}</span>
                  {isComplete && <Check className="w-3 h-3 text-green-600" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-teal-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-7 h-7 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-xl">{currentSection.name}</CardTitle>
                <p className="text-sm text-slate-500 mt-1">{currentSection.description}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {renderSectionContent(currentSection)}
          </CardContent>
        </Card>

        {/* Navigazione */}
        <div className="flex justify-between items-center mt-6 gap-4">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentStep === 0}
            className="gap-2"
            data-testid="prev-step-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Precedente</span>
          </Button>

          <span className="text-sm text-slate-500">
            {currentStep + 1} / {SECTIONS.length}
          </span>

          {currentStep === SECTIONS.length - 1 ? (
            <Button
              className="bg-teal-600 hover:bg-teal-700 gap-2"
              disabled={!declaration?.is_signed || declaration?.status !== 'bozza' || submitting}
              onClick={submitDeclaration}
              data-testid="submit-declaration-btn"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Invio...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Invia Dichiarazione</span>
                  <span className="sm:hidden">Invia</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              className="bg-teal-600 hover:bg-teal-700 gap-2"
              onClick={goNext}
              data-testid="next-step-btn"
            >
              <span className="hidden sm:inline">Successivo</span>
              <span className="sm:hidden">Avanti</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Footer mobile con info stato */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 sm:hidden z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {declaration?.is_signed ? (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle className="w-3 h-3 mr-1" />
                Firmata
              </Badge>
            ) : (
              <Badge variant="outline">
                Non firmata
              </Badge>
            )}
          </div>
          <div className="text-sm text-slate-500">
            Anno {declaration?.anno_fiscale}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeclarationWizard;
