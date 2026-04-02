import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { 
  ArrowLeft, User, Calendar, FileText, MessageCircle, Send, 
  AlertCircle, CheckCircle, Clock, Download, Paperclip, Eye,
  Plus, X, Upload, FileCheck, Building2, Briefcase, Home,
  TrendingUp, Bitcoin, Receipt, MapPin, RefreshCw, Trash2, UserCheck,
  Euro, Mail, Bell, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Tax types per onorario
const TAX_TYPES = [
  { value: "ESENTE", label: "Esente IVA (0%)", rate: 0 },
  { value: "IGIC_7", label: "IGIC 7%", rate: 0.07 },
  { value: "IVA_21", label: "IVA 21%", rate: 0.21 },
  { value: "IVA_22", label: "IVA 22%", rate: 0.22 },
];

const DeclarationDetailView = ({ declaration, token, user, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [messages, setMessages] = useState(declaration.conversazione || []);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [assigningPratica, setAssigningPratica] = useState(false);
  const [showIntegrationDialog, setShowIntegrationDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [integrationRequest, setIntegrationRequest] = useState({
    seccion: '',
    mensaje: '',
    documentos_richiesti: []
  });
  const [newDocRequest, setNewDocRequest] = useState('');
  const messagesEndRef = useRef(null);
  
  // State per onorario dichiarazione
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [feeForm, setFeeForm] = useState({
    amount: declaration.declaration_fee_net_amount || declaration.declaration_fee || '',
    notes: declaration.declaration_fee_notes || '',
    tax_type: declaration.declaration_fee_tax_type || 'ESENTE',
    status: declaration.declaration_fee_status || 'pending'
  });
  const [notifyForm, setNotifyForm] = useState({
    subject: `Onorario Dichiarazione Redditi ${declaration.anno_fiscale} - Fiscal Tax Canarie`,
    message: '',
    use_default_template: true
  });
  const [savingFee, setSavingFee] = useState(false);
  const [sendingNotify, setSendingNotify] = useState(false);
  
  const isAdmin = ['commercialista', 'admin', 'super_admin'].includes(user?.role);

  useEffect(() => {
    // Segna messaggi come letti
    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [declaration.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markMessagesAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/declarations/tax-returns/${declaration.id}/messages/mark-read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Errore marking messages read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSendingMessage(true);
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${declaration.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newMessage })
      });
      
      if (!res.ok) throw new Error('Errore invio messaggio');
      
      // Aggiorna lista messaggi
      setMessages([...messages, {
        id: Date.now().toString(),
        content: newMessage,
        sender_id: user.id,
        sender_name: user.full_name,
        sender_role: user.role,
        created_at: new Date().toISOString(),
        read_by_admin: isAdmin,
        read_by_client: !isAdmin
      }]);
      setNewMessage('');
      toast.success('Messaggio inviato');
    } catch (error) {
      toast.error('Errore invio messaggio');
    } finally {
      setSendingMessage(false);
    }
  };

  // ==================== ONORARIO DICHIARAZIONE ====================
  
  const calculateFeeAmounts = (netAmount, taxType) => {
    const tax = TAX_TYPES.find(t => t.value === taxType) || TAX_TYPES[0];
    const net = parseFloat(netAmount) || 0;
    const taxAmount = Math.round(net * tax.rate * 100) / 100;
    const gross = Math.round((net + taxAmount) * 100) / 100;
    return { net, taxAmount, gross };
  };

  const handleSaveFee = async () => {
    if (!feeForm.amount || parseFloat(feeForm.amount) <= 0) {
      toast.error('Inserisci un importo valido');
      return;
    }
    
    setSavingFee(true);
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${declaration.id}/fee`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(feeForm.amount),
          notes: feeForm.notes,
          tax_type: feeForm.tax_type,
          status: feeForm.status
        })
      });
      
      if (!res.ok) throw new Error('Errore salvataggio');
      
      toast.success('Onorario salvato con successo');
      setShowFeeDialog(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore nel salvataggio dell\'onorario');
    } finally {
      setSavingFee(false);
    }
  };

  const handleSendFeeNotification = async () => {
    setSendingNotify(true);
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${declaration.id}/fee/notify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: notifyForm.subject,
          message: notifyForm.use_default_template ? null : notifyForm.message,
          use_default_template: notifyForm.use_default_template
        })
      });
      
      if (!res.ok) throw new Error('Errore invio notifica');
      
      toast.success('Notifica inviata al cliente via email!');
      setShowNotifyDialog(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore nell\'invio della notifica');
    } finally {
      setSendingNotify(false);
    }
  };

  const handleMarkFeePaid = async () => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${declaration.id}/fee/mark-paid`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Errore');
      
      toast.success('Onorario segnato come pagato');
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore');
    }
  };

  const feePreview = calculateFeeAmounts(feeForm.amount, feeForm.tax_type);

  const sendIntegrationRequest = async () => {
    if (!integrationRequest.seccion || !integrationRequest.mensaje) {
      toast.error('Compila sezione e messaggio');
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${declaration.id}/integration-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(integrationRequest)
      });
      
      if (!res.ok) throw new Error('Errore invio richiesta');
      
      toast.success('Richiesta integrazione inviata! Email inviata al cliente.');
      setShowIntegrationDialog(false);
      setIntegrationRequest({ seccion: '', mensaje: '', documentos_richiesti: [] });
      
      // Ricarica dichiarazione
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore invio richiesta');
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      const formData = new FormData();
      formData.append('nuovo_stato', newStatus);
      
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${declaration.id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (!res.ok) throw new Error('Errore aggiornamento stato');
      
      toast.success(`Stato aggiornato a: ${getStatusLabel(newStatus)}`);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore aggiornamento stato');
    }
  };

  const deleteDeclaration = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${declaration.id}?soft_delete=true`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Errore eliminazione');
      
      toast.success('Pratica eliminata');
      setShowDeleteDialog(false);
      onBack(); // Torna alla lista
    } catch (error) {
      toast.error('Errore eliminazione pratica');
    } finally {
      setDeleting(false);
    }
  };

  // Funzione per prendere in carico la pratica
  const assignToMe = async () => {
    setAssigningPratica(true);
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${declaration.id}/assign`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Errore assegnazione');
      
      const data = await res.json();
      toast.success(data.message);
      
      // Aggiorna la dichiarazione locale
      if (onUpdate) {
        onUpdate({
          ...declaration,
          ...data.assigned_to
        });
      }
    } catch (error) {
      toast.error('Errore nell\'assegnazione della pratica');
    } finally {
      setAssigningPratica(false);
    }
  };

  // Helper per ottenere iniziali da nome
  const getInitials = (firstName, lastName, fullName) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (fullName) {
      const parts = fullName.split(' ');
      return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : fullName[0].toUpperCase();
    }
    return '?';
  };

  const downloadAuthPdf = async () => {
    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${declaration.id}/authorization-pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Errore download');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `autorizzazione_${declaration.anno_fiscale}_${declaration.client_name}.pdf`;
      a.click();
    } catch (error) {
      toast.error('Errore download PDF');
    }
  };

  const getStatusLabel = (stato) => {
    const labels = {
      bozza: 'Bozza',
      inviata: 'Inviata',
      documentazione_incompleta: 'Documentazione Incompleta',
      in_revisione: 'In Revisione',
      pronta: 'Pronta',
      presentata: 'Presentata',
      errata: 'Errata',
      non_presentare: 'Non Presentare',
      archiviata: 'Archiviata',
      eliminata: 'Eliminata'
    };
    return labels[stato] || stato;
  };

  const getStatusBadge = (stato) => {
    // Codifica colore:
    // VERDE = presentata
    // GIALLO = pendente (bozza, inviata, doc_incompleta, in_revisione, pronta)
    // ROSSO = errata, non_presentare
    // GRIGIO = archiviata, eliminata
    const config = {
      bozza: { color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: Clock },
      inviata: { color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: Send },
      documentazione_incompleta: { color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: AlertCircle },
      in_revisione: { color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: Eye },
      pronta: { color: 'bg-yellow-100 text-yellow-700 border border-yellow-300', icon: FileCheck },
      presentata: { color: 'bg-green-100 text-green-700 border border-green-300', icon: CheckCircle },
      errata: { color: 'bg-red-100 text-red-700 border border-red-300', icon: AlertCircle },
      non_presentare: { color: 'bg-red-100 text-red-700 border border-red-300', icon: AlertCircle },
      archiviata: { color: 'bg-slate-100 text-slate-600 border border-slate-300', icon: FileText },
      eliminata: { color: 'bg-slate-200 text-slate-500 border border-slate-300', icon: Trash2 }
    };
    const cfg = config[stato] || { color: 'bg-gray-100 text-gray-600', icon: FileText };
    const Icon = cfg.icon;
    return (
      <Badge className={`${cfg.color} flex items-center gap-1 text-sm px-3 py-1`}>
        <Icon className="w-4 h-4" />
        {getStatusLabel(stato)}
      </Badge>
    );
  };

  const sections = [
    { key: 'datos_personales', label: 'Dati Personali', icon: User },
    { key: 'situacion_familiar', label: 'Situazione Familiare', icon: User },
    { key: 'rentas_trabajo', label: 'Redditi da Lavoro', icon: Briefcase },
    { key: 'autonomo', label: 'Lavoro Autonomo', icon: Building2 },
    { key: 'inmuebles', label: 'Immobili', icon: Home },
    { key: 'alquileres_cobrados', label: 'Canoni Locazione', icon: Receipt },
    { key: 'alquiler_pagado', label: 'Affitto Pagato', icon: Receipt },
    { key: 'inversiones', label: 'Investimenti', icon: TrendingUp },
    { key: 'criptomonedas', label: 'Criptomonete', icon: Bitcoin },
    { key: 'ganancias_patrimoniales', label: 'Plusvalenze', icon: TrendingUp },
    { key: 'deducciones', label: 'Spese Deducibili', icon: Receipt },
    { key: 'deducciones_canarias', label: 'Deduzioni Canarie', icon: MapPin }
  ];

  const renderSectionData = (key, data) => {
    if (!data) return <p className="text-slate-400 italic">Non compilato</p>;
    
    // Renderizza i dati in formato leggibile
    return (
      <div className="space-y-2">
        {Object.entries(data).map(([field, value]) => {
          if (value === null || value === undefined || value === '') return null;
          if (typeof value === 'boolean') value = value ? 'Sì' : 'No';
          if (Array.isArray(value)) value = value.length > 0 ? `${value.length} elementi` : 'Nessuno';
          if (typeof value === 'object') value = JSON.stringify(value);
          
          // Formatta il nome del campo
          const fieldLabel = field
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
          
          return (
            <div key={field} className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500 text-sm">{fieldLabel}:</span>
              <span className="font-medium text-slate-700 text-sm text-right max-w-[60%]">{String(value)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="declaration-detail-view">
      {/* Header */}
      <Card className="bg-gradient-to-r from-teal-50 to-slate-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Indietro
              </Button>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Dichiarazione Redditi {declaration.anno_fiscale}
                </h2>
                <p className="text-slate-500">{declaration.client_name} - {declaration.client_email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(declaration.stato)}
              
              {/* Cambio stato (solo admin) */}
              {isAdmin && (
                <Select value={declaration.stato} onValueChange={updateStatus}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Cambia stato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bozza">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Bozza
                      </span>
                    </SelectItem>
                    <SelectItem value="inviata">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Inviata
                      </span>
                    </SelectItem>
                    <SelectItem value="documentazione_incompleta">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Doc. Incompleta
                      </span>
                    </SelectItem>
                    <SelectItem value="in_revisione">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        In Revisione
                      </span>
                    </SelectItem>
                    <SelectItem value="pronta">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Pronta
                      </span>
                    </SelectItem>
                    <SelectItem value="presentata">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Presentata
                      </span>
                    </SelectItem>
                    <SelectItem value="errata">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Errata
                      </span>
                    </SelectItem>
                    <SelectItem value="non_presentare">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Non Presentare
                      </span>
                    </SelectItem>
                    <SelectItem value="archiviata">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                        Archiviata
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {/* Pulsante Elimina (solo admin) */}
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Elimina
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Panoramica
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Dati Inseriti
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Documenti ({declaration.documentos?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="communication" className="flex items-center gap-2 relative">
            <MessageCircle className="w-4 h-4" />
            Comunicazioni
            {messages.filter(m => !m.read_by_admin && m.sender_role === 'cliente').length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab Panoramica */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Info Pratica */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informazioni Pratica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Anno Fiscale:</span>
                  <span className="font-medium">{declaration.anno_fiscale}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stato:</span>
                  {getStatusBadge(declaration.stato)}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Creata il:</span>
                  <span>{new Date(declaration.created_at).toLocaleDateString('it-IT')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ultima modifica:</span>
                  <span>{new Date(declaration.updated_at).toLocaleString('it-IT')}</span>
                </div>
                
                {/* Preso in carico da */}
                <div className="pt-3 border-t mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Preso in carico da:</span>
                    {declaration.assigned_to_id ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          {declaration.assigned_to_profile_image ? (
                            <AvatarImage src={declaration.assigned_to_profile_image} />
                          ) : null}
                          <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                            {getInitials(declaration.assigned_to_first_name, declaration.assigned_to_last_name, declaration.assigned_to_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-purple-700">
                          {declaration.assigned_to_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Non assegnata</span>
                    )}
                  </div>
                  {isAdmin && !declaration.assigned_to_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                      onClick={assignToMe}
                      disabled={assigningPratica}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      {assigningPratica ? 'Assegnazione...' : 'Prendi in Carico'}
                    </Button>
                  )}
                  {isAdmin && declaration.assigned_to_id && declaration.assigned_to_id !== user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-purple-600"
                      onClick={assignToMe}
                      disabled={assigningPratica}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      {assigningPratica ? 'Riassegnazione...' : 'Riassegna a me'}
                    </Button>
                  )}
                </div>
                {declaration.submitted_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Inviata il:</span>
                    <span>{new Date(declaration.submitted_at).toLocaleString('it-IT')}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Autorizzazione */}
            <Card className={declaration.autorizacion?.signed_at ? 'border-green-200 bg-green-50/50' : ''}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {declaration.autorizacion?.signed_at ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Clock className="w-5 h-5 text-slate-400" />
                  )}
                  Autorizzazione
                </CardTitle>
              </CardHeader>
              <CardContent>
                {declaration.autorizacion?.signed_at ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Firmata e Autorizzata</span>
                    </div>
                    <p className="text-sm text-slate-500">
                      Data firma: {new Date(declaration.autorizacion.signed_at).toLocaleString('it-IT')}
                    </p>
                    <Button onClick={downloadAuthPdf} className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Scarica PDF Autorizzazione
                    </Button>
                  </div>
                ) : (
                  <p className="text-slate-500">
                    Il cliente non ha ancora firmato l'autorizzazione
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Card Onorario Dichiarazione */}
          <Card className={`border-2 ${
            declaration.declaration_fee_status === 'paid' 
              ? 'border-green-200 bg-green-50/30' 
              : declaration.declaration_fee 
                ? 'border-teal-200 bg-teal-50/30'
                : 'border-slate-200'
          }`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Euro className="w-5 h-5 text-teal-600" />
                  Onorario Presentazione Dichiarazione
                </div>
                {declaration.declaration_fee_status === 'paid' && (
                  <Badge className="bg-green-100 text-green-700">Pagato</Badge>
                )}
                {declaration.declaration_fee_status === 'notified' && (
                  <Badge className="bg-blue-100 text-blue-700">Notificato</Badge>
                )}
                {declaration.declaration_fee_status === 'pending' && declaration.declaration_fee && (
                  <Badge className="bg-amber-100 text-amber-700">Da notificare</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {declaration.declaration_fee ? (
                <div className="space-y-4">
                  {/* Importi */}
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                    <div>
                      <p className="text-sm text-slate-500">Importo Totale</p>
                      <p className="text-2xl font-bold text-teal-700">
                        €{(declaration.declaration_fee_gross_amount || declaration.declaration_fee).toFixed(2)}
                      </p>
                      {declaration.declaration_fee_tax_amount > 0 && (
                        <p className="text-xs text-slate-500">
                          (Netto €{declaration.declaration_fee_net_amount?.toFixed(2)} + 
                          {' '}{TAX_TYPES.find(t => t.value === declaration.declaration_fee_tax_type)?.label || 'IVA'} 
                          {' '}€{declaration.declaration_fee_tax_amount?.toFixed(2)})
                        </p>
                      )}
                    </div>
                    {isAdmin && declaration.declaration_fee_status !== 'paid' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleMarkFeePaid}
                        className="border-green-200 text-green-700 hover:bg-green-50"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Segna Pagato
                      </Button>
                    )}
                  </div>
                  
                  {/* Note */}
                  {declaration.declaration_fee_notes && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">{declaration.declaration_fee_notes}</p>
                    </div>
                  )}
                  
                  {/* Notifica inviata */}
                  {declaration.declaration_fee_notified_at && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Mail className="w-4 h-4" />
                      <span>
                        Notificato al cliente il {new Date(declaration.declaration_fee_notified_at).toLocaleString('it-IT')}
                      </span>
                    </div>
                  )}
                  
                  {/* Azioni Admin */}
                  {isAdmin && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setFeeForm({
                            amount: declaration.declaration_fee_net_amount || declaration.declaration_fee || '',
                            notes: declaration.declaration_fee_notes || '',
                            tax_type: declaration.declaration_fee_tax_type || 'ESENTE',
                            status: declaration.declaration_fee_status || 'pending'
                          });
                          setShowFeeDialog(true);
                        }}
                      >
                        <Receipt className="w-4 h-4 mr-1" />
                        Modifica
                      </Button>
                      {!declaration.declaration_fee_notified_at && (
                        <Button 
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={() => setShowNotifyDialog(true)}
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Notifica al Cliente
                        </Button>
                      )}
                      {declaration.declaration_fee_notified_at && declaration.declaration_fee_status !== 'paid' && (
                        <Button 
                          size="sm"
                          variant="outline"
                          className="border-blue-200 text-blue-600"
                          onClick={() => setShowNotifyDialog(true)}
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Invia Promemoria
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  {isAdmin ? (
                    <>
                      <p className="text-slate-500 mb-3">Nessun onorario ancora impostato</p>
                      <Button 
                        onClick={() => setShowFeeDialog(true)}
                        className="bg-teal-500 hover:bg-teal-600 text-white"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Inserisci Onorario
                      </Button>
                    </>
                  ) : (
                    <p className="text-slate-500">L'onorario per questa dichiarazione non è ancora stato definito</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sezioni Compilate */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sezioni Compilate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sections.map(section => {
                  const data = declaration[section.key];
                  const hasData = data && Object.keys(data).some(k => data[k]);
                  const Icon = section.icon;
                  
                  return (
                    <div 
                      key={section.key}
                      className={`p-3 rounded-lg border ${hasData ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 border-slate-200'}`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${hasData ? 'text-teal-600' : 'text-slate-400'}`} />
                        <span className={`text-sm ${hasData ? 'text-teal-700 font-medium' : 'text-slate-400'}`}>
                          {section.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Richieste Integrazione Pendenti */}
          {declaration.richieste_integrazione?.filter(r => r.stato === 'pendente').length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-yellow-700">
                  <AlertCircle className="w-5 h-5" />
                  Richieste Integrazione Pendenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {declaration.richieste_integrazione
                    .filter(r => r.stato === 'pendente')
                    .map(req => (
                      <div key={req.id} className="p-3 bg-white rounded-lg border">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge className="bg-yellow-100 text-yellow-700 mb-2">{req.seccion}</Badge>
                            <p className="text-sm text-slate-700">{req.mensaje}</p>
                            {req.documentos_richiesti?.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-slate-500">Documenti richiesti:</p>
                                <ul className="list-disc list-inside text-sm text-slate-600">
                                  {req.documentos_richiesti.map((doc, i) => (
                                    <li key={i}>{doc}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">
                            {new Date(req.created_at).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pulsante Richiedi Integrazione */}
          {isAdmin && (
            <Button 
              onClick={() => setShowIntegrationDialog(true)}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Richiedi Documentazione/Chiarimenti
            </Button>
          )}
        </TabsContent>

        {/* Tab Dati Inseriti */}
        <TabsContent value="data" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map(section => {
              const data = declaration[section.key];
              const Icon = section.icon;
              
              return (
                <Card key={section.key}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icon className="w-4 h-4 text-teal-600" />
                      {section.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderSectionData(section.key, data)}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab Documenti */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-teal-600" />
                Documenti Caricati ({declaration.documentos?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {declaration.documentos?.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  Nessun documento caricato
                </p>
              ) : (
                <div className="space-y-3">
                  {declaration.documentos?.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-teal-600" />
                        <div>
                          <p className="font-medium text-slate-700">{doc.nombre || doc.file_name}</p>
                          <p className="text-xs text-slate-500">
                            {doc.seccion && <Badge variant="outline" className="mr-2">{doc.seccion}</Badge>}
                            {new Date(doc.uploaded_at).toLocaleString('it-IT')}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Comunicazioni */}
        <TabsContent value="communication" className="space-y-4">
          <Card className="h-[500px] flex flex-col">
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-teal-600" />
                Conversazione
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Nessun messaggio. Inizia la conversazione!
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(msg => {
                    const isAdminMessage = ['commercialista', 'admin', 'super_admin'].includes(msg.sender_role);
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isAdminMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-start gap-2 max-w-[75%] ${isAdminMessage ? 'flex-row-reverse' : ''}`}>
                          {/* Avatar */}
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            {msg.sender_profile_image ? (
                              <AvatarImage src={msg.sender_profile_image} alt={msg.sender_name} />
                            ) : null}
                            <AvatarFallback className={`text-xs font-semibold ${
                              isAdminMessage 
                                ? 'bg-purple-100 text-purple-700' 
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {getInitials(msg.sender_first_name, msg.sender_last_name, msg.sender_name)}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* Messaggio */}
                          <div
                            className={`p-3 rounded-lg ${
                              isAdminMessage
                                ? 'bg-purple-100 text-purple-900'
                                : 'bg-slate-100 text-slate-900'
                            }`}
                          >
                            <p className="text-xs font-semibold mb-1">
                              {msg.sender_first_name && msg.sender_last_name 
                                ? `${msg.sender_first_name} ${msg.sender_last_name}`
                                : msg.sender_name}
                              {isAdminMessage && (
                                <Badge className="ml-2 bg-purple-200 text-purple-700 text-[10px] px-1.5 py-0">
                                  Team
                                </Badge>
                              )}
                            </p>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className="text-xs mt-1 opacity-60">
                              {new Date(msg.created_at).toLocaleString('it-IT')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Scrivi un messaggio..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 min-h-[60px]"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={sendingMessage || !newMessage.trim()}
                  className="self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Richiesta Integrazione */}
      <Dialog open={showIntegrationDialog} onOpenChange={setShowIntegrationDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Richiedi Documentazione/Chiarimenti</DialogTitle>
            <DialogDescription>
              Il cliente riceverà un'email con la tua richiesta
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Sezione</label>
              <Select 
                value={integrationRequest.seccion} 
                onValueChange={(v) => setIntegrationRequest({...integrationRequest, seccion: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona sezione" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(s => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                  <SelectItem value="generale">Generale</SelectItem>
                  <SelectItem value="documenti">Documenti</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Messaggio</label>
              <Textarea
                placeholder="Descrivi cosa serve..."
                value={integrationRequest.mensaje}
                onChange={(e) => setIntegrationRequest({...integrationRequest, mensaje: e.target.value})}
                rows={4}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Documenti Richiesti (opzionale)</label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Es: Busta paga dicembre"
                  value={newDocRequest}
                  onChange={(e) => setNewDocRequest(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newDocRequest.trim()) {
                      setIntegrationRequest({
                        ...integrationRequest,
                        documentos_richiesti: [...integrationRequest.documentos_richiesti, newDocRequest.trim()]
                      });
                      setNewDocRequest('');
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (newDocRequest.trim()) {
                      setIntegrationRequest({
                        ...integrationRequest,
                        documentos_richiesti: [...integrationRequest.documentos_richiesti, newDocRequest.trim()]
                      });
                      setNewDocRequest('');
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {integrationRequest.documentos_richiesti.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {integrationRequest.documentos_richiesti.map((doc, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                      {doc}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setIntegrationRequest({
                          ...integrationRequest,
                          documentos_richiesti: integrationRequest.documentos_richiesti.filter((_, idx) => idx !== i)
                        })}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIntegrationDialog(false)}>
              Annulla
            </Button>
            <Button onClick={sendIntegrationRequest} className="bg-yellow-500 hover:bg-yellow-600">
              <Send className="w-4 h-4 mr-2" />
              Invia Richiesta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Conferma Eliminazione */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Conferma Eliminazione
            </AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare la dichiarazione dei redditi <strong>{declaration.anno_fiscale}</strong> di <strong>{declaration.client_name}</strong>.
              <br /><br />
              La pratica verrà spostata nello stato "Eliminata" e non sarà più visibile nella lista principale.
              <br /><br />
              <span className="text-amber-600">Questa azione può essere annullata contattando il supporto tecnico.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteDeclaration}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Eliminazione...' : 'Elimina Pratica'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Onorario Dichiarazione */}
      <Dialog open={showFeeDialog} onOpenChange={setShowFeeDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-teal-500" />
              {declaration.declaration_fee ? 'Modifica' : 'Inserisci'} Onorario Dichiarazione
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Importo Netto (€) *</Label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={feeForm.amount}
                    onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Regime Fiscale</Label>
                <Select 
                  value={feeForm.tax_type}
                  onValueChange={(v) => setFeeForm({ ...feeForm, tax_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview importi */}
            {feeForm.amount && parseFloat(feeForm.amount) > 0 && (
              <div className="p-3 bg-slate-50 rounded-lg border">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Netto:</span>
                  <span className="font-medium">€{feePreview.net.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    {TAX_TYPES.find(t => t.value === feeForm.tax_type)?.label || 'IVA'}:
                  </span>
                  <span className="font-medium">€{feePreview.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2">
                  <span>Totale Lordo:</span>
                  <span className="text-teal-600">€{feePreview.gross.toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Note (opzionale)</Label>
              <Textarea
                value={feeForm.notes}
                onChange={(e) => setFeeForm({ ...feeForm, notes: e.target.value })}
                placeholder="Note sull'onorario..."
                rows={2}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeeDialog(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleSaveFee}
              disabled={savingFee}
              className="bg-teal-500 hover:bg-teal-600"
            >
              {savingFee ? 'Salvataggio...' : 'Salva Onorario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Notifica Onorario */}
      <Dialog open={showNotifyDialog} onOpenChange={setShowNotifyDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-500" />
              Notifica Onorario al Cliente
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-700">
                <strong>Cliente:</strong> {declaration.client_name}<br />
                <strong>Importo:</strong> €{(declaration.declaration_fee_gross_amount || declaration.declaration_fee)?.toFixed(2)}<br />
                <strong>Anno:</strong> {declaration.anno_fiscale}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Oggetto Email</Label>
              <Input
                value={notifyForm.subject}
                onChange={(e) => setNotifyForm({ ...notifyForm, subject: e.target.value })}
                placeholder="Oggetto email..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useTemplate"
                checked={notifyForm.use_default_template}
                onChange={(e) => setNotifyForm({ ...notifyForm, use_default_template: e.target.checked })}
                className="rounded border-slate-300"
              />
              <label htmlFor="useTemplate" className="text-sm text-slate-600 cursor-pointer">
                Usa testo predefinito dello studio
              </label>
            </div>

            {!notifyForm.use_default_template && (
              <div className="space-y-2">
                <Label>Messaggio Personalizzato</Label>
                <Textarea
                  value={notifyForm.message}
                  onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })}
                  placeholder={`Gentile {client_name},\n\nLe comunichiamo l'onorario per la dichiarazione {anno_fiscale}...\n\nImporto: {fee_amount}`}
                  rows={6}
                />
                <p className="text-xs text-slate-500">
                  Puoi usare: {'{client_name}'}, {'{anno_fiscale}'}, {'{fee_amount}'}, {'{fee_display}'}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotifyDialog(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleSendFeeNotification}
              disabled={sendingNotify}
              className="bg-blue-500 hover:bg-blue-600"
            >
              <Mail className="w-4 h-4 mr-2" />
              {sendingNotify ? 'Invio...' : 'Invia Notifica'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeclarationDetailView;
