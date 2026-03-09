import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Users, 
  FileText, 
  Wallet,
  StickyNote,
  LogOut,
  Search,
  User,
  ChevronRight,
  Plus,
  Calendar
} from "lucide-react";

const CommercialDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [stats, setStats] = useState({});
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, clientsRes] = await Promise.all([
        axios.get(`${API}/stats`, { headers }),
        axios.get(`${API}/clients`, { headers })
      ]);
      setStats(statsRes.data);
      setClients(clientsRes.data);
    } catch (error) {
      toast.error("Errore nel caricamento dei dati");
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg font-heading">FT</span>
            </div>
            <div>
              <span className="font-heading font-bold text-xl text-slate-900">Fiscal Tax Canarie</span>
              <span className="text-xs text-slate-500 block">Pannello Commercialista</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-600">
              <User className="h-5 w-5" />
              <span className="font-medium">{user?.full_name}</span>
              <Badge className="bg-teal-50 text-teal-700 border border-teal-100 ml-2">
                Commercialista
              </Badge>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-slate-200 text-slate-600 hover:text-slate-900"
              data-testid="logout-btn"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Esci
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-slate-900 mb-2">
            Dashboard Commercialista
          </h1>
          <p className="text-slate-600">Gestisci i tuoi clienti e le loro pratiche fiscali</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white border border-slate-200 card-hover">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Clienti Totali</p>
                <p className="text-2xl font-bold text-slate-900">{stats.clients_count || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 card-hover">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Documenti</p>
                <p className="text-2xl font-bold text-slate-900">{stats.documents_count || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 card-hover">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Wallet className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Buste Paga</p>
                <p className="text-2xl font-bold text-slate-900">{stats.payslips_count || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border border-slate-200 card-hover">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <StickyNote className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Appunti</p>
                <p className="text-2xl font-bold text-slate-900">{stats.notes_count || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clients Section */}
        <Card className="bg-white border border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-xl">I Tuoi Clienti</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cerca cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-slate-200"
                data-testid="search-clients-input"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredClients.length > 0 ? (
              <div className="space-y-3">
                {filteredClients.map((client) => (
                  <div 
                    key={client.id} 
                    className="flex items-center justify-between p-4 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/admin/client/${client.id}`)}
                    data-testid={`client-row-${client.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center">
                        <User className="h-6 w-6 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{client.full_name}</p>
                        <p className="text-sm text-slate-500">{client.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2">
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-100">
                          <FileText className="h-3 w-3 mr-1" />
                          {client.documents_count}
                        </Badge>
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <Wallet className="h-3 w-3 mr-1" />
                          {client.payslips_count}
                        </Badge>
                        <Badge className="bg-amber-50 text-amber-700 border border-amber-100">
                          <StickyNote className="h-3 w-3 mr-1" />
                          {client.notes_count}
                        </Badge>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                  {searchTerm ? "Nessun cliente trovato" : "Nessun cliente registrato"}
                </p>
                <p className="text-sm text-slate-400">
                  {searchTerm ? "Prova con un termine diverso" : "I nuovi clienti appariranno qui"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CommercialDashboard;
