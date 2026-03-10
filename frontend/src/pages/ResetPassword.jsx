import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import LanguageSelector from "@/components/LanguageSelector";
import { useLanguage } from "@/i18n/LanguageContext";

const ResetPassword = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setVerifying(false);
      setTokenError("Link non valido");
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await axios.get(`${API}/auth/verify-reset-token?token=${token}`);
      setTokenValid(true);
      setEmail(response.data.email);
    } catch (error) {
      setTokenError(error.response?.data?.detail || "Link non valido o scaduto");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error("La password deve essere di almeno 6 caratteri");
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error("Le password non coincidono");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: password
      });
      setSuccess(true);
      toast.success("Password reimpostata con successo!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nel reset della password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg font-heading">FT</span>
            </div>
            <span className="font-heading font-bold text-xl text-slate-900">Fiscal Tax Canarie</span>
          </Link>
          <LanguageSelector variant="flags-only" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fadeIn">
          <Card className="bg-white border border-slate-200 shadow-xl rounded-2xl">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="font-heading text-2xl font-bold text-slate-900">
                {success ? "Password Reimpostata" : "Nuova Password"}
              </CardTitle>
              {!verifying && tokenValid && !success && (
                <CardDescription className="text-slate-600">
                  Crea una nuova password per <span className="font-medium">{email}</span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {verifying ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-slate-600">Verifica del link in corso...</p>
                </div>
              ) : !tokenValid ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Link non valido
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {tokenError}
                  </p>
                  <Link to="/forgot-password">
                    <Button className="bg-teal-500 hover:bg-teal-600 text-white">
                      Richiedi nuovo link
                    </Button>
                  </Link>
                </div>
              ) : success ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Password aggiornata!
                  </h3>
                  <p className="text-slate-600 mb-6">
                    La tua password è stata reimpostata con successo. Ora puoi accedere con la nuova password.
                  </p>
                  <Link to="/login">
                    <Button className="w-full bg-teal-500 hover:bg-teal-600 text-white">
                      Vai al login
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700 font-medium">
                      Nuova Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Almeno 6 caratteri"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="h-12 pl-10 pr-12 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                        data-testid="reset-password-input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">
                      Conferma Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Ripeti la password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="h-12 pl-10 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                        data-testid="reset-confirm-input"
                      />
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-sm text-red-500">Le password non coincidono</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || password !== confirmPassword}
                    className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold h-12 rounded-lg btn-press"
                    data-testid="reset-submit-btn"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Salvataggio...
                      </div>
                    ) : (
                      "Salva nuova password"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
