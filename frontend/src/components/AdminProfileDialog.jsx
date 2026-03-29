import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useAuth, API } from '@/App';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Lock, 
  Camera, 
  Trash2, 
  Save, 
  Eye, 
  EyeOff,
  ShieldCheck,
  Shield,
  Loader2,
  CheckCircle,
  Upload
} from 'lucide-react';

/**
 * Dialog Profilo Personale per Admin/Super Admin
 * Permette di gestire: nome visualizzabile, email, password, foto profilo
 */
const AdminProfileDialog = ({ open, onOpenChange, token }) => {
  const { user, setUser } = useAuth();
  const fileInputRef = useRef(null);
  
  // Form state
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Inizializza form con dati utente
  useEffect(() => {
    if (user && open) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || ''
      });
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    }
  }, [user, open]);

  const getInitials = () => {
    const first = user?.first_name?.[0] || user?.full_name?.[0] || '';
    const last = user?.last_name?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  const getRoleBadge = () => {
    if (user?.role === 'super_admin') {
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

  // Salva profilo
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const res = await axios.put(`${API}/admin/profile`, profileForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Aggiorna user nel context
      setUser(res.data.user);
      toast.success('Profilo aggiornato con successo!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore aggiornamento profilo');
    } finally {
      setSaving(false);
    }
  };

  // Cambia password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Le password non coincidono');
      return;
    }
    
    if (passwordForm.new_password.length < 8) {
      toast.error('La password deve essere di almeno 8 caratteri');
      return;
    }
    
    setChangingPassword(true);
    
    try {
      await axios.put(`${API}/admin/change-password`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Password aggiornata con successo!');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore cambio password');
    } finally {
      setChangingPassword(false);
    }
  };

  // Upload immagine profilo
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validazione
    if (!file.type.startsWith('image/')) {
      toast.error('Il file deve essere un\'immagine');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'immagine non può superare 5MB');
      return;
    }
    
    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await axios.post(`${API}/admin/upload-profile-image`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Aggiorna user nel context
      setUser({ ...user, profile_image: res.data.profile_image });
      toast.success('Immagine profilo aggiornata!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore upload immagine');
    } finally {
      setUploadingImage(false);
    }
  };

  // Rimuovi immagine profilo
  const handleRemoveImage = async () => {
    if (!confirm('Sei sicuro di voler rimuovere la foto profilo?')) return;
    
    setUploadingImage(true);
    
    try {
      await axios.put(`${API}/admin/profile`, { profile_image: '' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUser({ ...user, profile_image: null });
      toast.success('Immagine profilo rimossa');
    } catch (error) {
      toast.error('Errore rimozione immagine');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <span className="text-xl">Il Mio Profilo</span>
              <p className="text-sm font-normal text-slate-500">{user?.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Avatar e info base */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="relative">
            <Avatar className="h-20 w-20 border-2 border-white shadow-lg">
              {user?.profile_image ? (
                <AvatarImage src={user.profile_image} alt={user.full_name} />
              ) : null}
              <AvatarFallback className="bg-purple-100 text-purple-700 text-xl font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {uploadingImage && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg text-slate-900">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-sm text-slate-500 mb-2">{user?.email}</p>
            {getRoleBadge()}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="text-teal-600 border-teal-200"
            >
              <Camera className="h-4 w-4 mr-1" />
              Cambia Foto
            </Button>
            {user?.profile_image && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveImage}
                disabled={uploadingImage}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Rimuovi
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Dati Profilo
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Sicurezza
            </TabsTrigger>
          </TabsList>

          {/* Tab Profilo */}
          <TabsContent value="profile" className="mt-4">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nome *</Label>
                  <Input
                    id="first_name"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({...profileForm, first_name: e.target.value})}
                    placeholder="Il tuo nome"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Cognome *</Label>
                  <Input
                    id="last_name"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({...profileForm, last_name: e.target.value})}
                    placeholder="Il tuo cognome"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                  placeholder="+34 612 345 678"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-md border border-slate-200">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">{user?.email}</span>
                </div>
                <p className="text-xs text-slate-500">
                  L'email non può essere modificata per motivi di sicurezza
                </p>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700">
                  <strong>Nome visualizzato ai clienti:</strong><br/>
                  {profileForm.first_name} {profileForm.last_name}
                </p>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-teal-500 hover:bg-teal-600"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salva Modifiche
                  </>
                )}
              </Button>
            </form>
          </TabsContent>

          {/* Tab Sicurezza */}
          <TabsContent value="security" className="mt-4">
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_password">Password Attuale *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="current_password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                    placeholder="Inserisci password attuale"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">Nuova Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="new_password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                    placeholder="Minimo 8 caratteri"
                    className="pl-10 pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Conferma Nuova Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirm_password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                    placeholder="Ripeti la nuova password"
                    className="pl-10"
                    required
                  />
                </div>
                {passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
                  <p className="text-xs text-red-500">Le password non coincidono</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={changingPassword || passwordForm.new_password !== passwordForm.confirm_password}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aggiornamento...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Cambia Password
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline">Chiudi</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminProfileDialog;
