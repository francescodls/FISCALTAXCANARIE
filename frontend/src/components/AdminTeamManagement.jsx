import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth, API } from '@/App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldCheck,
  Trash2, 
  Mail,
  Clock,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

/**
 * Componente per la gestione del team amministrativo
 * Visibile SOLO ai Super Admin
 */
const AdminTeamManagement = ({ token }) => {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'admin'
  });
  const [inviting, setInviting] = useState(false);
  const [lastInviteResult, setLastInviteResult] = useState(null);

  // Verifica se l'utente è super_admin
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      fetchTeam();
      fetchPendingInvites();
    }
  }, [isSuperAdmin]);

  const fetchTeam = async () => {
    try {
      const res = await axios.get(`${API}/admin/team`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeam(res.data);
    } catch (error) {
      console.error('Errore caricamento team:', error);
      toast.error('Errore nel caricamento del team');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvites = async () => {
    try {
      const res = await axios.get(`${API}/admin/pending-invites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingInvites(res.data);
    } catch (error) {
      console.error('Errore caricamento inviti:', error);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    
    // Validazione dominio
    if (!inviteForm.email.endsWith('@fiscaltaxcanarie.com')) {
      toast.error("L'email deve appartenere al dominio @fiscaltaxcanarie.com");
      return;
    }

    setInviting(true);
    try {
      const res = await axios.post(`${API}/admin/invite`, inviteForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setLastInviteResult({
        email: inviteForm.email,
        token: res.data.token,
        expires_at: res.data.expires_at
      });
      
      toast.success(`Invito inviato a ${inviteForm.email}`);
      setInviteForm({ email: '', first_name: '', last_name: '', role: 'admin' });
      fetchPendingInvites();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore invio invito');
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteAdmin = async (adminId, adminName) => {
    if (!confirm(`Sei sicuro di voler eliminare ${adminName}?`)) return;

    try {
      await axios.delete(`${API}/admin/team/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${adminName} eliminato`);
      fetchTeam();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Errore eliminazione');
    }
  };

  const handleCancelInvite = async (inviteId) => {
    try {
      await axios.delete(`${API}/admin/invite/${inviteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Invito annullato');
      fetchPendingInvites();
    } catch (error) {
      toast.error('Errore annullamento invito');
    }
  };

  const copyInviteLink = (token) => {
    const link = `${window.location.origin}/admin/activate?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiato negli appunti!');
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
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
        Admin
      </Badge>
    );
  };

  if (!isSuperAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-team-management">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-heading">Team Amministrativo</CardTitle>
                <p className="text-sm text-slate-500">Gestisci gli accessi del team</p>
              </div>
            </div>
            <Button
              onClick={() => setShowInviteDialog(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invita Amministratore
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Lista Team */}
      <Card className="bg-white border border-slate-200">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-purple-500" />
            Membri del Team
            <Badge variant="secondary" className="ml-2">{team.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {team.map((member) => (
              <div 
                key={member.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    {member.profile_image ? (
                      <AvatarImage src={member.profile_image} alt={member.full_name} />
                    ) : null}
                    <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold">
                      {getInitials(member.first_name, member.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="text-sm text-slate-500">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {getRoleBadge(member.role)}
                  <Badge className={member.stato === 'attivo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                    {member.stato}
                  </Badge>
                  {member.id !== user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteAdmin(member.id, member.full_name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Inviti in Attesa */}
      {pendingInvites.length > 0 && (
        <Card className="bg-white border border-slate-200">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Inviti in Attesa
              <Badge variant="secondary" className="ml-2">{pendingInvites.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div 
                  key={invite.id}
                  className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <Mail className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {invite.first_name} {invite.last_name}
                      </p>
                      <p className="text-sm text-slate-500">{invite.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getRoleBadge(invite.role)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyInviteLink(invite.token)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copia Link
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleCancelInvite(invite.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Invito */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-purple-500" />
              Invita Nuovo Amministratore
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={inviteForm.first_name}
                  onChange={(e) => setInviteForm({...inviteForm, first_name: e.target.value})}
                  placeholder="Nome"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Cognome *</Label>
                <Input
                  value={inviteForm.last_name}
                  onChange={(e) => setInviteForm({...inviteForm, last_name: e.target.value})}
                  placeholder="Cognome"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                placeholder="nome@fiscaltaxcanarie.com"
                required
              />
              <p className="text-xs text-slate-500">
                Solo email @fiscaltaxcanarie.com sono ammesse
              </p>
            </div>

            <div className="space-y-2">
              <Label>Ruolo</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) => setInviteForm({...inviteForm, role: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      Amministratore
                    </div>
                  </SelectItem>
                  <SelectItem value="super_admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-purple-500" />
                      Super Admin
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Risultato Invito */}
            {lastInviteResult && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Invito creato!</span>
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  Link di attivazione per {lastInviteResult.email}:
                </p>
                <div className="flex gap-2">
                  <Input 
                    value={`${window.location.origin}/admin/activate?token=${lastInviteResult.token}`}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyInviteLink(lastInviteResult.token)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Annulla</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={inviting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {inviting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Invio...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Invia Invito
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTeamManagement;
