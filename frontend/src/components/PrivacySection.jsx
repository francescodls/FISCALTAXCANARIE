import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { 
  Shield, 
  Lock, 
  FileText, 
  CheckCircle, 
  ExternalLink, 
  Send, 
  Clock,
  Eye,
  Edit,
  Trash2,
  Download,
  Info,
  AlertCircle,
  User,
  Mail,
  Phone,
  MapPin,
  Scale,
  Database,
  Server,
  UserCheck,
  FileCheck,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// URL Privacy Policy ufficiale
const PRIVACY_POLICY_URL = 'https://fiscaltaxcanarie.com/privacy-policy/';

// Tipi di richiesta privacy
const REQUEST_TYPES = [
  { value: 'access', label: 'Accesso ai miei dati', icon: Eye },
  { value: 'rectification', label: 'Rettifica dati errati', icon: Edit },
  { value: 'erasure', label: 'Cancellazione dati', icon: Trash2 },
  { value: 'restriction', label: 'Limitazione del trattamento', icon: Lock },
  { value: 'portability', label: 'Portabilità dei dati', icon: Download },
  { value: 'info', label: 'Informazioni sul trattamento', icon: Info },
  { value: 'other', label: 'Altra richiesta', icon: HelpCircle }
];

// Diritti dell'interessato
const RIGHTS_INFO = [
  {
    icon: Eye,
    title: 'Diritto di Accesso',
    description: 'Hai il diritto di ottenere conferma che sia o meno in corso un trattamento di dati personali che ti riguardano e, in tal caso, di ottenere l\'accesso a tali dati.'
  },
  {
    icon: Edit,
    title: 'Diritto di Rettifica',
    description: 'Hai il diritto di ottenere la rettifica dei dati personali inesatti che ti riguardano e l\'integrazione dei dati personali incompleti.'
  },
  {
    icon: Trash2,
    title: 'Diritto alla Cancellazione',
    description: 'Hai il diritto di ottenere la cancellazione dei dati personali che ti riguardano, nei limiti previsti dalla normativa applicabile.'
  },
  {
    icon: Lock,
    title: 'Diritto di Limitazione',
    description: 'Hai il diritto di ottenere la limitazione del trattamento quando ricorrono determinate condizioni previste dalla legge.'
  },
  {
    icon: Download,
    title: 'Diritto alla Portabilità',
    description: 'Hai il diritto di ricevere i dati personali che ti riguardano in un formato strutturato, di uso comune e leggibile da dispositivo automatico.'
  },
  {
    icon: AlertCircle,
    title: 'Diritto di Opposizione',
    description: 'Hai il diritto di opporti in qualsiasi momento al trattamento dei dati personali che ti riguardano per motivi legittimi.'
  }
];

const PrivacySection = ({ token, user, documents = [] }) => {
  const [privacyConsent, setPrivacyConsent] = useState(null);
  const [privacyRequests, setPrivacyRequests] = useState([]);
  const [documentStats, setDocumentStats] = useState({ total: 0, categories: {} });
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showRightsDialog, setShowRightsDialog] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  
  // Form states
  const [requestForm, setRequestForm] = useState({
    request_type: '',
    subject: '',
    message: ''
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [acceptingConsent, setAcceptingConsent] = useState(false);

  useEffect(() => {
    fetchPrivacyData();
    calculateDocumentStats();
  }, [documents]);

  const fetchPrivacyData = async () => {
    setLoading(true);
    try {
      // Fetch consent status
      const consentRes = await fetch(`${API_URL}/api/privacy/consent`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (consentRes.ok) {
        const consentData = await consentRes.json();
        setPrivacyConsent(consentData);
      }

      // Fetch privacy requests history
      const requestsRes = await fetch(`${API_URL}/api/privacy/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setPrivacyRequests(requestsData);
      }
    } catch (error) {
      console.error('Errore caricamento dati privacy:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDocumentStats = () => {
    const stats = {
      total: documents.length,
      categories: {}
    };
    
    documents.forEach(doc => {
      const cat = doc.folder_name || doc.categoria || 'Altro';
      stats.categories[cat] = (stats.categories[cat] || 0) + 1;
    });
    
    setDocumentStats(stats);
  };

  const handleAcceptConsent = async () => {
    setAcceptingConsent(true);
    try {
      const res = await fetch(`${API_URL}/api/privacy/consent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          consent_type: 'privacy_policy',
          accepted: true,
          policy_url: PRIVACY_POLICY_URL
        })
      });
      
      if (!res.ok) throw new Error('Errore salvataggio consenso');
      
      const data = await res.json();
      setPrivacyConsent(data);
      setShowConsentDialog(false);
      toast.success('Consenso privacy registrato con successo');
    } catch (error) {
      toast.error('Errore nel salvataggio del consenso');
    } finally {
      setAcceptingConsent(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestForm.request_type || !requestForm.message) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }
    
    setSubmittingRequest(true);
    try {
      const res = await fetch(`${API_URL}/api/privacy/requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestForm)
      });
      
      if (!res.ok) throw new Error('Errore invio richiesta');
      
      const data = await res.json();
      setPrivacyRequests([data, ...privacyRequests]);
      setShowRequestDialog(false);
      setRequestForm({ request_type: '', subject: '', message: '' });
      toast.success('Richiesta privacy inviata con successo! Riceverai una risposta via email.');
    } catch (error) {
      toast.error('Errore nell\'invio della richiesta');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const getRequestTypeLabel = (type) => {
    const found = REQUEST_TYPES.find(t => t.value === type);
    return found ? found.label : type;
  };

  const getRequestStatusBadge = (status) => {
    const config = {
      pending: { label: 'In attesa', className: 'bg-amber-100 text-amber-700' },
      processing: { label: 'In elaborazione', className: 'bg-blue-100 text-blue-700' },
      completed: { label: 'Completata', className: 'bg-green-100 text-green-700' },
      rejected: { label: 'Respinta', className: 'bg-red-100 text-red-700' }
    };
    const cfg = config[status] || config.pending;
    return <Badge className={cfg.className}>{cfg.label}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="privacy-section">
      {/* Header Privacy */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-100 rounded-full">
            <Shield className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Privacy e Dati Personali</h2>
            <p className="text-sm text-slate-500">
              Gestisci i tuoi dati e i consensi in modo trasparente e sicuro
            </p>
          </div>
        </div>
        <Button 
          variant="outline"
          onClick={() => window.open(PRIVACY_POLICY_URL, '_blank')}
          className="border-teal-200 text-teal-700 hover:bg-teal-50"
        >
          <FileText className="h-4 w-4 mr-2" />
          Leggi l'Informativa Privacy
          <ExternalLink className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Security Banner */}
      <Card className="bg-gradient-to-r from-slate-50 to-teal-50 border-teal-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Lock className="h-5 w-5 text-teal-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-700">
                <strong>I tuoi dati sono protetti.</strong> Tutti i documenti e le informazioni personali sono trattati 
                in modo riservato e sicuro, nel rispetto del Regolamento UE 2016/679 (GDPR) e della normativa spagnola vigente.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-teal-600">
              <CheckCircle className="h-4 w-4" />
              <span>Ambiente protetto</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card Consenso Privacy */}
        <Card className={`border-2 ${privacyConsent?.accepted ? 'border-green-200 bg-green-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className={`h-5 w-5 ${privacyConsent?.accepted ? 'text-green-600' : 'text-amber-600'}`} />
              Consenso Privacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {privacyConsent?.accepted ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Informativa accettata</span>
                </div>
                <p className="text-xs text-slate-500">
                  Data accettazione: {format(new Date(privacyConsent.accepted_at), 'dd MMMM yyyy, HH:mm', { locale: it })}
                </p>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full text-teal-600"
                  onClick={() => window.open(PRIVACY_POLICY_URL, '_blank')}
                >
                  Rivedi l'informativa
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Consenso non registrato</span>
                </div>
                <p className="text-xs text-slate-500">
                  Per utilizzare tutti i servizi, conferma di aver letto l'informativa privacy.
                </p>
                <Button 
                  size="sm"
                  className="w-full bg-teal-500 hover:bg-teal-600"
                  onClick={() => setShowConsentDialog(true)}
                >
                  Accetta Informativa
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card I Tuoi Documenti */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-5 w-5 text-slate-600" />
              I Tuoi Documenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-slate-900">{documentStats.total}</span>
                <span className="text-sm text-slate-500">documenti caricati</span>
              </div>
              
              {Object.keys(documentStats.categories).length > 0 && (
                <div className="space-y-1">
                  {Object.entries(documentStats.categories).slice(0, 3).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between text-sm">
                      <span className="text-slate-500">{cat}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="pt-2 border-t">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Trattati in ambiente riservato
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Richieste Privacy */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-slate-600" />
              Le Tue Richieste
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-slate-900">{privacyRequests.length}</span>
                <span className="text-sm text-slate-500">richieste inviate</span>
              </div>
              
              {privacyRequests.length > 0 && (
                <div className="text-sm">
                  <span className="text-slate-500">Ultima: </span>
                  <span className="font-medium">{getRequestTypeLabel(privacyRequests[0]?.request_type)}</span>
                </div>
              )}
              
              <Button 
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowRequestDialog(true)}
              >
                <Send className="h-4 w-4 mr-2" />
                Nuova Richiesta Privacy
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* I Tuoi Diritti */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-teal-600" />
                I Tuoi Diritti
              </CardTitle>
              <CardDescription>
                In qualità di interessato, hai diritto di esercitare i seguenti diritti previsti dal GDPR
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowRightsDialog(true)}
            >
              Scopri di più
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {RIGHTS_INFO.map((right, index) => (
              <div 
                key={index}
                className="p-3 bg-slate-50 rounded-lg text-center hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => setShowRightsDialog(true)}
              >
                <right.icon className="h-5 w-5 mx-auto text-teal-600 mb-2" />
                <p className="text-xs font-medium text-slate-700">{right.title}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Informazioni sul Trattamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-teal-600" />
            Informazioni sul Trattamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <User className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">Titolari del Trattamento</h4>
                  <p className="text-sm text-slate-500">
                    Fiscal Tax Canarie S.L.P. con CIF B44653517
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <Mail className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">Contatto Privacy</h4>
                  <p className="text-sm text-slate-500">
                    <a href="mailto:info@fiscaltaxcanarie.com" className="text-teal-600 hover:underline">
                      info@fiscaltaxcanarie.com
                    </a>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <MapPin className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">Sede Legale</h4>
                  <p className="text-sm text-slate-500">
                    Calle Domingo J. Navarro n. 1, Planta 2, Oficina 5<br />
                    35002 Las Palmas de Gran Canaria, España
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <FileText className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">Finalità del Trattamento</h4>
                  <p className="text-sm text-slate-500">
                    Gestione rapporti contrattuali, adempimenti fiscali e contabili, comunicazioni di servizio, obblighi di legge.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <Clock className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">Tempi di Conservazione</h4>
                  <p className="text-sm text-slate-500">
                    I dati sono conservati per il tempo necessario alle finalità indicate e comunque non oltre i termini di legge.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-teal-50 rounded-lg">
                  <Server className="h-4 w-4 text-teal-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">Sicurezza dei Dati</h4>
                  <p className="text-sm text-slate-500">
                    Utilizziamo misure tecniche e organizzative adeguate per proteggere i tuoi dati personali.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Per maggiori informazioni, consulta l'informativa completa.
            </p>
            <Button 
              variant="link"
              className="text-teal-600"
              onClick={() => window.open(PRIVACY_POLICY_URL, '_blank')}
            >
              Informativa Privacy Completa
              <ExternalLink className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Storico Richieste Privacy */}
      {privacyRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-600" />
              Storico Richieste Privacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {privacyRequests.map((request) => (
                  <div 
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg">
                        {(() => {
                          const RequestIcon = REQUEST_TYPES.find(t => t.value === request.request_type)?.icon || HelpCircle;
                          return <RequestIcon className="h-4 w-4 text-slate-600" />;
                        })()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{getRequestTypeLabel(request.request_type)}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(request.created_at), 'dd MMM yyyy, HH:mm', { locale: it })}
                        </p>
                      </div>
                    </div>
                    {getRequestStatusBadge(request.status)}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Dialog Consenso Privacy */}
      <Dialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-teal-500" />
              Accettazione Informativa Privacy
            </DialogTitle>
            <DialogDescription>
              Prima di procedere, ti chiediamo di confermare la presa visione dell'informativa privacy.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-700">
                Dichiaro di aver preso visione dell'informativa privacy di Fiscal Tax Canarie SLP, 
                disponibile al seguente link, e di essere stato informato sulle modalità e finalità 
                del trattamento dei miei dati personali.
              </p>
            </div>
            
            <Button 
              variant="link"
              className="text-teal-600 p-0"
              onClick={() => window.open(PRIVACY_POLICY_URL, '_blank')}
            >
              <FileText className="h-4 w-4 mr-1" />
              Leggi l'Informativa Privacy Completa
              <ExternalLink className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConsentDialog(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleAcceptConsent}
              disabled={acceptingConsent}
              className="bg-teal-500 hover:bg-teal-600"
            >
              {acceptingConsent ? 'Salvataggio...' : 'Confermo e Accetto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nuova Richiesta Privacy */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-teal-500" />
              Richiesta Privacy
            </DialogTitle>
            <DialogDescription>
              Invia una richiesta per esercitare i tuoi diritti in materia di protezione dati personali.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Tipo di Richiesta *</Label>
              <Select 
                value={requestForm.request_type}
                onValueChange={(v) => setRequestForm({ ...requestForm, request_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona il tipo di richiesta" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Oggetto (opzionale)</Label>
              <Input
                value={requestForm.subject}
                onChange={(e) => setRequestForm({ ...requestForm, subject: e.target.value })}
                placeholder="Oggetto della richiesta"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descrizione della richiesta *</Label>
              <Textarea
                value={requestForm.message}
                onChange={(e) => setRequestForm({ ...requestForm, message: e.target.value })}
                placeholder="Descrivi nel dettaglio la tua richiesta..."
                rows={4}
              />
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                <Info className="h-4 w-4 inline mr-1" />
                La tua richiesta verrà inviata a <strong>info@fiscaltaxcanarie.com</strong> e 
                riceverai una risposta entro i termini previsti dalla normativa (generalmente 30 giorni).
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleSubmitRequest}
              disabled={submittingRequest}
              className="bg-teal-500 hover:bg-teal-600"
            >
              <Send className="h-4 w-4 mr-2" />
              {submittingRequest ? 'Invio...' : 'Invia Richiesta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Dettaglio Diritti */}
      <Dialog open={showRightsDialog} onOpenChange={setShowRightsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-teal-500" />
              I Tuoi Diritti Privacy
            </DialogTitle>
            <DialogDescription>
              In base al Regolamento UE 2016/679 (GDPR), hai il diritto di esercitare i seguenti diritti:
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4 py-4">
              {RIGHTS_INFO.map((right, index) => (
                <div key={index} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <right.icon className="h-5 w-5 text-teal-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{right.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{right.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => {
                setShowRightsDialog(false);
                setShowRequestDialog(true);
              }}
            >
              Esercita un Diritto
            </Button>
            <Button onClick={() => setShowRightsDialog(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrivacySection;
