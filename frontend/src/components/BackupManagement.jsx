import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Download, 
  HardDrive, 
  Cloud, 
  CloudOff,
  Database,
  FileArchive,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Server,
  Zap
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const BackupManagement = ({ token, API }) => {
  const [storageStatus, setStorageStatus] = useState(null);
  const [backupHistory, setBackupHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [migrating, setMigrating] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        axios.get(`${API}/storage/status`, { headers }),
        axios.get(`${API}/backup/history`, { headers })
      ]);
      setStorageStatus(statusRes.data);
      setBackupHistory(historyRes.data);
    } catch (error) {
      console.error("Errore caricamento dati storage:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async (type, clientId = null) => {
    const downloadKey = clientId || type;
    setDownloading(downloadKey);
    
    try {
      let url = type === 'full' ? `${API}/backup/full` : 
                type === 'json' ? `${API}/backup/export-json` :
                `${API}/backup/client/${clientId}`;
      
      const response = await axios.get(url, {
        headers,
        responseType: 'blob'
      });
      
      // Estrai nome file dall'header o genera uno default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'backup.zip';
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="(.+)"/);
        if (matches) filename = matches[1];
      }
      
      // Download file
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      toast.success(`Backup scaricato: ${filename}`);
      fetchData(); // Ricarica storico
    } catch (error) {
      toast.error("Errore durante il download del backup");
    } finally {
      setDownloading(null);
    }
  };

  const startMigration = async () => {
    if (!confirm("Vuoi avviare la migrazione dei file su cloud storage? L'operazione avverrà in background.")) return;
    
    setMigrating(true);
    try {
      const response = await axios.post(`${API}/storage/migrate-to-cloud`, {}, { headers });
      toast.success(response.data.message);
      
      // Mostra dettagli
      if (response.data.files_to_migrate) {
        toast.info(`File da migrare: ${response.data.files_to_migrate.total}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore avvio migrazione");
    } finally {
      setMigrating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  const stats = storageStatus?.statistics || {};
  const isCloudEnabled = storageStatus?.cloud_storage_enabled;
  const migrationPending = storageStatus?.migration_pending || 0;

  return (
    <div className="space-y-6">
      {/* Storage Status */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className={`border-2 ${isCloudEnabled ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isCloudEnabled ? (
                <>
                  <Cloud className="h-5 w-5 text-green-600" />
                  <span className="text-green-700">Backblaze B2 Attivo</span>
                </>
              ) : (
                <>
                  <CloudOff className="h-5 w-5 text-amber-600" />
                  <span className="text-amber-700">Storage Locale (MongoDB)</span>
                </>
              )}
            </CardTitle>
            <CardDescription>
              {storageStatus?.storage_provider}
              {storageStatus?.bucket_name && ` - Bucket: ${storageStatus.bucket_name}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">File su cloud:</span>
                <Badge variant="outline">{stats.total_cloud_files || stats.total_files || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Dimensione:</span>
                <Badge variant="outline">
                  {(stats.total_size_mb || stats.estimated_size_mb || 0) < 1 
                    ? `${Math.round((stats.total_size_bytes || stats.estimated_size_bytes || 0) / 1024)} KB`
                    : (stats.total_size_gb || stats.estimated_size_gb || 0) >= 1 
                      ? `${stats.total_size_gb || stats.estimated_size_gb} GB`
                      : `${stats.total_size_mb || stats.estimated_size_mb} MB`
                  }
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Limite file:</span>
                <Badge variant="outline">
                  {storageStatus?.limits?.max_file_size_mb >= 1000 
                    ? `${storageStatus.limits.max_file_size_mb / 1000} GB`
                    : `${storageStatus?.limits?.max_file_size_mb || 16} MB`
                  }
                </Badge>
              </div>
              {migrationPending > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-600">File da migrare:</span>
                  <Badge className="bg-amber-100 text-amber-700">{migrationPending}</Badge>
                </div>
              )}
            </div>
            
            {!isCloudEnabled && storageStatus?.limits?.recommended_action && (
              <div className="mt-4 p-3 bg-amber-100 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-800">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  {storageStatus.limits.recommended_action}
                </p>
              </div>
            )}
            
            {isCloudEnabled && migrationPending > 0 && (
              <Button 
                onClick={startMigration}
                disabled={migrating}
                className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
              >
                {migrating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Migrazione in corso...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Migra {migrationPending} File su Backblaze B2
                  </>
                )}
              </Button>
            )}
            
            {isCloudEnabled && migrationPending === 0 && (
              <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200 text-center">
                <CheckCircle className="h-5 w-5 text-green-600 inline mr-2" />
                <span className="text-sm text-green-800 font-medium">Tutti i file sono su cloud!</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HardDrive className="h-5 w-5 text-slate-600" />
              Statistiche Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Documenti</span>
                  <span className="text-sm font-medium">{stats.documents_count || 0}</span>
                </div>
                <Progress value={Math.min((stats.documents_count / 100) * 100, 100)} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-600">Buste Paga</span>
                  <span className="text-sm font-medium">{stats.payslips_count || 0}</span>
                </div>
                <Progress value={Math.min((stats.payslips_count / 100) * 100, 100)} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Download Backup Buttons */}
      <Card className="bg-white border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileArchive className="h-6 w-6 text-teal-500" />
            Scarica Backup
          </CardTitle>
          <CardDescription>
            Scarica una copia di sicurezza di tutti i tuoi dati
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileArchive className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Backup Completo</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Tutti i clienti, documenti, scadenze e configurazioni in un unico ZIP
                </p>
                <Button
                  onClick={() => downloadBackup('full')}
                  disabled={downloading === 'full'}
                  className="w-full bg-teal-500 hover:bg-teal-600 text-white"
                  data-testid="download-full-backup-btn"
                >
                  {downloading === 'full' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Preparazione...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Scarica ZIP
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Database className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Export Database</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Tutti i dati in formato JSON (senza file binari)
                </p>
                <Button
                  onClick={() => downloadBackup('json')}
                  disabled={downloading === 'json'}
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                  data-testid="download-json-export-btn"
                >
                  {downloading === 'json' ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Preparazione...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Scarica JSON
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Server className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Backup Mensile</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Configura backup automatico mensile (coming soon)
                </p>
                <Button
                  variant="outline"
                  disabled
                  className="w-full border-purple-300 text-purple-700"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Prossimamente
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card className="bg-white border border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-slate-500" />
            Storico Backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          {backupHistory.length > 0 ? (
            <div className="space-y-3">
              {backupHistory.map((backup, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                      <FileArchive className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{backup.filename}</p>
                      <p className="text-sm text-slate-500">
                        {format(parseISO(backup.created_at), "d MMMM yyyy, HH:mm", { locale: it })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-slate-100 text-slate-600">
                      {backup.size_bytes > 1024 * 1024 
                        ? `${(backup.size_bytes / (1024 * 1024)).toFixed(1)} MB`
                        : `${Math.round(backup.size_bytes / 1024)} KB`
                      }
                    </Badge>
                    <Badge className={backup.type === 'full' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}>
                      {backup.type === 'full' ? 'Completo' : 'Cliente'}
                    </Badge>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileArchive className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Nessun backup effettuato</p>
              <p className="text-sm text-slate-400">
                Clicca su "Scarica ZIP" per creare il tuo primo backup
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManagement;
