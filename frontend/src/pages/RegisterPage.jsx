import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "cliente"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await register(formData);
      navigate(user.role === "commercialista" ? "/admin" : "/dashboard");
    } catch (error) {
      console.error("Register error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg font-heading">FT</span>
            </div>
            <span className="font-heading font-bold text-xl text-slate-900">Fiscal Tax Canarie</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fadeIn">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6 text-slate-600 hover:text-slate-900 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla home
          </Button>

          <Card className="bg-white border border-slate-200 shadow-xl rounded-2xl">
            <CardHeader className="space-y-2 pb-6">
              <CardTitle className="font-heading text-2xl font-bold text-slate-900">
                Crea il tuo account
              </CardTitle>
              <CardDescription className="text-slate-600">
                Registrati per accedere all'Area Clienti
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-slate-700 font-medium">
                    Nome Completo
                  </Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    type="text"
                    placeholder="Mario Rossi"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="h-12 px-4 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                    data-testid="register-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="nome@esempio.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-12 px-4 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                    data-testid="register-email-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-700 font-medium">
                    Telefono (opzionale)
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+34 XXX XXX XXX"
                    value={formData.phone}
                    onChange={handleChange}
                    className="h-12 px-4 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                    data-testid="register-phone-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Crea una password sicura"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      className="h-12 px-4 pr-12 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                      data-testid="register-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 font-medium">
                    Tipo di Account
                  </Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger 
                      className="h-12 px-4 border-slate-200 focus:border-teal-500 focus:ring-teal-500/20"
                      data-testid="register-role-select"
                    >
                      <SelectValue placeholder="Seleziona tipo account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="commercialista">Commercialista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-slate-900 font-bold h-12 rounded-lg btn-press"
                  data-testid="register-submit-btn"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-900 border-t-transparent"></div>
                      Registrazione...
                    </div>
                  ) : (
                    "Registrati"
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-slate-600">
                  Hai già un account?{" "}
                  <Link 
                    to="/login" 
                    className="text-teal-600 hover:text-teal-700 font-semibold"
                    data-testid="register-login-link"
                  >
                    Accedi
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default RegisterPage;
