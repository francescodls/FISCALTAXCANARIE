// Translations for Fiscal Tax Canarie
// Languages: IT (Italian - default), EN (English), ES (Spanish)

export const translations = {
  it: {
    // Common
    common: {
      save: "Salva",
      cancel: "Annulla",
      delete: "Elimina",
      edit: "Modifica",
      add: "Aggiungi",
      search: "Cerca",
      loading: "Caricamento...",
      error: "Errore",
      success: "Successo",
      confirm: "Conferma",
      back: "Indietro",
      next: "Avanti",
      close: "Chiudi",
      download: "Scarica",
      upload: "Carica",
      yes: "Sì",
      no: "No",
      all: "Tutti",
      none: "Nessuno",
      actions: "Azioni",
      status: "Stato",
      date: "Data",
      name: "Nome",
      email: "Email",
      password: "Password",
      phone: "Telefono",
      address: "Indirizzo",
      city: "Città",
      notes: "Note",
      description: "Descrizione",
      amount: "Importo",
      total: "Totale",
      details: "Dettagli",
      logout: "Esci",
    },
    
    // Auth
    auth: {
      login: "Accedi",
      register: "Registrati",
      loginTitle: "Accesso",
      loginSubtitle: "Accedi al tuo account",
      registerTitle: "Registrazione",
      forgotPassword: "Password dimenticata?",
      noAccount: "Non hai un account?",
      hasAccount: "Hai già un account?",
      emailPlaceholder: "La tua email",
      passwordPlaceholder: "La tua password",
      confirmPassword: "Conferma Password",
      fullName: "Nome Completo",
      loginSuccess: "Accesso effettuato con successo!",
      loginError: "Errore durante il login",
      registerSuccess: "Registrazione completata!",
      completeRegistration: "Completa Registrazione",
      chooseEmail: "Scegli la tua email di accesso",
      setPassword: "Imposta una password sicura",
    },
    
    // Dashboard
    dashboard: {
      title: "Dashboard",
      welcome: "Benvenuto",
      adminPanel: "Pannello Amministratore",
      clientPanel: "Area Cliente",
      consulentPanel: "Dashboard Consulente",
      totalClients: "Clienti Totali",
      activeClients: "Clienti Attivi",
      documents: "Documenti",
      deadlinesDue: "Scadenze Da Fare",
      deadlinesOverdue: "Scadute",
      toVerify: "Da Verificare",
      recentActivity: "Attività Recente",
      quickActions: "Azioni Rapide",
      stats: "Statistiche",
    },
    
    // Clients
    clients: {
      title: "I Tuoi Clienti",
      myClients: "I Miei Clienti",
      inviteClient: "Invita Cliente",
      newClient: "Nuovo Cliente",
      clientDetails: "Dettagli Cliente",
      searchClients: "Cerca cliente...",
      pendingInvites: "Inviti in attesa di registrazione",
      resendInvite: "Reinvia",
      inviteSent: "Invito inviato",
      clientType: "Tipo Cliente",
      autonomous: "Autonomo",
      company: "Società",
      private: "Privato",
      allTypes: "Tutti i tipi",
      filterByType: "Filtra per tipo",
      inviteTitle: "Invita Nuovo Cliente",
      inviteSubtitle: "Inserisci l'email del cliente. Riceverà un invito per completare la registrazione.",
      inviteEmail: "Email *",
      inviteName: "Nome (opzionale)",
      sendInvite: "Invia Invito",
      noClients: "Nessun cliente",
      noClientsDesc: "Non hai ancora clienti registrati.",
    },
    
    // Documents
    documents: {
      title: "Documenti",
      myDocuments: "I Miei Documenti",
      uploadDocument: "Carica Documento",
      uploadWithAI: "Carica con AI",
      documentType: "Tipo Documento",
      uploadDate: "Data Caricamento",
      downloadDocument: "Scarica Documento",
      deleteDocument: "Elimina Documento",
      noDocuments: "Nessun documento",
      noDocumentsDesc: "Non ci sono documenti caricati.",
      pendingVerification: "In attesa di verifica",
      verified: "Verificato",
      aiAnalysis: "Analisi AI",
      autoClassified: "Classificato automaticamente",
    },
    
    // Payslips
    payslips: {
      title: "Buste Paga",
      uploadPayslip: "Carica Busta Paga",
      month: "Mese",
      year: "Anno",
      noPayslips: "Nessuna busta paga",
      noPayslipsDesc: "Non ci sono buste paga caricate.",
    },
    
    // Deadlines
    deadlines: {
      title: "Scadenze",
      myDeadlines: "Le Mie Scadenze",
      newDeadline: "Nuova Scadenza",
      dueDate: "Data Scadenza",
      priority: "Priorità",
      high: "Alta",
      medium: "Media",
      low: "Bassa",
      completed: "Completata",
      pending: "Da fare",
      overdue: "Scaduta",
      noDeadlines: "Nessuna scadenza",
      recurring: "Ricorrente",
      reminder: "Promemoria",
    },
    
    // Fees
    fees: {
      title: "Onorari",
      newFee: "Nuovo Onorario",
      paid: "Pagato",
      unpaid: "Non pagato",
      dueDate: "Scadenza",
      markAsPaid: "Segna come pagato",
    },
    
    // Profile/Settings
    profile: {
      title: "Profilo",
      personalInfo: "Dati Personali",
      registry: "Anagrafica",
      taxInfo: "Dati Fiscali",
      bankInfo: "Dati Bancari",
      classification: "Classificazione",
      additionalEmails: "Email Aggiuntive",
      bankCredentials: "Chiavi Consultive Bancarie",
      noBankCredentials: "Nessuna credenziale bancaria registrata",
      addBankCredential: "Aggiungi Credenziale",
      selectBank: "Seleziona banca",
      createNewBank: "Oppure crea una nuova banca:",
      username: "Nome Utente",
      iban: "IBAN",
      taxCode: "Codice Fiscale",
      nie: "NIE",
      nif: "NIF",
      cif: "CIF",
      province: "Provincia",
      postalCode: "CAP",
      taxRegime: "Regime Fiscale",
      businessType: "Tipo Attività",
      active: "Attivo",
      suspended: "Sospeso",
      ceased: "Cessato",
    },
    
    // Consulenti
    consulenti: {
      title: "Consulenti del Lavoro",
      subtitle: "Gestisci i consulenti e assegna loro i clienti",
      newConsulente: "Nuovo Consulente",
      createConsulente: "Crea Consulente del Lavoro",
      assignedClients: "clienti assegnati",
      assignClients: "Assegna Clienti",
      noConsulenti: "Nessun consulente",
      noConsulentiDesc: "Crea un consulente del lavoro per delegare la gestione delle buste paga.",
      createFirst: "Crea il primo consulente",
      noClientsAssigned: "Nessun cliente assegnato",
      noClientsAssignedDesc: "L'amministratore non ti ha ancora assegnato clienti da gestire.",
      selected: "selezionati",
      saveAssignments: "Salva Assegnazioni",
    },
    
    // Chatbot
    chatbot: {
      title: "Assistente AI",
      placeholder: "Scrivi un messaggio...",
      welcome: "Ciao! Sono il tuo assistente fiscale. Come posso aiutarti?",
    },
    
    // Backup
    backup: {
      title: "Backup e Storage",
      downloadBackup: "Scarica Backup Completo",
      storageStatus: "Stato Storage",
      migrateFiles: "Migra File",
    },
    
    // Signatures
    signatures: {
      title: "Firma Digitale",
      uploadCertificate: "Carica Certificato",
      signDocument: "Firma Documento",
    },
    
    // Months
    months: {
      january: "Gennaio",
      february: "Febbraio",
      march: "Marzo",
      april: "Aprile",
      may: "Maggio",
      june: "Giugno",
      july: "Luglio",
      august: "Agosto",
      september: "Settembre",
      october: "Ottobre",
      november: "Novembre",
      december: "Dicembre",
    },
    
    // Messages
    messages: {
      saveSuccess: "Salvato con successo",
      saveError: "Errore nel salvataggio",
      deleteSuccess: "Eliminato con successo",
      deleteError: "Errore nell'eliminazione",
      uploadSuccess: "Caricato con successo",
      uploadError: "Errore nel caricamento",
      inviteSentSuccess: "Invito inviato con successo",
      confirmDelete: "Sei sicuro di voler eliminare?",
      loadingError: "Errore nel caricamento dei dati",
      noResults: "Nessun risultato",
    },
  },
  
  en: {
    // Common
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      search: "Search",
      loading: "Loading...",
      error: "Error",
      success: "Success",
      confirm: "Confirm",
      back: "Back",
      next: "Next",
      close: "Close",
      download: "Download",
      upload: "Upload",
      yes: "Yes",
      no: "No",
      all: "All",
      none: "None",
      actions: "Actions",
      status: "Status",
      date: "Date",
      name: "Name",
      email: "Email",
      password: "Password",
      phone: "Phone",
      address: "Address",
      city: "City",
      notes: "Notes",
      description: "Description",
      amount: "Amount",
      total: "Total",
      details: "Details",
      logout: "Logout",
    },
    
    // Auth
    auth: {
      login: "Login",
      register: "Register",
      loginTitle: "Login",
      loginSubtitle: "Access your account",
      registerTitle: "Registration",
      forgotPassword: "Forgot password?",
      noAccount: "Don't have an account?",
      hasAccount: "Already have an account?",
      emailPlaceholder: "Your email",
      passwordPlaceholder: "Your password",
      confirmPassword: "Confirm Password",
      fullName: "Full Name",
      loginSuccess: "Login successful!",
      loginError: "Login error",
      registerSuccess: "Registration completed!",
      completeRegistration: "Complete Registration",
      chooseEmail: "Choose your login email",
      setPassword: "Set a secure password",
    },
    
    // Dashboard
    dashboard: {
      title: "Dashboard",
      welcome: "Welcome",
      adminPanel: "Admin Panel",
      clientPanel: "Client Area",
      consulentPanel: "Consultant Dashboard",
      totalClients: "Total Clients",
      activeClients: "Active Clients",
      documents: "Documents",
      deadlinesDue: "Deadlines Due",
      deadlinesOverdue: "Overdue",
      toVerify: "To Verify",
      recentActivity: "Recent Activity",
      quickActions: "Quick Actions",
      stats: "Statistics",
    },
    
    // Clients
    clients: {
      title: "Your Clients",
      myClients: "My Clients",
      inviteClient: "Invite Client",
      newClient: "New Client",
      clientDetails: "Client Details",
      searchClients: "Search client...",
      pendingInvites: "Pending invitations",
      resendInvite: "Resend",
      inviteSent: "Invite sent",
      clientType: "Client Type",
      autonomous: "Self-employed",
      company: "Company",
      private: "Private",
      allTypes: "All types",
      filterByType: "Filter by type",
      inviteTitle: "Invite New Client",
      inviteSubtitle: "Enter the client's email. They will receive an invitation to complete registration.",
      inviteEmail: "Email *",
      inviteName: "Name (optional)",
      sendInvite: "Send Invite",
      noClients: "No clients",
      noClientsDesc: "You don't have any registered clients yet.",
    },
    
    // Documents
    documents: {
      title: "Documents",
      myDocuments: "My Documents",
      uploadDocument: "Upload Document",
      uploadWithAI: "Upload with AI",
      documentType: "Document Type",
      uploadDate: "Upload Date",
      downloadDocument: "Download Document",
      deleteDocument: "Delete Document",
      noDocuments: "No documents",
      noDocumentsDesc: "There are no uploaded documents.",
      pendingVerification: "Pending verification",
      verified: "Verified",
      aiAnalysis: "AI Analysis",
      autoClassified: "Auto-classified",
    },
    
    // Payslips
    payslips: {
      title: "Payslips",
      uploadPayslip: "Upload Payslip",
      month: "Month",
      year: "Year",
      noPayslips: "No payslips",
      noPayslipsDesc: "There are no uploaded payslips.",
    },
    
    // Deadlines
    deadlines: {
      title: "Deadlines",
      myDeadlines: "My Deadlines",
      newDeadline: "New Deadline",
      dueDate: "Due Date",
      priority: "Priority",
      high: "High",
      medium: "Medium",
      low: "Low",
      completed: "Completed",
      pending: "Pending",
      overdue: "Overdue",
      noDeadlines: "No deadlines",
      recurring: "Recurring",
      reminder: "Reminder",
    },
    
    // Fees
    fees: {
      title: "Fees",
      newFee: "New Fee",
      paid: "Paid",
      unpaid: "Unpaid",
      dueDate: "Due Date",
      markAsPaid: "Mark as paid",
    },
    
    // Profile/Settings
    profile: {
      title: "Profile",
      personalInfo: "Personal Information",
      registry: "Registry",
      taxInfo: "Tax Information",
      bankInfo: "Bank Information",
      classification: "Classification",
      additionalEmails: "Additional Emails",
      bankCredentials: "Bank Access Keys",
      noBankCredentials: "No bank credentials registered",
      addBankCredential: "Add Credential",
      selectBank: "Select bank",
      createNewBank: "Or create a new bank:",
      username: "Username",
      iban: "IBAN",
      taxCode: "Tax Code",
      nie: "NIE",
      nif: "NIF",
      cif: "CIF",
      province: "Province",
      postalCode: "Postal Code",
      taxRegime: "Tax Regime",
      businessType: "Business Type",
      active: "Active",
      suspended: "Suspended",
      ceased: "Ceased",
    },
    
    // Consulenti
    consulenti: {
      title: "Labor Consultants",
      subtitle: "Manage consultants and assign clients to them",
      newConsulente: "New Consultant",
      createConsulente: "Create Labor Consultant",
      assignedClients: "assigned clients",
      assignClients: "Assign Clients",
      noConsulenti: "No consultants",
      noConsulentiDesc: "Create a labor consultant to delegate payslip management.",
      createFirst: "Create first consultant",
      noClientsAssigned: "No clients assigned",
      noClientsAssignedDesc: "The administrator has not assigned you any clients yet.",
      selected: "selected",
      saveAssignments: "Save Assignments",
    },
    
    // Chatbot
    chatbot: {
      title: "AI Assistant",
      placeholder: "Write a message...",
      welcome: "Hello! I'm your tax assistant. How can I help you?",
    },
    
    // Backup
    backup: {
      title: "Backup and Storage",
      downloadBackup: "Download Full Backup",
      storageStatus: "Storage Status",
      migrateFiles: "Migrate Files",
    },
    
    // Signatures
    signatures: {
      title: "Digital Signature",
      uploadCertificate: "Upload Certificate",
      signDocument: "Sign Document",
    },
    
    // Months
    months: {
      january: "January",
      february: "February",
      march: "March",
      april: "April",
      may: "May",
      june: "June",
      july: "July",
      august: "August",
      september: "September",
      october: "October",
      november: "November",
      december: "December",
    },
    
    // Messages
    messages: {
      saveSuccess: "Saved successfully",
      saveError: "Save error",
      deleteSuccess: "Deleted successfully",
      deleteError: "Delete error",
      uploadSuccess: "Uploaded successfully",
      uploadError: "Upload error",
      inviteSentSuccess: "Invite sent successfully",
      confirmDelete: "Are you sure you want to delete?",
      loadingError: "Error loading data",
      noResults: "No results",
    },
  },
  
  es: {
    // Common
    common: {
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      add: "Añadir",
      search: "Buscar",
      loading: "Cargando...",
      error: "Error",
      success: "Éxito",
      confirm: "Confirmar",
      back: "Atrás",
      next: "Siguiente",
      close: "Cerrar",
      download: "Descargar",
      upload: "Subir",
      yes: "Sí",
      no: "No",
      all: "Todos",
      none: "Ninguno",
      actions: "Acciones",
      status: "Estado",
      date: "Fecha",
      name: "Nombre",
      email: "Email",
      password: "Contraseña",
      phone: "Teléfono",
      address: "Dirección",
      city: "Ciudad",
      notes: "Notas",
      description: "Descripción",
      amount: "Importe",
      total: "Total",
      details: "Detalles",
      logout: "Salir",
    },
    
    // Auth
    auth: {
      login: "Acceder",
      register: "Registrarse",
      loginTitle: "Acceso",
      loginSubtitle: "Accede a tu cuenta",
      registerTitle: "Registro",
      forgotPassword: "¿Olvidaste tu contraseña?",
      noAccount: "¿No tienes cuenta?",
      hasAccount: "¿Ya tienes cuenta?",
      emailPlaceholder: "Tu email",
      passwordPlaceholder: "Tu contraseña",
      confirmPassword: "Confirmar Contraseña",
      fullName: "Nombre Completo",
      loginSuccess: "¡Acceso exitoso!",
      loginError: "Error de acceso",
      registerSuccess: "¡Registro completado!",
      completeRegistration: "Completar Registro",
      chooseEmail: "Elige tu email de acceso",
      setPassword: "Establece una contraseña segura",
    },
    
    // Dashboard
    dashboard: {
      title: "Panel de Control",
      welcome: "Bienvenido",
      adminPanel: "Panel de Administrador",
      clientPanel: "Área de Cliente",
      consulentPanel: "Panel del Consultor",
      totalClients: "Clientes Totales",
      activeClients: "Clientes Activos",
      documents: "Documentos",
      deadlinesDue: "Vencimientos Pendientes",
      deadlinesOverdue: "Vencidos",
      toVerify: "Por Verificar",
      recentActivity: "Actividad Reciente",
      quickActions: "Acciones Rápidas",
      stats: "Estadísticas",
    },
    
    // Clients
    clients: {
      title: "Tus Clientes",
      myClients: "Mis Clientes",
      inviteClient: "Invitar Cliente",
      newClient: "Nuevo Cliente",
      clientDetails: "Detalles del Cliente",
      searchClients: "Buscar cliente...",
      pendingInvites: "Invitaciones pendientes de registro",
      resendInvite: "Reenviar",
      inviteSent: "Invitación enviada",
      clientType: "Tipo de Cliente",
      autonomous: "Autónomo",
      company: "Sociedad",
      private: "Particular",
      allTypes: "Todos los tipos",
      filterByType: "Filtrar por tipo",
      inviteTitle: "Invitar Nuevo Cliente",
      inviteSubtitle: "Introduce el email del cliente. Recibirá una invitación para completar el registro.",
      inviteEmail: "Email *",
      inviteName: "Nombre (opcional)",
      sendInvite: "Enviar Invitación",
      noClients: "Sin clientes",
      noClientsDesc: "Aún no tienes clientes registrados.",
    },
    
    // Documents
    documents: {
      title: "Documentos",
      myDocuments: "Mis Documentos",
      uploadDocument: "Subir Documento",
      uploadWithAI: "Subir con IA",
      documentType: "Tipo de Documento",
      uploadDate: "Fecha de Subida",
      downloadDocument: "Descargar Documento",
      deleteDocument: "Eliminar Documento",
      noDocuments: "Sin documentos",
      noDocumentsDesc: "No hay documentos subidos.",
      pendingVerification: "Pendiente de verificación",
      verified: "Verificado",
      aiAnalysis: "Análisis IA",
      autoClassified: "Clasificado automáticamente",
    },
    
    // Payslips
    payslips: {
      title: "Nóminas",
      uploadPayslip: "Subir Nómina",
      month: "Mes",
      year: "Año",
      noPayslips: "Sin nóminas",
      noPayslipsDesc: "No hay nóminas subidas.",
    },
    
    // Deadlines
    deadlines: {
      title: "Vencimientos",
      myDeadlines: "Mis Vencimientos",
      newDeadline: "Nuevo Vencimiento",
      dueDate: "Fecha de Vencimiento",
      priority: "Prioridad",
      high: "Alta",
      medium: "Media",
      low: "Baja",
      completed: "Completado",
      pending: "Pendiente",
      overdue: "Vencido",
      noDeadlines: "Sin vencimientos",
      recurring: "Recurrente",
      reminder: "Recordatorio",
    },
    
    // Fees
    fees: {
      title: "Honorarios",
      newFee: "Nuevo Honorario",
      paid: "Pagado",
      unpaid: "No pagado",
      dueDate: "Vencimiento",
      markAsPaid: "Marcar como pagado",
    },
    
    // Profile/Settings
    profile: {
      title: "Perfil",
      personalInfo: "Datos Personales",
      registry: "Registro",
      taxInfo: "Datos Fiscales",
      bankInfo: "Datos Bancarios",
      classification: "Clasificación",
      additionalEmails: "Emails Adicionales",
      bankCredentials: "Claves de Acceso Bancario",
      noBankCredentials: "No hay credenciales bancarias registradas",
      addBankCredential: "Añadir Credencial",
      selectBank: "Seleccionar banco",
      createNewBank: "O crea un nuevo banco:",
      username: "Usuario",
      iban: "IBAN",
      taxCode: "Código Fiscal",
      nie: "NIE",
      nif: "NIF",
      cif: "CIF",
      province: "Provincia",
      postalCode: "Código Postal",
      taxRegime: "Régimen Fiscal",
      businessType: "Tipo de Actividad",
      active: "Activo",
      suspended: "Suspendido",
      ceased: "Cesado",
    },
    
    // Consulenti
    consulenti: {
      title: "Consultores Laborales",
      subtitle: "Gestiona los consultores y asígnales clientes",
      newConsulente: "Nuevo Consultor",
      createConsulente: "Crear Consultor Laboral",
      assignedClients: "clientes asignados",
      assignClients: "Asignar Clientes",
      noConsulenti: "Sin consultores",
      noConsulentiDesc: "Crea un consultor laboral para delegar la gestión de nóminas.",
      createFirst: "Crear primer consultor",
      noClientsAssigned: "Sin clientes asignados",
      noClientsAssignedDesc: "El administrador aún no te ha asignado clientes.",
      selected: "seleccionados",
      saveAssignments: "Guardar Asignaciones",
    },
    
    // Chatbot
    chatbot: {
      title: "Asistente IA",
      placeholder: "Escribe un mensaje...",
      welcome: "¡Hola! Soy tu asistente fiscal. ¿Cómo puedo ayudarte?",
    },
    
    // Backup
    backup: {
      title: "Copia de Seguridad y Almacenamiento",
      downloadBackup: "Descargar Copia Completa",
      storageStatus: "Estado del Almacenamiento",
      migrateFiles: "Migrar Archivos",
    },
    
    // Signatures
    signatures: {
      title: "Firma Digital",
      uploadCertificate: "Subir Certificado",
      signDocument: "Firmar Documento",
    },
    
    // Months
    months: {
      january: "Enero",
      february: "Febrero",
      march: "Marzo",
      april: "Abril",
      may: "Mayo",
      june: "Junio",
      july: "Julio",
      august: "Agosto",
      september: "Septiembre",
      october: "Octubre",
      november: "Noviembre",
      december: "Diciembre",
    },
    
    // Messages
    messages: {
      saveSuccess: "Guardado con éxito",
      saveError: "Error al guardar",
      deleteSuccess: "Eliminado con éxito",
      deleteError: "Error al eliminar",
      uploadSuccess: "Subido con éxito",
      uploadError: "Error al subir",
      inviteSentSuccess: "Invitación enviada con éxito",
      confirmDelete: "¿Estás seguro de que quieres eliminar?",
      loadingError: "Error al cargar los datos",
      noResults: "Sin resultados",
    },
  },
};

export const languageOptions = [
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
];

export const getTranslation = (lang, path) => {
  const keys = path.split(".");
  let result = translations[lang] || translations.it;
  
  for (const key of keys) {
    if (result && result[key]) {
      result = result[key];
    } else {
      // Fallback to Italian
      result = translations.it;
      for (const k of keys) {
        if (result && result[k]) {
          result = result[k];
        } else {
          return path; // Return the path if translation not found
        }
      }
      break;
    }
  }
  
  return result;
};
