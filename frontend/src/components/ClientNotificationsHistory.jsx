import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Bell, 
  Send, 
  Mail,
  FileText,
  Calendar,
  StickyNote,
  UserPlus,
  Users,
  Clock
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const ClientNotificationsHistory = ({ token, clientId, clientName }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendForm, setSendForm] = useState({
    title: "",
    message: "",
    send_email: false
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchNotifications();
  }, [clientId]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/clients/${clientId}/notifications-history`,
        { headers }
      );
      setNotifications(response.data);
    } catch (error) {
      console.error("Errore nel caricamento notifiche:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!sendForm.title || !sendForm.message) {
      toast.error("Compila titolo e messaggio");
      return;
    }
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("title", sendForm.title);
      formData.append("message", sendForm.message);
      formData.append("send_email", sendForm.send_email);

      const response = await axios.post(
        `${API}/clients/${clientId}/send-notification`,
        formData,
        { headers }
      );
      
      if (response.data.email_sent) {
        toast.success("Notifica inviata e email spedita");
      } else if (response.data.success) {
        toast.success("Notifica salvata (email non inviata - controlla Brevo API)");
      } else {
        toast.success("Notifica salvata");
      }
      
      setShowSendDialog(false);
      setSendForm({ title: "", message: "", send_email: false });
      fetchNotifications();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'invio");
    } finally {
      setSending(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "document": return <FileText className="h-4 w-4 text-blue-500" />;
      case "deadline": return <Calendar className="h-4 w-4 text-amber-500" />;
      case "note": return <StickyNote className="h-4 w-4 text-purple-500" />;
      case "welcome": return <UserPlus className="h-4 w-4 text-emerald-500" />;
      case "invite": return <Mail className="h-4 w-4 text-teal-500" />;
      case "employee": return <Users className="h-4 w-4 text-indigo-500" />;
      case "manual": return <Bell className="h-4 w-4 text-orange-500" />;
      default: return <Bell className="h-4 w-4 text-slate-500" />;
    }
  };

  const getNotificationTypeName = (type) => {
    switch (type) {
      case "document": return "Documento";
      case "deadline": return "Scadenza";
      case "note": return "Nota";
      case "welcome": return "Benvenuto";
      case "invite": return "Invito";
      case "employee": return "Dipendente";
      case "manual": return "Manuale";
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Card className="bg-white border border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" />
          Cronologia Notifiche
        </CardTitle>
        <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
          <DialogTrigger asChild>
            <Button 
              className="bg-amber-500 hover:bg-amber-600 text-white"
              data-testid="send-notification-btn"
            >
              <Send className="h-4 w-4 mr-2" />
              Invia Notifica
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-amber-500" />
                Invia Notifica a {clientName}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSendNotification} className="space-y-4">
              <div className="space-y-2">
                <Label>Titolo *</Label>
                <Input
                  value={sendForm.title}
                  onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
                  placeholder="Oggetto della notifica"
                  required
                  data-testid="notification-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Messaggio *</Label>
                <Textarea
                  value={sendForm.message}
                  onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                  placeholder="Scrivi il messaggio..."
                  rows={4}
                  required
                  data-testid="notification-message"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send_email"
                  checked={sendForm.send_email}
                  onCheckedChange={(checked) => setSendForm({ ...sendForm, send_email: checked })}
                  data-testid="send-email-checkbox"
                />
                <Label htmlFor="send_email" className="text-sm cursor-pointer">
                  Invia anche via email al cliente
                </Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowSendDialog(false)}>
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={sending}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {sending ? "Invio..." : "Invia"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {notifications.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="p-3 bg-slate-50 rounded-lg border border-slate-100"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 truncate">{notif.title}</span>
                      <Badge className="bg-slate-100 text-slate-600 text-xs shrink-0">
                        {getNotificationTypeName(notif.type)}
                      </Badge>
                      {notif.email_sent && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs shrink-0">
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(notif.created_at), "dd/MM/yyyy HH:mm", { locale: it })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">Nessuna notifica inviata</p>
            <p className="text-sm text-slate-400">Le notifiche inviate al cliente appariranno qui</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientNotificationsHistory;
