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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
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
  RefreshCw,
  FileText,
  Download,
  Users,
  Calendar
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const GlobalTicketManagement = ({ token }) => {
  const [tickets, setTickets] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState("aperto");
  const [clientFilter, setClientFilter] = useState("tutti");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchTickets();
    fetchClients();
  }, [statusFilter]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      let url = `${API}/tickets?status=${statusFilter}`;
      const response = await axios.get(url, { headers });
      // Sort: open tickets first, then by updated_at desc
      const sorted = response.data.sort((a, b) => {
        if (a.status === "aperto" && b.status !== "aperto") return -1;
        if (a.status !== "aperto" && b.status === "aperto") return 1;
        return new Date(b.updated_at) - new Date(a.updated_at);
      });
      setTickets(sorted);
    } catch (error) {
      toast.error("Errore nel caricamento dei ticket");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get(`${API}/clients`, { headers });
      setClients(response.data);
    } catch (error) {
      console.error("Errore caricamento clienti:", error);
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

  const handleExportPdf = async (ticket) => {
    setExportingPdf(true);
    try {
      const response = await axios.get(`${API}/tickets/${ticket.id}/export-pdf`, {
        headers,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket_${ticket.subject.substring(0, 20)}_${ticket.id.substring(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF scaricato");
    } catch (error) {
      toast.error("Errore nell'esportazione PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "aperto":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
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

  const formatDateShort = (dateStr) => {
    try {
      return format(parseISO(dateStr), "d MMM yyyy", { locale: it });
    } catch {
      return dateStr;
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchTerm || 
      ticket.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = clientFilter === "tutti" || ticket.client_id === clientFilter;
    return matchesSearch && matchesClient;
  });

  // Counts
  const openCount = tickets.filter(t => t.status === "aperto").length;
  const closedCount = tickets.filter(t => t.status === "chiuso").length;
  const archivedCount = tickets.filter(t => t.status === "archiviato").length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Totale Ticket</p>
                <p className="text-2xl font-bold text-slate-800">{tickets.length}</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <MessageSquare className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-green-200 cursor-pointer hover:bg-green-50 transition-colors" onClick={() => setStatusFilter("aperto")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Aperti</p>
                <p className="text-2xl font-bold text-green-700">{openCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setStatusFilter("chiuso")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Chiusi</p>
                <p className="text-2xl font-bold text-slate-700">{closedCount}</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-red-200 cursor-pointer hover:bg-red-50 transition-colors" onClick={() => setStatusFilter("archiviato")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Archiviati</p>
                <p className="text-2xl font-bold text-red-700">{archivedCount}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <Archive className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Cerca ticket..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 border-slate-200"
                  data-testid="global-search-tickets"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 border-slate-200" data-testid="global-filter-status">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti gli stati</SelectItem>
                  <SelectItem value="aperto">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Aperti ({openCount})
                    </span>
                  </SelectItem>
                  <SelectItem value="chiuso">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                      Chiusi ({closedCount})
                    </span>
                  </SelectItem>
                  <SelectItem value="archiviato">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      Archiviati ({archivedCount})
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-56 border-slate-200" data-testid="global-filter-client">
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Tutti i clienti" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tutti">Tutti i clienti</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                {filteredTickets.length} ticket trovati
              </span>
              <Button variant="outline" size="sm" onClick={fetchTickets}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid md:grid-cols-5 gap-4">
          {/* Ticket List - Wider */}
          <Card className="md:col-span-2 bg-white border border-slate-200">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-teal-500" />
                Lista Ticket
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[550px]">
                {filteredTickets.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nessun ticket trovato</p>
                    <p className="text-sm text-slate-400">Modifica i filtri per vedere altri ticket</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket)}
                        className={`p-4 cursor-pointer transition-colors ${
                          selectedTicket?.id === ticket.id
                            ? "bg-teal-50 border-l-4 border-teal-500"
                            : ticket.status === "aperto"
                            ? "bg-green-50/50 hover:bg-green-50 border-l-4 border-green-400"
                            : "hover:bg-slate-50 border-l-4 border-transparent"
                        }`}
                        data-testid={`global-ticket-${ticket.id}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-slate-900 text-sm line-clamp-1 flex-1">
                            {ticket.status === "aperto" && (
                              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                            )}
                            {ticket.subject}
                          </h4>
                          {getStatusBadge(ticket.status)}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-teal-600 font-medium mb-1">
                          <User className="h-3 w-3" />
                          {ticket.client_name || "Cliente"}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateShort(ticket.created_at)}
                          </span>
                          <span>{ticket.messages?.length || 0} msg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Ticket Detail */}
          <Card className="md:col-span-3 bg-white border border-slate-200">
            <CardContent className="p-0">
              {selectedTicket ? (
                <div className="flex flex-col h-[600px]">
                  {/* Ticket Header */}
                  <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-lg">{selectedTicket.subject}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-teal-600 font-medium">
                            <User className="h-4 w-4" />
                            {selectedTicket.client_name || "Cliente"}
                          </span>
                          <span className="text-slate-500">
                            Aperto il {formatDate(selectedTicket.created_at)}
                          </span>
                        </div>
                        {selectedTicket.updated_at !== selectedTicket.created_at && (
                          <p className="text-xs text-slate-400 mt-1">
                            Ultimo aggiornamento: {formatDate(selectedTicket.updated_at)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(selectedTicket.status)}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
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
                        onClick={() => handleExportPdf(selectedTicket)}
                        disabled={exportingPdf}
                        className="border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        {exportingPdf ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-1"></div>
                        ) : (
                          <Download className="h-4 w-4 mr-1" />
                        )}
                        Esporta PDF
                      </Button>
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
                  <ScrollArea className="flex-1 p-4 bg-white">
                    <div className="space-y-4">
                      {selectedTicket.messages?.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_role === "commercialista" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-4 ${
                              msg.sender_role === "commercialista"
                                ? "bg-teal-500 text-white"
                                : "bg-slate-100 text-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4" />
                              <span className="text-sm font-medium">
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
                    <div className="p-4 border-t border-slate-200 bg-slate-50">
                      <div className="flex gap-2">
                        <Textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Scrivi una risposta..."
                          className="flex-1 resize-none border-slate-200 bg-white"
                          rows={2}
                          data-testid="global-reply-input"
                        />
                        <Button
                          onClick={handleSendReply}
                          disabled={sending || !replyContent.trim()}
                          className="bg-teal-500 hover:bg-teal-600 text-white self-end"
                          data-testid="global-send-reply"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border-t border-slate-200 bg-amber-50">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle className="h-4 w-4" />
                        <p className="text-sm">
                          Ticket {selectedTicket.status}. {selectedTicket.status === "chiuso" ? "Riapri per rispondere." : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[600px] text-center bg-slate-50">
                  <MessageSquare className="h-20 w-20 text-slate-300 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">Seleziona un ticket</h3>
                  <p className="text-slate-500 max-w-sm">
                    Clicca su un ticket dalla lista per visualizzare la conversazione e rispondere
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
              Questa azione non può essere annullata e tutto lo storico conversazione verrà perso.
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
              Elimina Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GlobalTicketManagement;
