import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from '@/components/ui/sonner';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle2, 
  Archive,
  User,
  AlertCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const TicketManagementClient = ({ token, clientId, API }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({ subject: "", content: "" });
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/tickets`, { headers });
      setTickets(response.data);
    } catch (error) {
      toast.error("Errore nel caricamento dei ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newTicketForm.subject.trim() || !newTicketForm.content.trim()) {
      toast.error("Compila tutti i campi");
      return;
    }
    
    setSending(true);
    try {
      const response = await axios.post(`${API}/tickets`, newTicketForm, { headers });
      toast.success("Ticket aperto con successo");
      setShowNewDialog(false);
      setNewTicketForm({ subject: "", content: "" });
      fetchTickets();
      setSelectedTicket(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nella creazione del ticket");
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedTicket) return;
    
    setSending(true);
    try {
      const response = await axios.post(
        `${API}/tickets/${selectedTicket.id}/messages`,
        { content: replyContent },
        { headers }
      );
      setSelectedTicket(response.data);
      setReplyContent("");
      fetchTickets();
      toast.success("Messaggio inviato");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'invio del messaggio");
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "aperto":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <Clock className="h-3 w-3 mr-1" />
            Aperto
          </Badge>
        );
      case "chiuso":
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Chiuso
          </Badge>
        );
      case "archiviato":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <Archive className="h-3 w-3 mr-1" />
            Archiviato
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), "d MMM yyyy, HH:mm", { locale: it });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-slate-900">I Miei Ticket</h2>
          <p className="text-sm text-slate-500">Apri un ticket per richiedere assistenza</p>
        </div>
        <Button 
          onClick={() => setShowNewDialog(true)}
          className="bg-teal-500 hover:bg-teal-600 text-white"
          data-testid="new-ticket-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Ticket
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Ticket List */}
        <Card className="md:col-span-1 bg-white border border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">
              Ticket ({tickets.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {tickets.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nessun ticket</p>
                  <p className="text-sm text-slate-400">Apri un nuovo ticket per richiedere assistenza</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedTicket?.id === ticket.id
                          ? "bg-teal-50 border-l-4 border-teal-500"
                          : "hover:bg-slate-50"
                      }`}
                      data-testid={`ticket-item-${ticket.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-slate-900 text-sm line-clamp-1">
                          {ticket.subject}
                        </h4>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(ticket.updated_at)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {ticket.messages?.length || 0} messaggi
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Ticket Detail */}
        <Card className="md:col-span-2 bg-white border border-slate-200">
          <CardContent className="p-0">
            {selectedTicket ? (
              <div className="flex flex-col h-[550px]">
                {/* Ticket Header */}
                <div className="p-4 border-b border-slate-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">{selectedTicket.subject}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Aperto il {formatDate(selectedTicket.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {selectedTicket.messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_role === "cliente" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.sender_role === "cliente"
                              ? "bg-teal-500 text-white"
                              : "bg-slate-100 text-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-3 w-3" />
                            <span className="text-xs font-medium">
                              {msg.sender_role === "cliente" ? "Tu" : "Fiscal Tax Canarie"}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-xs mt-2 ${
                            msg.sender_role === "cliente" ? "text-teal-100" : "text-slate-400"
                          }`}>
                            {formatDate(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Reply Box */}
                {selectedTicket.status === "aperto" ? (
                  <div className="p-4 border-t border-slate-200">
                    <div className="flex gap-2">
                      <Textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Scrivi una risposta..."
                        className="flex-1 resize-none border-slate-200"
                        rows={2}
                        data-testid="ticket-reply-input"
                      />
                      <Button
                        onClick={handleSendReply}
                        disabled={sending || !replyContent.trim()}
                        className="bg-teal-500 hover:bg-teal-600 text-white self-end"
                        data-testid="send-reply-btn"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2 text-slate-500">
                      <AlertCircle className="h-4 w-4" />
                      <p className="text-sm">
                        Questo ticket è {selectedTicket.status}. Non è possibile rispondere.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[550px] text-center">
                <MessageSquare className="h-16 w-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Seleziona un ticket</h3>
                <p className="text-slate-500 max-w-sm">
                  Clicca su un ticket dalla lista per visualizzare la conversazione
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Ticket Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-teal-500" />
              Nuovo Ticket
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div className="space-y-2">
              <Label>Oggetto *</Label>
              <Input
                value={newTicketForm.subject}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                placeholder="Es: Richiesta informazioni su Modelo-303"
                required
                className="border-slate-200"
                data-testid="ticket-subject-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Messaggio *</Label>
              <Textarea
                value={newTicketForm.content}
                onChange={(e) => setNewTicketForm({ ...newTicketForm, content: e.target.value })}
                placeholder="Descrivi la tua richiesta in dettaglio..."
                required
                className="border-slate-200 resize-none"
                rows={5}
                data-testid="ticket-content-input"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewDialog(false)}>
                Annulla
              </Button>
              <Button 
                type="submit" 
                disabled={sending}
                className="bg-teal-500 hover:bg-teal-600 text-white"
                data-testid="submit-ticket-btn"
              >
                {sending ? "Invio..." : "Apri Ticket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketManagementClient;
