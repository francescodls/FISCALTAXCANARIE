import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { 
  AlertCircle, CheckCircle, Clock, Send, Upload, FileText,
  MessageCircle, Paperclip, X, Eye, Download, Plus, ArrowRight, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Mappa sezioni
const SECTION_LABELS = {
  datos_personales: 'Dati Personali',
  situacion_familiar: 'Situazione Familiare',
  rentas_trabajo: 'Redditi da Lavoro',
  autonomo: 'Lavoro Autonomo',
  inmuebles: 'Immobili',
  alquileres_cobrados: 'Canoni Locazione',
  alquiler_pagado: 'Affitto Pagato',
  inversiones: 'Investimenti',
  criptomonedas: 'Criptomonete',
  ganancias_patrimoniales: 'Plusvalenze',
  deducciones: 'Spese Deducibili',
  deducciones_canarias: 'Deduzioni Canarie',
  generale: 'Generale',
  documenti: 'Documenti'
};

const ClientIntegrationRequests = ({ taxReturn, token, user, onUpdate }) => {
  const [requests, setRequests] = useState(taxReturn.richieste_integrazione || []);
  const [messages, setMessages] = useState(taxReturn.conversazione || []);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const pendingRequests = requests.filter(r => r.stato === 'pendente');
  const completedRequests = requests.filter(r => r.stato !== 'pendente');

  useEffect(() => {
    scrollToBottom();
    markMessagesAsRead();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const markMessagesAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/declarations/tax-returns/${taxReturn.id}/messages/mark-read`, {
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
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${taxReturn.id}/messages`, {
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
        read_by_admin: false,
        read_by_client: true
      }]);
      setNewMessage('');
      toast.success('Messaggio inviato');
    } catch (error) {
      toast.error('Errore invio messaggio');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRespondToRequest = async () => {
    if (!responseText.trim()) {
      toast.error('Scrivi una risposta');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${taxReturn.id}/integration-requests/${selectedRequest.id}/respond`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ risposta: responseText })
      });

      if (!res.ok) throw new Error('Errore invio risposta');

      toast.success('Risposta inviata!');
      setShowResponseDialog(false);
      setSelectedRequest(null);
      setResponseText('');
      
      // Ricarica dati
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore invio risposta');
    }
  };

  const handleUploadDocument = async (event, requestId) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('seccion', selectedRequest?.seccion || 'documenti');
    formData.append('categoria', 'integracion');
    if (requestId) {
      formData.append('richiesta_id', requestId);
    }

    try {
      const res = await fetch(`${API_URL}/api/declarations/tax-returns/${taxReturn.id}/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) throw new Error('Errore upload');

      toast.success('Documento caricato con successo!');
      
      // Ricarica dati
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Errore caricamento documento');
    } finally {
      setUploadingDoc(false);
      event.target.value = '';
    }
  };

  const openResponseDialog = (request) => {
    setSelectedRequest(request);
    setResponseText('');
    setShowResponseDialog(true);
  };

  // Se non ci sono richieste pendenti e nessun messaggio, mostra messaggio vuoto
  if (pendingRequests.length === 0 && messages.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-12 text-center">
          <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-slate-700">Nessuna richiesta in sospeso</h3>
          <p className="text-sm text-slate-500 mt-2">
            Il commercialista non ha richiesto documenti o chiarimenti aggiuntivi.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="client-integration-requests">
      {/* Alert Richieste Pendenti */}
      {pendingRequests.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg text-yellow-800 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Hai {pendingRequests.length} richiesta/e di documentazione
            </CardTitle>
            <CardDescription className="text-yellow-700">
              Il commercialista ha richiesto documenti o chiarimenti. Rispondi per completare la tua pratica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map(req => (
              <div 
                key={req.id} 
                className="p-4 bg-white rounded-lg border border-yellow-200 hover:border-yellow-400 transition-colors"
                data-testid={`pending-request-${req.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-yellow-100 text-yellow-700">
                        {SECTION_LABELS[req.seccion] || req.seccion}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {new Date(req.created_at).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                    
                    {/* Chi ha creato la richiesta */}
                    {req.created_by_name && (
                      <div className="flex items-center gap-2 mb-3">
                        <Avatar className="h-6 w-6">
                          {req.created_by_profile_image ? (
                            <AvatarImage src={req.created_by_profile_image} />
                          ) : null}
                          <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                            {req.created_by_first_name && req.created_by_last_name 
                              ? `${req.created_by_first_name[0]}${req.created_by_last_name[0]}`.toUpperCase()
                              : req.created_by_name?.[0]?.toUpperCase() || '?'
                            }
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-purple-700 font-medium">
                          Richiesta da: {req.created_by_name}
                        </span>
                      </div>
                    )}
                    
                    <p className="text-slate-700 font-medium mb-2">{req.mensaje}</p>
                    
                    {/* Documenti richiesti */}
                    {req.documentos_richiesti?.length > 0 && (
                      <div className="mt-3 p-3 bg-slate-50 rounded">
                        <p className="text-sm font-medium text-slate-600 mb-2">Documenti richiesti:</p>
                        <ul className="space-y-1">
                          {req.documentos_richiesti.map((doc, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                              <FileText className="w-4 h-4 text-slate-400" />
                              {doc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Azioni */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openResponseDialog(req)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Rispondi
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700"
                    onClick={() => {
                      setSelectedRequest(req);
                      fileInputRef.current?.click();
                    }}
                    disabled={uploadingDoc}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingDoc ? 'Caricamento...' : 'Carica Documento'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Richieste Completate */}
      {completedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-slate-600">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Richieste Completate ({completedRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedRequests.map(req => (
                <div key={req.id} className="p-3 bg-green-50 rounded border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      {SECTION_LABELS[req.seccion] || req.seccion}
                    </Badge>
                    <Badge className="bg-green-100 text-green-700 text-xs">
                      Completata
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{req.mensaje}</p>
                  {req.risposta && (
                    <div className="mt-2 p-2 bg-white rounded text-sm">
                      <span className="text-slate-500">Tua risposta:</span> {req.risposta}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversazione */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-teal-600" />
            Messaggi con il Commercialista
          </CardTitle>
          <CardDescription>
            Comunicazione diretta collegata a questa dichiarazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Lista messaggi */}
          <div className="bg-slate-50 rounded-lg p-4 h-[300px] overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Nessun messaggio. Scrivi per comunicare con il commercialista.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(msg => {
                  const isClient = msg.sender_role === 'cliente';
                  const isAdmin = ['commercialista', 'admin', 'super_admin'].includes(msg.sender_role);
                  
                  // Helper per iniziali
                  const getInitials = () => {
                    if (msg.sender_first_name && msg.sender_last_name) {
                      return `${msg.sender_first_name[0]}${msg.sender_last_name[0]}`.toUpperCase();
                    }
                    if (msg.sender_name) {
                      const parts = msg.sender_name.split(' ');
                      return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : msg.sender_name[0].toUpperCase();
                    }
                    return '?';
                  };
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start gap-2 max-w-[80%] ${isClient ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar (solo per admin) */}
                        {isAdmin && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            {msg.sender_profile_image ? (
                              <AvatarImage src={msg.sender_profile_image} alt={msg.sender_name} />
                            ) : null}
                            <AvatarFallback className="bg-purple-100 text-purple-700 text-xs font-semibold">
                              {getInitials()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        {/* Messaggio */}
                        <div
                          className={`p-3 rounded-lg ${
                            isClient
                              ? 'bg-teal-100 text-teal-900'
                              : 'bg-white border border-purple-200 text-slate-900'
                          }`}
                        >
                          <p className="text-xs font-semibold mb-1">
                            {isClient ? 'Tu' : (
                              msg.sender_first_name && msg.sender_last_name 
                                ? `${msg.sender_first_name} ${msg.sender_last_name}`
                                : msg.sender_name
                            )}
                            {isAdmin && (
                              <Badge className="ml-2 bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">
                                Fiscal Tax
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs mt-1 opacity-50">
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
          </div>
          
          {/* Input messaggio */}
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
              className="self-end bg-teal-600 hover:bg-teal-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Input file nascosto */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={(e) => handleUploadDocument(e, selectedRequest?.id)}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
      />

      {/* Dialog Risposta */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rispondi alla Richiesta</DialogTitle>
            <DialogDescription>
              {selectedRequest && (
                <span>
                  Sezione: <strong>{SECTION_LABELS[selectedRequest.seccion]}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedRequest && (
              <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                <p className="text-sm text-slate-700">{selectedRequest.mensaje}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium">La tua risposta</label>
              <Textarea
                placeholder="Scrivi la tua risposta o spiegazione..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
              />
            </div>

            <div className="p-3 bg-slate-50 rounded">
              <p className="text-sm text-slate-600 mb-2">
                <strong>Suggerimento:</strong> Se devi caricare documenti, puoi farlo direttamente 
                dalla scheda principale usando il pulsante "Carica Documento".
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleRespondToRequest} className="bg-teal-600 hover:bg-teal-700">
              <Send className="w-4 h-4 mr-2" />
              Invia Risposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientIntegrationRequests;
