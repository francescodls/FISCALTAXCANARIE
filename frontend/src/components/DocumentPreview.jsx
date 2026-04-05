import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Download, X, FileText, Image, File, Maximize2, Minimize2, RefreshCw, AlertTriangle, ExternalLink } from "lucide-react";

const DocumentPreview = ({ 
  isOpen, 
  onClose, 
  document, 
  previewUrl,
  onDownload 
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const iframeRef = useRef(null);
  const timeoutRef = useRef(null);

  // Reset state quando cambia il documento
  useEffect(() => {
    if (isOpen && document) {
      setLoading(true);
      setError(false);
      setLoadTimeout(false);
      
      // Timeout di sicurezza per evitare blocchi infiniti (15 secondi)
      timeoutRef.current = setTimeout(() => {
        if (loading) {
          setLoadTimeout(true);
          setLoading(false);
        }
      }, 15000);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isOpen, document, previewUrl]);

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

  const handleLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setLoading(false);
    setError(false);
    setLoadTimeout(false);
  };

  const handleError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setLoading(false);
    setError(true);
  };

  const handleRetry = () => {
    setLoading(true);
    setError(false);
    setLoadTimeout(false);
    
    // Forza refresh dell'iframe
    if (iframeRef.current) {
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc;
        }
      }, 100);
    }
    
    // Nuovo timeout
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        setLoadTimeout(true);
        setLoading(false);
      }
    }, 15000);
  };

  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
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
            {previewUrl && isPreviewable && (
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

        {/* Content area che occupa tutto lo spazio rimanente */}
        <div 
          className="flex-1 overflow-hidden bg-slate-100 relative"
          style={{ height: contentHeight, minHeight: '400px' }}
        >
          {/* Loading spinner */}
          {loading && isPreviewable && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium">Caricamento anteprima...</p>
                <p className="text-slate-400 text-sm">Attendere qualche secondo</p>
              </div>
            </div>
          )}

          {/* Timeout warning */}
          {loadTimeout && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
              <div className="text-center p-8 max-w-md">
                <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  Il caricamento sta richiedendo più tempo del previsto
                </h3>
                <p className="text-slate-500 mb-6">
                  Il documento potrebbe essere grande o la connessione lenta.
                </p>
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={handleRetry} 
                    className="bg-teal-500 hover:bg-teal-600 text-white w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Riprova
                  </Button>
                  <Button 
                    onClick={openInNewTab} 
                    variant="outline"
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Apri in nuova scheda
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

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
              <div className="text-center p-8 max-w-md">
                <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">
                  Impossibile caricare l'anteprima
                </h3>
                <p className="text-slate-500 mb-6">
                  Si è verificato un errore nel caricamento del documento.
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
          {isPreviewable && previewUrl ? (
            <div className="w-full h-full">
              {isPdf && (
                <iframe
                  ref={iframeRef}
                  src={`${previewUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                  className="w-full h-full border-0"
                  onLoad={handleLoad}
                  onError={handleError}
                  title={fileName}
                  style={{ display: loading || error || loadTimeout ? 'none' : 'block' }}
                  data-testid="pdf-preview-iframe"
                />
              )}
              {isImage && (
                <div 
                  className="w-full h-full flex items-center justify-center p-4 overflow-auto bg-slate-800"
                  style={{ display: loading || error || loadTimeout ? 'none' : 'flex' }}
                >
                  <img
                    src={previewUrl}
                    alt={fileName}
                    className="max-w-full max-h-full object-contain rounded shadow-2xl"
                    onLoad={handleLoad}
                    onError={handleError}
                    data-testid="image-preview"
                  />
                </div>
              )}
              {isText && (
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className="w-full h-full border-0 bg-white"
                  onLoad={handleLoad}
                  onError={handleError}
                  title={fileName}
                  style={{ display: loading || error || loadTimeout ? 'none' : 'block' }}
                  data-testid="text-preview-iframe"
                />
              )}
            </div>
          ) : (
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreview;
