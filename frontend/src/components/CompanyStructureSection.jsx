import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { 
  Building2, 
  Users, 
  Plus, 
  Trash2, 
  UserCog, 
  PieChart,
  AlertCircle,
  Check
} from 'lucide-react';

/**
 * Componente per la gestione della struttura societaria
 * Visibile SOLO per clienti di tipo "societa"
 * 
 * Props:
 * - tipoAmministrazione: string - tipo di amministrazione
 * - administrators: array - lista amministratori
 * - shareholders: array - lista soci/quote
 * - onUpdate: function({tipoAmministrazione, administrators, shareholders}) - callback per aggiornamento
 * - editing: boolean - modalità modifica attiva
 */
const CompanyStructureSection = ({ 
  tipoAmministrazione = '',
  administrators = [],
  shareholders = [],
  onUpdate,
  editing = false
}) => {
  // Stati locali per form
  const [localAdministrators, setLocalAdministrators] = useState(administrators || []);
  const [localShareholders, setLocalShareholders] = useState(shareholders || []);
  const [localTipoAmministrazione, setLocalTipoAmministrazione] = useState(tipoAmministrazione || '');

  // Sincronizza gli stati locali quando cambiano le props
  React.useEffect(() => {
    setLocalAdministrators(administrators || []);
    setLocalShareholders(shareholders || []);
    setLocalTipoAmministrazione(tipoAmministrazione || '');
  }, [administrators, shareholders, tipoAmministrazione]);

  // Notifica il parent dei cambiamenti
  const notifyParent = (newAdmins, newShareholders, newTipoAmm) => {
    if (onUpdate) {
      onUpdate({
        tipo_amministrazione: newTipoAmm,
        company_administrators: newAdmins,
        company_shareholders: newShareholders
      });
    }
  };

  // === AMMINISTRATORI ===
  const addAdministrator = () => {
    const newAdmin = {
      id: Date.now().toString(),
      nome: '',
      cognome: '',
      documento: '',
      carica: '',
      data_nomina: '',
      note: ''
    };
    const updated = [...localAdministrators, newAdmin];
    setLocalAdministrators(updated);
    notifyParent(updated, localShareholders, localTipoAmministrazione);
  };

  const updateAdministrator = (id, field, value) => {
    const updated = localAdministrators.map(admin => 
      admin.id === id ? { ...admin, [field]: value } : admin
    );
    setLocalAdministrators(updated);
    notifyParent(updated, localShareholders, localTipoAmministrazione);
  };

  const removeAdministrator = (id) => {
    const updated = localAdministrators.filter(admin => admin.id !== id);
    setLocalAdministrators(updated);
    notifyParent(updated, localShareholders, localTipoAmministrazione);
  };

  // === SOCI ===
  const addShareholder = () => {
    const newShareholder = {
      id: Date.now().toString(),
      denominazione: '',
      documento: '',
      percentuale: '',
      note: ''
    };
    const updated = [...localShareholders, newShareholder];
    setLocalShareholders(updated);
    notifyParent(localAdministrators, updated, localTipoAmministrazione);
  };

  const updateShareholder = (id, field, value) => {
    const updated = localShareholders.map(sh => 
      sh.id === id ? { ...sh, [field]: value } : sh
    );
    setLocalShareholders(updated);
    notifyParent(localAdministrators, updated, localTipoAmministrazione);
  };

  const removeShareholder = (id) => {
    const updated = localShareholders.filter(sh => sh.id !== id);
    setLocalShareholders(updated);
    notifyParent(localAdministrators, updated, localTipoAmministrazione);
  };

  const handleTipoAmministrazioneChange = (value) => {
    setLocalTipoAmministrazione(value);
    notifyParent(localAdministrators, localShareholders, value);
  };

  // Calcola totale percentuali
  const totalPercentage = localShareholders.reduce((sum, sh) => {
    const perc = parseFloat(sh.percentuale) || 0;
    return sum + perc;
  }, 0);

  const percentageValid = Math.abs(totalPercentage - 100) < 0.01 || totalPercentage === 0;

  // Label per tipo amministrazione
  const getTipoAmministrazioneLabel = (tipo) => {
    const labels = {
      'unico': 'Amministratore Unico',
      'solidale': 'Amministratori Solidali',
      'mancomunado': 'Amministratori Mancomunados'
    };
    return labels[tipo] || tipo || 'Non specificato';
  };

  return (
    <div className="space-y-6" data-testid="company-structure-section">
      {/* Card Tipo Amministrazione */}
      <Card className="bg-white border border-slate-200">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-500" />
            Tipo di Amministrazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-2">
              <Label>Modalità di Amministrazione</Label>
              <Select
                value={localTipoAmministrazione}
                onValueChange={handleTipoAmministrazioneChange}
              >
                <SelectTrigger className="border-slate-200 w-full md:w-1/2">
                  <SelectValue placeholder="Seleziona tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unico">Amministratore Unico</SelectItem>
                  <SelectItem value="solidale">Più Amministratori Solidali</SelectItem>
                  <SelectItem value="mancomunado">Più Amministratori Mancomunados</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-2">
                • <strong>Unico</strong>: Un solo amministratore con pieni poteri<br/>
                • <strong>Solidali</strong>: Ogni amministratore può agire autonomamente<br/>
                • <strong>Mancomunados</strong>: Gli amministratori devono agire congiuntamente
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-700 text-sm px-3 py-1">
                {getTipoAmministrazioneLabel(localTipoAmministrazione)}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Amministratori */}
      <Card className="bg-white border border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <UserCog className="h-5 w-5 text-blue-500" />
            Amministratori
            <Badge variant="secondary" className="ml-2">
              {localAdministrators.length}
            </Badge>
          </CardTitle>
          {editing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAdministrator}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Aggiungi Amministratore
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {localAdministrators.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              Nessun amministratore registrato
            </p>
          ) : (
            <div className="space-y-4">
              {localAdministrators.map((admin, index) => (
                <div 
                  key={admin.id} 
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  {editing ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-slate-600">
                          Amministratore {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAdministrator(admin.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs">Nome *</Label>
                          <Input
                            value={admin.nome || ''}
                            onChange={(e) => updateAdministrator(admin.id, 'nome', e.target.value)}
                            placeholder="Nome"
                            className="border-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Cognome *</Label>
                          <Input
                            value={admin.cognome || ''}
                            onChange={(e) => updateAdministrator(admin.id, 'cognome', e.target.value)}
                            placeholder="Cognome"
                            className="border-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">DNI/NIE</Label>
                          <Input
                            value={admin.documento || ''}
                            onChange={(e) => updateAdministrator(admin.id, 'documento', e.target.value)}
                            placeholder="X-1234567-A"
                            className="border-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Carica / Ruolo</Label>
                          <Input
                            value={admin.carica || ''}
                            onChange={(e) => updateAdministrator(admin.id, 'carica', e.target.value)}
                            placeholder="Es: Amministratore Delegato"
                            className="border-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Data Nomina</Label>
                          <Input
                            type="date"
                            value={admin.data_nomina || ''}
                            onChange={(e) => updateAdministrator(admin.id, 'data_nomina', e.target.value)}
                            className="border-slate-200"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-3">
                          <Label className="text-xs">Note</Label>
                          <Textarea
                            value={admin.note || ''}
                            onChange={(e) => updateAdministrator(admin.id, 'note', e.target.value)}
                            placeholder="Note aggiuntive..."
                            className="border-slate-200"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {admin.nome} {admin.cognome}
                        </p>
                        <p className="text-sm text-slate-500">
                          {admin.carica || 'Amministratore'}
                          {admin.documento && ` • ${admin.documento}`}
                        </p>
                        {admin.data_nomina && (
                          <p className="text-xs text-slate-400 mt-1">
                            Nomina: {new Date(admin.data_nomina).toLocaleDateString('it-IT')}
                          </p>
                        )}
                        {admin.note && (
                          <p className="text-xs text-slate-500 mt-2 italic">{admin.note}</p>
                        )}
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">
                        #{index + 1}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Soci / Quote */}
      <Card className="bg-white border border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <PieChart className="h-5 w-5 text-emerald-500" />
            Quote Sociali
            <Badge variant="secondary" className="ml-2">
              {localShareholders.length} soci
            </Badge>
          </CardTitle>
          {editing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addShareholder}
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Aggiungi Socio
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Indicatore totale percentuali */}
          {localShareholders.length > 0 && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              percentageValid 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {percentageValid ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">
                Totale quote: <strong>{totalPercentage.toFixed(2)}%</strong>
                {!percentageValid && totalPercentage > 0 && ' (dovrebbe essere 100%)'}
              </span>
            </div>
          )}

          {localShareholders.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">
              Nessun socio registrato
            </p>
          ) : (
            <div className="space-y-4">
              {localShareholders.map((shareholder, index) => (
                <div 
                  key={shareholder.id} 
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  {editing ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <span className="text-sm font-medium text-slate-600">
                          Socio {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeShareholder(shareholder.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-xs">Nome / Denominazione *</Label>
                          <Input
                            value={shareholder.denominazione || ''}
                            onChange={(e) => updateShareholder(shareholder.id, 'denominazione', e.target.value)}
                            placeholder="Nome socio o ragione sociale"
                            className="border-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">CIF/NIF/NIE</Label>
                          <Input
                            value={shareholder.documento || ''}
                            onChange={(e) => updateShareholder(shareholder.id, 'documento', e.target.value)}
                            placeholder="Documento"
                            className="border-slate-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Quota %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={shareholder.percentuale || ''}
                            onChange={(e) => updateShareholder(shareholder.id, 'percentuale', e.target.value)}
                            placeholder="Es: 50"
                            className="border-slate-200"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-4">
                          <Label className="text-xs">Note</Label>
                          <Textarea
                            value={shareholder.note || ''}
                            onChange={(e) => updateShareholder(shareholder.id, 'note', e.target.value)}
                            placeholder="Note aggiuntive..."
                            className="border-slate-200"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {shareholder.denominazione || 'Socio senza nome'}
                        </p>
                        {shareholder.documento && (
                          <p className="text-sm text-slate-500">{shareholder.documento}</p>
                        )}
                        {shareholder.note && (
                          <p className="text-xs text-slate-500 mt-1 italic">{shareholder.note}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge className="bg-emerald-100 text-emerald-700 text-lg px-4 py-1">
                          {shareholder.percentuale || 0}%
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanyStructureSection;
