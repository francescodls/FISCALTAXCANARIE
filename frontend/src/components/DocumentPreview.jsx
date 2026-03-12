import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Download, X, FileText, Image, File, Maximize2, Minimize2 } from "lucide-react";

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

  if (!document) return null;

  const fileName = document.file_name || document.title || "Documento";
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Determina il tipo di file
  const isPdf = fileExtension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension);
  const isText = ['txt', 'csv', 'json', 'xml', 'html', 'css', 'js'].includes(fileExtension);
  const isPreviewable = isPdf || isImage || isText;

  const getFileIcon = () => {
    if (isPdf) return <FileText className="h-16 w-16 text-red-500" />;
    if (isImage) return <Image className="h-16 w-16 text-blue-500" />;
    return <File className="h-16 w-16 text-slate-400" />;
  };

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`${isFullscreen ? 'max-w-[95vw] w-[95vw] h-[95vh] max-h-[95vh]' : 'max-w-4xl w-full h-[85vh] max-h-[85vh]'} p-0 gap-0 transition-all duration-300`}
      >
        {/* Header */}
        <DialogHeader className="p-4 border-b bg-slate-50 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getFileIcon()}
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-semibold truncate pr-4">
                {fileName}
              </DialogTitle>
              <p className="text-sm text-slate-500 truncate">
                {document.category && <span className="capitalize">{document.category} • </span>}
                {fileExtension.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="border-slate-200"
              title={isFullscreen ? "Riduci" : "Espandi"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            {onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
                className="border-teal-200 text-teal-600 hover:bg-teal-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Scarica
              </Button>
            )}
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

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-slate-100 relative">
          {loading && isPreviewable && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500">Caricamento anteprima...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
              <div className="text-center p-8">
                {getFileIcon()}
                <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">
                  Impossibile caricare l'anteprima
                </h3>
                <p className="text-slate-500 mb-4">
                  Si è verificato un errore nel caricamento del documento.
                </p>
                {onDownload && (
                  <Button onClick={onDownload} className="bg-teal-500 hover:bg-teal-600 text-white">
                    <Download className="h-4 w-4 mr-2" />
                    Scarica il file
                  </Button>
                )}
              </div>
            </div>
          )}

          {isPreviewable && previewUrl ? (
            <>
              {isPdf && (
                <iframe
                  src={`${previewUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                  className="w-full h-full border-0"
                  onLoad={handleLoad}
                  onError={handleError}
                  title={fileName}
                />
              )}
              {isImage && (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <img
                    src={previewUrl}
                    alt={fileName}
                    className="max-w-full max-h-full object-contain rounded shadow-lg"
                    onLoad={handleLoad}
                    onError={handleError}
                  />
                </div>
              )}
              {isText && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0 bg-white"
                  onLoad={handleLoad}
                  onError={handleError}
                  title={fileName}
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center p-8">
                {getFileIcon()}
                <h3 className="text-lg font-semibold text-slate-700 mt-4 mb-2">
                  Anteprima non disponibile
                </h3>
                <p className="text-slate-500 mb-4">
                  Questo tipo di file ({fileExtension.toUpperCase()}) non supporta l'anteprima.
                </p>
                {onDownload && (
                  <Button onClick={onDownload} className="bg-teal-500 hover:bg-teal-600 text-white">
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
