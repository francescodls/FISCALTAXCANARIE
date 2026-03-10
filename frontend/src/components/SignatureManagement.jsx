import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Shield, 
  Upload, 
  Trash2, 
  Key,
  FileSignature,
  CheckCircle,
  AlertCircle,
  Lock,
  FileText,
  Download
} from "lucide-react";

const SignatureManagement = ({ token, clientId = null, clientName = "" }) => {
  const [certificates, setCertificates] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedCert, setSelectedCert] = useState("");
  const [certPassword, setCertPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [signing, setSigning] = useState(false);
  
  const [uploadForm, setUploadForm] = useState({
    name: "",
    password: "",
    file: null
  });

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchCertificates();
    if (clientId) {
      fetchClientDocuments();
    }
  }, [clientId]);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/certificates`, { headers });
      setCertificates(response.data);
    } catch (error) {
      console.error("Errore caricamento certificati:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDocuments = async () => {
    try {
      const response = await axios.get(`${API}/clients/${clientId}/documents`, { headers });
      // Filtra solo i documenti PDF che possono essere firmati
      const pdfDocs = response.data.filter(doc => 
        doc.filename?.toLowerCase().endsWith('.pdf') || doc.file_type === 'application/pdf'
      );
      setDocuments(pdfDocs);
    } catch (error) {
      console.error("Errore caricamento documenti:", error);
    }
  };

  const handleSignDocument = async () => {
    if (!selectedDoc || !selectedCert || !certPassword) {
      toast.error("Seleziona documento, certificato e inserisci la password");
      return;
    }

    setSigning(true);
    try {
      await axios.post(`${API}/sign-document`, {
        document_id: selectedDoc.id,
        certificate_id: selectedCert,
        password: certPassword,
        client_id: clientId
      }, { headers });
      
      toast.success("Documento firmato con successo!");
      setShowSignDialog(false);
      setSelectedDoc(null);
      setSelectedCert("");
      setCertPassword("");
      fetchClientDocuments();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nella firma del documento");
    } finally {
      setSigning(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.name || !uploadForm.password) {
      toast.error("Compila tutti i campi");
      return;
    }
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadForm.file);
      formData.append("certificate_name", uploadForm.name);
      formData.append("certificate_password", uploadForm.password);
      
      await axios.post(`${API}/certificates/upload`, formData, {
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data"
        }
      });
      
      toast.success("Certificato caricato con successo!");
      setShowUploadDialog(false);
      setUploadForm({ name: "", password: "", file: null });
      fetchCertificates();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nel caricamento del certificato");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (certName) => {
    if (!confirm("Sei sicuro di voler eliminare questo certificato?")) return;
    
    try {
      await axios.delete(`${API}/certificates/${certName}`, { headers });
      toast.success("Certificato eliminato");
      fetchCertificates();
    } catch (error) {
      toast.error("Errore nell'eliminazione del certificato");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-heading text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-500" />
            Certificati di Firma Digitale
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Gestisci i tuoi certificati .p12 per la firma digitale dei documenti
          </p>
        </div>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button className="bg-teal-500 hover:bg-teal-600 text-white" data-testid="upload-cert-btn">
              <Upload className="h-4 w-4 mr-2" />
              Carica Certificato
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-teal-500" />
                Carica Certificato .p12
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-800 font-medium">Informazioni sulla sicurezza</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Il certificato verrà salvato in modo sicuro. La password non viene memorizzata
                      e sarà richiesta ogni volta che firmerai un documento.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Nome Certificato *</Label>
                <Input
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                  placeholder="Es: Certificato Principale"
                  required
                  className="border-slate-200"
                  data-testid="cert-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label>File Certificato (.p12) *</Label>
                <Input
                  type="file"
                  accept=".p12"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                  required
                  className="border-slate-200"
                  data-testid="cert-file-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Password Certificato *</Label>
                <Input
                  type="password"
                  value={uploadForm.password}
                  onChange={(e) => setUploadForm({ ...uploadForm, password: e.target.value })}
                  placeholder="Password del certificato"
                  required
                  className="border-slate-200"
                  data-testid="cert-password-input"
                />
                <p className="text-xs text-slate-400">
                  La password serve per verificare la validità del certificato
                </p>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploading}
                  className="bg-teal-500 hover:bg-teal-600 text-white"
                  data-testid="upload-cert-submit-btn"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Verifica e Caricamento...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Carica Certificato
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Certificates List */}
      <Card className="bg-white border border-slate-200">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-slate-500" />
            I Tuoi Certificati
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
            </div>
          ) : certificates.length > 0 ? (
            <div className="space-y-3">
              {certificates.map((cert) => (
                <div 
                  key={cert.id} 
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center">
                      <FileSignature className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{cert.name}</p>
                      <p className="text-sm text-slate-500">{cert.filename}</p>
                      {cert.subject && (
                        <p className="text-xs text-slate-400 mt-1 truncate max-w-md">{cert.subject}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-50 text-green-700 border border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Valido
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(cert.name)}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      title="Elimina certificato"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h4 className="font-medium text-slate-700 mb-1">Nessun certificato caricato</h4>
              <p className="text-sm text-slate-500">
                Carica un certificato .p12 per poter firmare digitalmente i documenti
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documenti da Firmare (se siamo nella scheda cliente) */}
      {clientId && (
        <Card className="bg-white border border-slate-200">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              Documenti di {clientName || "questo cliente"}
            </CardTitle>
            <p className="text-sm text-slate-500">
              Seleziona un documento PDF per applicare la firma digitale
            </p>
          </CardHeader>
          <CardContent>
            {documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <FileText className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{doc.title || doc.filename}</p>
                        <p className="text-xs text-slate-500">{doc.category || "Documento PDF"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.is_signed && (
                        <Badge className="bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Firmato
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDoc(doc);
                          setShowSignDialog(true);
                        }}
                        disabled={certificates.length === 0}
                        className="border-purple-200 text-purple-600 hover:bg-purple-50"
                      >
                        <FileSignature className="h-4 w-4 mr-1" />
                        Firma
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h4 className="font-medium text-slate-700 mb-1">Nessun documento PDF</h4>
                <p className="text-sm text-slate-500">
                  Carica documenti PDF nella sezione Documenti per poterli firmare
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog Firma Documento */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-purple-500" />
              Firma Documento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDoc && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-900">{selectedDoc.title || selectedDoc.filename}</p>
                <p className="text-xs text-slate-500">Documento da firmare</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Seleziona Certificato *</Label>
              <Select value={selectedCert} onValueChange={setSelectedCert}>
                <SelectTrigger className="border-slate-200">
                  <SelectValue placeholder="Scegli un certificato..." />
                </SelectTrigger>
                <SelectContent>
                  {certificates.map((cert) => (
                    <SelectItem key={cert.name} value={cert.name}>
                      {cert.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Password Certificato *</Label>
              <Input
                type="password"
                value={certPassword}
                onChange={(e) => setCertPassword(e.target.value)}
                placeholder="Inserisci la password del certificato"
                className="border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowSignDialog(false);
                setSelectedDoc(null);
                setCertPassword("");
              }}
            >
              Annulla
            </Button>
            <Button
              onClick={handleSignDocument}
              disabled={signing || !selectedCert || !certPassword}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              {signing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Firma in corso...
                </>
              ) : (
                <>
                  <FileSignature className="h-4 w-4 mr-2" />
                  Firma Documento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Info Box */}
      <Card className="bg-gradient-to-br from-slate-50 to-stone-50 border border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <FileSignature className="h-6 w-6 text-teal-500" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">Come funziona la firma digitale?</h4>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="bg-teal-100 text-teal-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                  <span>Carica il tuo certificato .p12 (rilasciato da un ente certificatore)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-teal-100 text-teal-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                  <span>Vai nella sezione documenti di un cliente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-teal-100 text-teal-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                  <span>Clicca su "Firma" su un documento PDF</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-teal-100 text-teal-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                  <span>Inserisci la password del certificato per applicare la firma</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignatureManagement;
