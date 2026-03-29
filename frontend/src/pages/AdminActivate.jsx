import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ShieldCheck, 
  Shield, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';

/**
 * Pagina di attivazione account amministratore
 * Accessibile tramite link di invito
 */
const AdminActivate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState(null);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setError('Token di invito mancante');
      setVerifying(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const res = await axios.get(`${API}/admin/invite/verify/${token}`);
      setInviteData(res.data);
    } catch (error) {
      setError(error.response?.data?.detail || 'Invito non valido o scaduto');
    } finally {
      setVerifying(false);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Le password non coincidono');
      return;
    }

    if (password.length < 8) {
      toast.error('La password deve essere di almeno 8 caratteri');
      return;
    }

    setActivating(true);
    try {
      const res = await axios.post(`${API}/admin/activate`, {
        token,
        password
      });

      toast.success('Account attivato con successo!');
      
      // Salva token e reindirizza
      localStorage.setItem('token', res.data.access_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      // Reindirizza alla dashboard admin
      window.location.href = '/admin';
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore attivazione account');
    } finally {
      setActivating(false);
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'super_admin') {
      return (
        <Badge className="bg-purple-100 text-purple-700 flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          Super Admin
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1">
        <Shield className="h-3 w-3" />
        Amministratore
      </Badge>
    );
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-purple-500 mb-4" />
            <p className="text-slate-500">Verifica invito in corso...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Invito Non Valido</h2>
            <p className="text-slate-500 text-center mb-6">{error}</p>
            <Button onClick={() => navigate('/login')} variant="outline">
              Torna al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-purple-200">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-8 w-8 text-purple-600" />
          </div>
          <CardTitle className="text-2xl font-heading">Attiva il tuo Account</CardTitle>
          <p className="text-slate-500 mt-2">
            Benvenuto nel team di Fiscal Tax Canarie
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Info Invito */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Email</span>
              <span className="font-medium">{inviteData?.email}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Nome</span>
              <span className="font-medium">{inviteData?.first_name} {inviteData?.last_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Ruolo</span>
              {getRoleBadge(inviteData?.role)}
            </div>
          </div>

          {/* Form Password */}
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="space-y-2">
              <Label>Crea la tua Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimo 8 caratteri"
                  className="pl-10 pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Conferma Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ripeti la password"
                  className="pl-10"
                  required
                />
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500">Le password non coincidono</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={activating || password !== confirmPassword || password.length < 8}
            >
              {activating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Attivazione...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Attiva Account
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-slate-500">
            Attivando l'account accetti i termini di servizio di Fiscal Tax Canarie
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminActivate;
