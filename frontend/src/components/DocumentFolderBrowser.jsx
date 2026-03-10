import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  Download,
  Eye,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Landmark,
  Users,
  Building2,
  FileSignature,
  Scale,
  Briefcase,
  CheckSquare,
  Square,
  X,
  AlertTriangle
} from "lucide-react";

// Mappa icone per le categorie
const ICON_MAP = {
  "file-text": FileText,
  "landmark": Landmark,
  "users": Users,
  "building-2": Building2,
  "file-signature": FileSignature,
  "scale": Scale,
  "briefcase": Briefcase,
  "folder": Folder
};

const DocumentFolderBrowser = ({ 
  clientId, 
  token, 
  userRole = "commercialista", 
  onDocumentView,
  onDocumentDeleted 
}) => {
  const [folders, setFolders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedYear, setSelectedYear] = useState("all");
  const [availableYears, setAvailableYears] = useState([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  
  // Selezione multipla
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  
  // Dialog per cambio categoria
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [newCategory, setNewCategory] = useState("");
  const [newYear, setNewYear] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Dialog per nuova categoria
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#6b7280");
  const [creatingCategory, setCreatingCategory] = useState(false);
  
  // Dialog per conferma eliminazione
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };
  
  // Verifica se l'utente può eliminare documenti
  const canDelete = userRole === "commercialista" || userRole === "cliente";

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId, selectedYear]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/folder-categories`, { headers });
      setCategories(response.data);
    } catch (error) {
      console.error("Errore caricamento categorie:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = selectedYear !== "all" 
        ? `${API}/clients/${clientId}/documents/by-folder?year=${selectedYear}`
        : `${API}/clients/${clientId}/documents/by-folder`;
      
      const response = await axios.get(url, { headers });
      setFolders(response.data.folders);
      setTotalDocs(response.data.total_documents);
      setAvailableYears(response.data.available_years);
    } catch (error) {
      toast.error("Errore nel caricamento documenti");
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleViewDocument = async (doc) => {
    if (onDocumentView) {
      onDocumentView(doc);
    } else {
      try {
        const response = await axios.get(`${API}/documents/${doc.id}`, { headers });
        const docData = response.data;
        if (docData.file_data) {
          const byteCharacters = atob(docData.file_data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: docData.file_type || 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
        }
      } catch (error) {
        toast.error("Errore nel caricamento del documento");
      }
    }
  };

  // === GESTIONE ELIMINAZIONE ===
  
  const openDeleteDialog = (doc) => {
    setDocumentToDelete(doc);
    setShowDeleteDialog(true);
  };

  const handleDeleteSingle = async () => {
    if (!documentToDelete) return;
    setDeleting(true);
    
    try {
      await axios.delete(`${API}/documents/${documentToDelete.id}`, { headers });
      toast.success("Documento eliminato con successo");
      setShowDeleteDialog(false);
      setDocumentToDelete(null);
      fetchData();
      if (onDocumentDeleted) onDocumentDeleted();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'eliminazione");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedDocuments.size === 0) return;
    setDeleting(true);
    
    const docIds = Array.from(selectedDocuments);
    let successCount = 0;
    let errorCount = 0;
    
    for (const docId of docIds) {
      try {
        await axios.delete(`${API}/documents/${docId}`, { headers });
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }
    
    if (successCount > 0) {
      toast.success(`${successCount} documento/i eliminato/i con successo`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} documento/i non eliminato/i`);
    }
    
    setSelectedDocuments(new Set());
    setSelectionMode(false);
    setDeleting(false);
    fetchData();
    if (onDocumentDeleted) onDocumentDeleted();
  };

  // === GESTIONE SELEZIONE MULTIPLA ===
  
  const toggleDocumentSelection = (docId) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocuments(newSelected);
  };

  const selectAllInFolder = (folder) => {
    const newSelected = new Set(selectedDocuments);
    folder.documents.forEach(doc => newSelected.add(doc.id));
    setSelectedDocuments(newSelected);
  };

  const deselectAllInFolder = (folder) => {
    const newSelected = new Set(selectedDocuments);
    folder.documents.forEach(doc => newSelected.delete(doc.id));
    setSelectedDocuments(newSelected);
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedDocuments(new Set());
  };

  // === GESTIONE CATEGORIA ===
  
  const openCategoryDialog = (doc) => {
    setSelectedDocument(doc);
    setNewCategory(doc.folder_category || "documenti");
    setNewYear(doc.document_year?.toString() || "");
    setShowCategoryDialog(true);
  };

  const handleUpdateCategory = async () => {
    if (!selectedDocument) return;
    setSaving(true);
    
    const formData = new FormData();
    formData.append("folder_category", newCategory);
    if (newYear) {
      formData.append("document_year", newYear);
    }
    
    try {
      await axios.put(`${API}/documents/${selectedDocument.id}/category`, formData, { headers });
      toast.success("Documento spostato con successo");
      setShowCategoryDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nell'aggiornamento");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Inserisci un nome per la categoria");
      return;
    }
    
    setCreatingCategory(true);
    try {
      await axios.post(`${API}/folder-categories`, {
        name: newCategoryName,
        color: newCategoryColor
      }, { headers });
      toast.success("Categoria creata con successo");
      setShowNewCategoryDialog(false);
      setNewCategoryName("");
      fetchCategories();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Errore nella creazione");
    } finally {
      setCreatingCategory(false);
    }
  };

  const getIcon = (iconName) => {
    return ICON_MAP[iconName] || Folder;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-teal-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con filtri */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Folder className="h-5 w-5 text-teal-500" />
          <h3 className="font-semibold text-slate-900">
            Archivio Documenti
          </h3>
          <Badge className="bg-teal-100 text-teal-700">{totalDocs} documenti</Badge>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Modalità selezione */}
          {selectionMode ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-100 text-indigo-700">
                {selectedDocuments.size} selezionati
              </Badge>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={selectedDocuments.size === 0 || deleting}
                data-testid="delete-selected-btn"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Elimina Selezionati
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelSelection}
              >
                <X className="h-4 w-4 mr-1" />
                Annulla
              </Button>
            </div>
          ) : (
            <>
              {/* Filtro Anno */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[140px] border-slate-200">
                    <SelectValue placeholder="Tutti gli anni" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti gli anni</SelectItem>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Pulsante selezione multipla */}
              {canDelete && totalDocs > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                  className="border-slate-200"
                  data-testid="select-mode-btn"
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Seleziona
                </Button>
              )}
              
              {/* Pulsante nuova categoria (solo admin) */}
              {userRole === "commercialista" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCategoryDialog(true)}
                  className="border-teal-200 text-teal-600 hover:bg-teal-50"
                  data-testid="create-folder-category-btn"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nuova Categoria
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Griglia cartelle */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {folders.map((folder) => {
          const IconComponent = getIcon(folder.icon);
          const isExpanded = expandedFolders.has(folder.id);
          const hasDocuments = folder.document_count > 0;
          
          // Conta documenti selezionati in questa cartella
          const selectedInFolder = folder.documents.filter(d => selectedDocuments.has(d.id)).length;
          const allSelectedInFolder = selectedInFolder === folder.documents.length && folder.documents.length > 0;
          
          return (
            <Card 
              key={folder.id} 
              className={`border transition-all ${
                hasDocuments 
                  ? 'border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer' 
                  : 'border-slate-100 opacity-60'
              }`}
              data-testid={`folder-${folder.id}`}
            >
              <CardContent className="p-4">
                {/* Header cartella */}
                <div 
                  className="flex items-center gap-3 mb-3"
                  onClick={() => hasDocuments && toggleFolder(folder.id)}
                >
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${folder.color}20` }}
                  >
                    {isExpanded ? (
                      <FolderOpen className="h-5 w-5" style={{ color: folder.color }} />
                    ) : (
                      <IconComponent className="h-5 w-5" style={{ color: folder.color }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{folder.name}</p>
                    <p className="text-xs text-slate-500">
                      {folder.document_count} {folder.document_count === 1 ? 'documento' : 'documenti'}
                    </p>
                  </div>
                  {hasDocuments && (
                    <div className="text-slate-400">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  )}
                </div>
                
                {/* Anni disponibili */}
                {folder.years.length > 0 && !isExpanded && (
                  <div className="flex flex-wrap gap-1">
                    {folder.years.slice(0, 4).map(year => (
                      <Badge key={year} variant="outline" className="text-xs bg-slate-50">
                        {year}
                      </Badge>
                    ))}
                    {folder.years.length > 4 && (
                      <Badge variant="outline" className="text-xs bg-slate-50">
                        +{folder.years.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Lista documenti espansa */}
                {isExpanded && hasDocuments && (
                  <div className="mt-3 border-t pt-3 space-y-2 max-h-[300px] overflow-y-auto">
                    {/* Header selezione cartella */}
                    {selectionMode && (
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            allSelectedInFolder 
                              ? deselectAllInFolder(folder) 
                              : selectAllInFolder(folder);
                          }}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          {allSelectedInFolder ? 'Deseleziona tutti' : 'Seleziona tutti'}
                        </button>
                        {selectedInFolder > 0 && (
                          <Badge className="bg-indigo-100 text-indigo-600 text-xs">
                            {selectedInFolder} sel.
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {folder.documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors group ${
                          selectionMode && selectedDocuments.has(doc.id)
                            ? 'bg-indigo-50 border border-indigo-200'
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                        onClick={() => selectionMode && toggleDocumentSelection(doc.id)}
                      >
                        {/* Checkbox selezione */}
                        {selectionMode && (
                          <Checkbox
                            checked={selectedDocuments.has(doc.id)}
                            onCheckedChange={() => toggleDocumentSelection(doc.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        
                        <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">
                            {doc.title || doc.file_name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {doc.document_year && (
                              <span>{doc.document_year}</span>
                            )}
                            {doc.category && (
                              <Badge variant="outline" className="text-xs py-0">
                                {doc.category}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Azioni documento */}
                        {!selectionMode && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-500 hover:text-teal-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDocument(doc);
                              }}
                              data-testid={`view-doc-${doc.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-500 hover:text-amber-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCategoryDialog(doc);
                                  }}
                                  data-testid={`edit-category-${doc.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-500 hover:text-red-600"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteDialog(doc);
                                  }}
                                  data-testid={`delete-doc-${doc.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stato vuoto */}
      {totalDocs === 0 && (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="p-12 text-center">
            <Folder className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Nessun documento</h3>
            <p className="text-slate-500">
              I documenti caricati verranno organizzati automaticamente in cartelle
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialog conferma eliminazione singola */}
      <Dialog open={showDeleteDialog && documentToDelete !== null} onOpenChange={(open) => !open && setShowDeleteDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Conferma Eliminazione
            </DialogTitle>
            <DialogDescription>
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          
          {documentToDelete && (
            <div className="py-4">
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="font-medium text-slate-900">{documentToDelete.title || documentToDelete.file_name}</p>
                <p className="text-sm text-slate-500">{documentToDelete.file_name}</p>
              </div>
              <p className="text-sm text-slate-600 mt-4">
                Sei sicuro di voler eliminare questo documento? Il file verrà rimosso permanentemente.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSingle}
              disabled={deleting}
            >
              {deleting ? "Eliminazione..." : "Elimina Documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog conferma eliminazione multipla */}
      <Dialog open={showDeleteDialog && documentToDelete === null && selectedDocuments.size > 0} onOpenChange={(open) => !open && setShowDeleteDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Conferma Eliminazione Multipla
            </DialogTitle>
            <DialogDescription>
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-center">
              <p className="text-3xl font-bold text-red-600">{selectedDocuments.size}</p>
              <p className="text-sm text-slate-600">documenti selezionati</p>
            </div>
            <p className="text-sm text-slate-600 mt-4">
              Sei sicuro di voler eliminare {selectedDocuments.size} documento/i? 
              I file verranno rimossi permanentemente.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={deleting}
            >
              {deleting ? "Eliminazione..." : `Elimina ${selectedDocuments.size} Documenti`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog cambio categoria */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-amber-500" />
              Modifica Categoria Documento
            </DialogTitle>
          </DialogHeader>
          
          {selectedDocument && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-900">{selectedDocument.title || selectedDocument.file_name}</p>
              </div>
              
              <div className="space-y-2">
                <Label>Categoria Cartella</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Anno Documento</Label>
                <Input
                  type="number"
                  min="2000"
                  max="2099"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  placeholder="es. 2025"
                  className="border-slate-200"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleUpdateCategory}
              disabled={saving}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              {saving ? "Salvataggio..." : "Salva Modifiche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog nuova categoria */}
      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-teal-500" />
              Nuova Categoria Cartella
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome Categoria *</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="es. Fatture Fornitori"
                className="border-slate-200"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Colore</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-slate-200"
                />
                <Input
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="border-slate-200 flex-1"
                />
              </div>
            </div>
            
            <p className="text-xs text-slate-500">
              La nuova categoria sarà disponibile per tutti i clienti
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCategoryDialog(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={creatingCategory || !newCategoryName.trim()}
              className="bg-teal-500 hover:bg-teal-600 text-white"
            >
              {creatingCategory ? "Creazione..." : "Crea Categoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentFolderBrowser;
