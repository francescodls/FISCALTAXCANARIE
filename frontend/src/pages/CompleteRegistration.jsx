import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Lock, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

const CompleteRegistration = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  
  const [token, setToken] = useState("");
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    full_name: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    console.log("Token from URL:", tokenParam); // Debug
    
    if (tokenParam && tokenParam.length > 10) {
      setToken(tokenParam);
      setError(""); // Resetta errore se token valido
    } else {
      setError("Link non valido. Il link di invito deve contenere un token. Controlla l'email ricevuta o richiedi un nuovo invito al tuo commercialista.");
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validazione
    if (formData.password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri");
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("Le password non coincidono");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/complete-registration`, {
        token: token,
        password: formData.password,
        full_name: formData.full_name || null
      });
      
      if (response.data.success) {
        setSuccess(true);
        toast.success("Registrazione completata con successo!");
        
        // Effettua login automatico
        if (response.data.access_token) {
          login(response.data.access_token, response.data.user);
          
          // Redirect dopo 2 secondi
          setTimeout(() => {
            navigate("/client");
          }, 2000);
        }
      }
    } catch (err) {
      const errorDetail = err.response?.data?.detail || "Errore durante la registrazione";
      
      // Messaggi più chiari per errori comuni
      if (errorDetail.includes("già utilizzato") || errorDetail.includes("già completata") || errorDetail.includes("Login")) {
        setError("Hai già completato la registrazione con questo link!\n\nPuoi accedere direttamente dalla pagina di Login.");
        setSuccess(false);
      } else if (errorDetail.includes("non valido") || errorDetail.includes("scaduto")) {
        setError("Il link di invito non è valido o è scaduto. Possibili cause:\n• Il link è stato copiato in modo incompleto\n• L'invito è scaduto (valido per 7 giorni)\n\nRichiedi un nuovo invito al tuo commercialista.");
      } else {
        setError(errorDetail);
      }
      toast.error("Errore nella registrazione");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Registrazione Completata!</h2>
            <p className="text-slate-600 mb-6">
              Il tuo account è stato creato con successo. Verrai reindirizzato alla tua dashboard...
            </p>
            <div className="animate-pulse flex justify-center">
              <div className="h-2 w-24 bg-teal-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">FT</span>
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Completa la Registrazione
          </CardTitle>
          <CardDescription className="text-slate-600">
            Imposta la tua password per accedere all'area clienti
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-red-700 text-sm whitespace-pre-line">{error}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <button 
                      onClick={() => navigate("/login")}
                      className="text-sm text-red-600 hover:text-red-800 underline text-left"
                    >
                      → Hai già un account? Vai al Login
                    </button>
                    <button 
                      onClick={() => navigate("/")}
                      className="text-sm text-red-600 hover:text-red-800 underline text-left"
                    >
                      → Torna alla Home
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {!token ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-slate-600">
                Token non valido. Contatta il tuo commercialista per ricevere un nuovo invito.
              </p>
              <Button 
                className="mt-6"
                onClick={() => navigate("/")}
              >
                Torna alla Home
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-slate-700">
                  Nome Completo (opzionale)
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="Mario Rossi"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="pl-10 border-slate-200 focus:border-teal-500 focus:ring-teal-500"
                    data-testid="fullname-input"
                  />
                </div>
                <p className="text-xs text-slate-400">
                  Puoi modificarlo in seguito dalle impostazioni
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">
                  Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimo 8 caratteri"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                    className="pl-10 border-slate-200 focus:border-teal-500 focus:ring-teal-500"
                    data-testid="password-input"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700">
                  Conferma Password *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Ripeti la password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="pl-10 border-slate-200 focus:border-teal-500 focus:ring-teal-500"
                    data-testid="confirm-password-input"
                  />
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-6 text-lg"
                data-testid="complete-registration-btn"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Completamento...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Completa Registrazione
                    <ArrowRight className="h-5 w-5" />
                  </div>
                )}
              </Button>
            </form>
          )}
          
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Hai già un account?{" "}
              <button 
                onClick={() => navigate("/login")}
                className="text-teal-600 hover:text-teal-700 font-medium"
              >
                Accedi qui
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteRegistration;
