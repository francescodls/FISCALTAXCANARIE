import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, FileText, Image, File, Maximize2, Minimize2, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";
import axios from "axios";
import { useAuth, API } from "@/App";

const DocumentPreview = ({ 
  isOpen, 
  onClose, 
  document, 
  previewUrl,
  onDownload 
}) => {
  const { token } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const timeoutRef = useRef(null);

  // Carica il documento come blob quando si apre la preview
  useEffect(() => {
    if (isOpen && document) {
      setLoading(true);
      setError(false);
      setBlobUrl(null);
      
      // Se abbiamo già un previewUrl (data URL base64), usalo direttamente
      if (previewUrl) {
        convertDataUrlToBlob(previewUrl);
      } else if (token) {
        loadDocumentAsBlob();
      } else {
        setError(true);
        setLoading(false);
      }
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Pulisci blob URL
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, document?.id, previewUrl]);

  // Converte un data URL in blob URL
  const convertDataUrlToBlob = async (dataUrl) => {
    try {
      // Estrai il mime type e i dati base64 dal data URL
      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        throw new Error('Data URL non valido');
      }
      
      const mimeType = matches[1];
      const base64Data = matches[2];
      
      // Decodifica base64 e crea blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      setLoading(false);
    } catch (err) {
      console.error("Errore conversione data URL:", err);
      setError(true);
      setLoading(false);
    }
  };

  const loadDocumentAsBlob = async () => {
    if (!document?.id) return;
    
    try {
      // Carica il documento con i dati binari
      const response = await axios.get(`${API}/documents/${document.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const docData = response.data;
      
      if (docData.file_data) {
        // Decodifica base64 e crea blob
        const byteCharacters = atob(docData.file_data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: docData.file_type || 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setLoading(false);
      } else if (docData.storage_path) {
        // Se il file è su storage esterno, prova a caricarlo
        const previewResponse = await axios.get(`${API}/documents/${document.id}/preview`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        });
        const url = URL.createObjectURL(previewResponse.data);
        setBlobUrl(url);
        setLoading(false);
      } else {
        setError(true);
        setLoading(false);
      }
    } catch (err) {
      console.error("Errore caricamento documento:", err);
      setError(true);
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (previewUrl) {
      convertDataUrlToBlob(previewUrl);
    } else {
      loadDocumentAsBlob();
    }
  };

  const openInNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  if (!document) return null;

  const fileName = document.file_name || document.title || "Documento";
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Determina il tipo di file
  const isPdf = fileExtension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension);
  const isText = ['txt', 'csv', 'json', 'xml', 'html', 'css', 'js'].includes(fileExtension);
  const isPreviewable = isPdf || isImage || isText;

  const getFileIcon = () => {
    if (isPdf) return <FileText className="h-12 w-12 text-red-500" />;
    if (isImage) return <Image className="h-12 w-12 text-blue-500" />;
    return <File className="h-12 w-12 text-slate-400" />;
  };

  // Calcola dimensioni dinamiche
  const dialogSize = isFullscreen 
    ? 'w-[98vw] max-w-[98vw] h-[96vh] max-h-[96vh]' 
    : 'w-[90vw] max-w-5xl h-[85vh] max-h-[85vh]';

  const contentHeight = isFullscreen ? 'calc(96vh - 80px)' : 'calc(85vh - 80px)';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`${dialogSize} p-0 gap-0 transition-all duration-300 flex flex-col overflow-hidden`}
        data-testid="document-preview-dialog"
      >
        {/* Header fisso */}
        <DialogHeader className="p-4 border-b bg-slate-50 flex flex-row items-center justify-between space-y-0 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              {getFileIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-semibold truncate pr-4">
                {fileName}
              </DialogTitle>
              <p className="text-sm text-slate-500 truncate">
                {document.category && <span className="capitalize">{document.category} • </span>}
                {fileExtension.toUpperCase()}
                {document.document_year && <span> • {document.document_year}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Apri in nuova scheda */}
            {blobUrl && isPreviewable && (
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewTab}
                className="border-slate-200"
                title="Apri in nuova scheda"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            {/* Toggle fullscreen */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="border-slate-200"
              title={isFullscreen ? "Riduci" : "Espandi"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            {/* Download */}
            {onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
                className="border-teal-200 text-teal-600 hover:bg-teal-50"
                data-testid="download-btn"
              >
                <Download className="h-4 w-4 mr-2" />
                Scarica
              </Button>
            )}
            {/* Chiudi */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content area */}
        <div 
          className="flex-1 overflow-hidden bg-slate-100 relative"
          style={{ height: contentHeight, minHeight: '400px' }}
        >
          {/* Loading spinner */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Caricamento documento...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
              <div className="text-center p-8 max-w-md">
                <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  Impossibile caricare il documento
                </h3>
                <p className="text-slate-500 mb-6">
                  Si è verificato un errore nel caricamento.
                  Prova a ricaricare o scarica il file direttamente.
                </p>
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleRetry} 
                    className="bg-teal-500 hover:bg-teal-600 text-white w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Riprova
                  </Button>
                  {onDownload && (
                    <Button 
                      onClick={onDownload} 
                      variant="outline"
                      className="w-full border-teal-200 text-teal-600"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Scarica il file
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Preview content */}
          {!loading && !error && blobUrl && isPreviewable ? (
            <div className="w-full h-full">
              {isPdf && (
                <iframe
                  src={blobUrl}
                  className="w-full h-full border-0"
                  title={fileName}
                  data-testid="pdf-preview-iframe"
                />
              )}
              {isImage && (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto bg-slate-800">
                  <img
                    src={blobUrl}
                    alt={fileName}
                    className="max-w-full max-h-full object-contain rounded shadow-2xl"
                    data-testid="image-preview"
                  />
                </div>
              )}
              {isText && (
                <iframe
                  src={blobUrl}
                  className="w-full h-full border-0 bg-white"
                  title={fileName}
                  data-testid="text-preview-iframe"
                />
              )}
            </div>
          ) : !loading && !error && !isPreviewable ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center p-8 max-w-md">
                {getFileIcon()}
                <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">
                  Anteprima non disponibile
                </h3>
                <p className="text-slate-500 mb-6">
                  Questo tipo di file ({fileExtension.toUpperCase()}) non supporta l'anteprima nel browser.
                </p>
                {onDownload && (
                  <Button 
                    onClick={onDownload} 
                    className="bg-teal-500 hover:bg-teal-600 text-white"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Scarica il file
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreview;
