import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from '@/components/ui/sonner';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  Archive,
  Trash2,
  User,
  Search,
  Filter,
  AlertCircle,
  XCircle,
  RefreshCw
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const TicketManagementAdmin = ({ token, clientId = null, clientName = null, API }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState("aperto");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchTickets();
  }, [clientId, statusFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let url = `${API}/tickets?status=${statusFilter}`;
      if (clientId) {
        url += `&client_id=${clientId}`;
      }
      const response = await axios.get(url, { headers });
      setTickets(response.data);
    } catch (error) {
      toast.error("Errore nel caricamento dei ticket");
    } finally {
      setLoading(false);
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
      toast.success("Risposta inviata");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'invio");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      const response = await axios.put(
        `${API}/tickets/${ticketId}/status`,
        { status: newStatus },
        { headers }
      );
      setSelectedTicket(response.data);
      fetchTickets();
      toast.success(`Ticket ${newStatus === "chiuso" ? "chiuso" : newStatus === "archiviato" ? "archiviato" : "riaperto"}`);
    } catch (error) {
      toast.error("Errore nell'aggiornamento");
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return;
    
    try {
      await axios.delete(`${API}/tickets/${ticketToDelete.id}`, { headers });
      toast.success("Ticket eliminato");
      setShowDeleteDialog(false);
      setTicketToDelete(null);
      if (selectedTicket?.id === ticketToDelete.id) {
        setSelectedTicket(null);
      }
      fetchTickets();
    } catch (error) {
      toast.error("Errore nell'eliminazione");
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

  const filteredTickets = tickets.filter(ticket => {
    if (!searchTerm) return true;
    return (
      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Conta ticket per stato
  const ticketCounts = {
    aperto: tickets.filter(t => t.status === "aperto").length,
    chiuso: tickets.filter(t => t.status === "chiuso").length,
    archiviato: tickets.filter(t => t.status === "archiviato").length
  };

  return (
    <div className="space-y-4">
      {/* Header con filtri */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="font-heading text-lg font-semibold text-slate-900">
            {clientId ? `Ticket - ${clientName || "Cliente"}` : "Gestione Ticket"}
          </h3>
          <p className="text-sm text-slate-500">
            {filteredTickets.length} ticket trovati
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cerca ticket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 border-slate-200"
              data-testid="search-tickets"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 border-slate-200" data-testid="filter-status">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti</SelectItem>
              <SelectItem value="aperto">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Aperti ({ticketCounts.aperto})
                </span>
              </SelectItem>
              <SelectItem value="chiuso">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                  Chiusi ({ticketCounts.chiuso})
                </span>
              </SelectItem>
              <SelectItem value="archiviato">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Archiviati ({ticketCounts.archiviato})
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchTickets}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {/* Ticket List */}
          <Card className="md:col-span-1 bg-white border border-slate-200">
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {filteredTickets.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessun ticket</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedTicket?.id === ticket.id
                            ? "bg-teal-50 border-l-4 border-teal-500"
                            : "hover:bg-slate-50"
                        }`}
                        data-testid={`admin-ticket-${ticket.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-slate-900 text-sm line-clamp-1">
                            {ticket.subject}
                          </h4>
                          {getStatusBadge(ticket.status)}
                        </div>
                        {!clientId && (
                          <p className="text-xs text-teal-600 font-medium mt-1">
                            {ticket.client_name || "Cliente"}
                          </p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(ticket.updated_at)}
                        </p>
                        <p className="text-xs text-slate-400">
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
                <div className="flex flex-col h-[500px]">
                  {/* Ticket Header */}
                  <div className="p-4 border-b border-slate-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{selectedTicket.subject}</h3>
                        <p className="text-sm text-teal-600 font-medium">
                          {selectedTicket.client_name || "Cliente"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Aperto il {formatDate(selectedTicket.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(selectedTicket.status)}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-4">
                      {selectedTicket.status === "aperto" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedTicket.id, "chiuso")}
                            className="border-slate-200"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Chiudi
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedTicket.id, "archiviato")}
                            className="border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Archive className="h-4 w-4 mr-1" />
                            Archivia
                          </Button>
                        </>
                      )}
                      {selectedTicket.status === "chiuso" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(selectedTicket.id, "aperto")}
                          className="border-green-200 text-green-600 hover:bg-green-50"
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Riapri
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setTicketToDelete(selectedTicket); setShowDeleteDialog(true); }}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Elimina
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {selectedTicket.messages?.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_role === "commercialista" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.sender_role === "commercialista"
                                ? "bg-teal-500 text-white"
                                : "bg-slate-100 text-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-3 w-3" />
                              <span className="text-xs font-medium">
                                {msg.sender_role === "commercialista" ? "Tu (Admin)" : msg.sender_name || "Cliente"}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-xs mt-2 ${
                              msg.sender_role === "commercialista" ? "text-teal-100" : "text-slate-400"
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
                          data-testid="admin-reply-input"
                        />
                        <Button
                          onClick={handleSendReply}
                          disabled={sending || !replyContent.trim()}
                          className="bg-teal-500 hover:bg-teal-600 text-white self-end"
                          data-testid="admin-send-reply"
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
                          Ticket {selectedTicket.status}. Riapri per rispondere.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[500px] text-center">
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
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Elimina Ticket
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              Sei sicuro di voler eliminare definitivamente il ticket{" "}
              <strong>"{ticketToDelete?.subject}"</strong>?
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Questa azione non può essere annullata.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annulla
            </Button>
            <Button 
              onClick={handleDeleteTicket}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketManagementAdmin;
