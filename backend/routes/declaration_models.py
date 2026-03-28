"""
Modelli Pydantic per il sistema Dichiarazioni
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr
from datetime import date


# ==================== DECLARATION TYPES ====================

class DeclarationTypeCreate(BaseModel):
    """Tipo di dichiarazione (configurabile dall'admin)"""
    code: str  # es: "redditi", "720", "societa", "patrimoniale"
    name: str  # es: "Dichiarazione dei Redditi"
    description: Optional[str] = None
    icon: Optional[str] = "file-text"
    color: Optional[str] = "#0d9488"
    is_active: bool = True
    order: int = 0


class DeclarationTypeResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    icon: str
    color: str
    is_active: bool
    order: int
    created_at: str


# ==================== TAX RETURN (DICHIARAZIONE REDDITI) ====================

class TaxReturnPersonalData(BaseModel):
    """Sezione 1: Dati personali"""
    nombre: str
    apellidos: str
    dni_nie: str
    fecha_nacimiento: str  # YYYY-MM-DD
    direccion: str
    municipio: str
    provincia: str
    codigo_postal: str
    pais: str = "España"
    telefono: str
    email: EmailStr
    estado_civil: str  # soltero, casado, divorciado, viudo, pareja_hecho
    residente_canarias: bool = True


class TaxReturnFamilyMember(BaseModel):
    """Membro familiare (figlio, ascendente, coniuge)"""
    tipo: str  # coniuge, hijo, ascendente
    nombre: str
    apellidos: str
    dni_nie: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    discapacidad: bool = False
    grado_discapacidad: Optional[int] = None  # percentuale
    convivencia: bool = True


class TaxReturnFamilyData(BaseModel):
    """Sezione 2: Situazione familiare"""
    tiene_conyuge: bool = False
    conyuge: Optional[TaxReturnFamilyMember] = None
    hijos: List[TaxReturnFamilyMember] = []
    ascendientes: List[TaxReturnFamilyMember] = []
    discapacidad_contribuyente: bool = False
    grado_discapacidad_contribuyente: Optional[int] = None
    familia_numerosa: bool = False
    categoria_familia_numerosa: Optional[str] = None  # general, especial
    familia_monoparental: bool = False
    variaciones_familiares: Optional[str] = None


class TaxReturnEmployer(BaseModel):
    """Datore di lavoro / Pagatore"""
    nombre_empresa: str
    cif_nif: Optional[str] = None
    tipo: str  # empresa, autonomo, pension, desempleo, extranjero
    importe_bruto: float
    retenciones: float
    notas: Optional[str] = None


class TaxReturnEmploymentIncome(BaseModel):
    """Sezione 3: Redditi da lavoro"""
    tiene_rentas_trabajo: bool = False
    numero_pagadores: int = 0
    pagadores: List[TaxReturnEmployer] = []
    bonus_premios: float = 0
    tiene_desempleo: bool = False
    importe_desempleo: float = 0
    tiene_pension: bool = False
    importe_pension: float = 0
    tiene_rentas_extranjero: bool = False
    importe_rentas_extranjero: float = 0
    notas: Optional[str] = None


class TaxReturnSelfEmployment(BaseModel):
    """Sezione 4: Autónomo / Attività economica"""
    es_autonomo: bool = False
    actividad: Optional[str] = None
    epígrafe_iae: Optional[str] = None
    regimen_fiscal: Optional[str] = None  # estimacion_directa, estimacion_objetiva
    ingresos_anuales: float = 0
    gastos_deducibles: float = 0
    cuota_autonomos: float = 0
    modelos_presentados: List[str] = []  # 130, 303, etc.
    notas: Optional[str] = None


class TaxReturnProperty(BaseModel):
    """Singolo immobile"""
    id: Optional[str] = None
    direccion: str
    referencia_catastral: str
    porcentaje_propiedad: float = 100
    uso: str  # vivienda_habitual, alquilado, vacio, segunda_residencia
    es_vivienda_habitual: bool = False
    esta_alquilado: bool = False
    vendido_en_ano: bool = False
    fecha_adquisicion: Optional[str] = None
    valor_adquisicion: Optional[float] = None
    notas: Optional[str] = None


class TaxReturnProperties(BaseModel):
    """Sezione 5: Immobili"""
    tiene_inmuebles: bool = False
    inmuebles: List[TaxReturnProperty] = []


class TaxReturnRentalIncome(BaseModel):
    """Singolo canone di locazione"""
    id: Optional[str] = None
    inmueble_id: Optional[str] = None
    direccion_inmueble: str
    canon_anual: float
    meses_alquilado: int = 12
    gastos_ibi: float = 0
    gastos_comunidad: float = 0
    gastos_seguro: float = 0
    gastos_mantenimiento: float = 0
    tiene_morosidad: bool = False
    importe_morosidad: float = 0
    notas: Optional[str] = None


class TaxReturnRentals(BaseModel):
    """Sezione 6: Canoni di locazione"""
    tiene_alquileres: bool = False
    alquileres: List[TaxReturnRentalIncome] = []


class TaxReturnRentPaid(BaseModel):
    """Sezione 7: Affitto abitazione abituale (come inquilino)"""
    paga_alquiler: bool = False
    importe_anual: float = 0
    nombre_arrendador: Optional[str] = None
    nif_arrendador: Optional[str] = None
    referencia_catastral: Optional[str] = None
    fecha_inicio_contrato: Optional[str] = None
    notas: Optional[str] = None


class TaxReturnInvestment(BaseModel):
    """Singolo investimento"""
    id: Optional[str] = None
    tipo: str  # cuenta_bancaria, deposito, fondo, etf, acciones, dividendos
    entidad: str
    descripcion: Optional[str] = None
    importe_intereses: float = 0
    importe_dividendos: float = 0
    es_extranjero: bool = False
    pais: Optional[str] = None
    notas: Optional[str] = None


class TaxReturnInvestments(BaseModel):
    """Sezione 8: Investimenti e capitale mobiliare"""
    tiene_inversiones: bool = False
    inversiones: List[TaxReturnInvestment] = []


class TaxReturnCryptoTransaction(BaseModel):
    """Singola operazione crypto"""
    id: Optional[str] = None
    exchange: str
    tipo_operacion: str  # compra, venta, permuta, staking, reward
    moneda: str  # BTC, ETH, etc.
    fecha: str
    cantidad: float
    valor_adquisicion: float
    valor_venta: Optional[float] = None
    comisiones: float = 0
    notas: Optional[str] = None


class TaxReturnCrypto(BaseModel):
    """Sezione 9: Criptomonete"""
    tiene_criptomonedas: bool = False
    exchanges: List[str] = []
    wallets: List[str] = []
    operaciones: List[TaxReturnCryptoTransaction] = []
    tiene_staking: bool = False
    importe_staking: float = 0
    notas: Optional[str] = None


class TaxReturnCapitalGain(BaseModel):
    """Singola plusvalenza/minusvalenza"""
    id: Optional[str] = None
    tipo: str  # inmueble, acciones, fondos, indemnizacion, ayuda_publica
    descripcion: str
    fecha_adquisicion: Optional[str] = None
    fecha_venta: Optional[str] = None
    valor_adquisicion: float
    valor_venta: float
    costes_asociados: float = 0
    notas: Optional[str] = None


class TaxReturnCapitalGains(BaseModel):
    """Sezione 10: Plusvalenze / Minusvalenze"""
    tiene_ganancias_patrimoniales: bool = False
    operaciones: List[TaxReturnCapitalGain] = []


class TaxReturnDeductions(BaseModel):
    """Sezione 11: Spese deducibili"""
    tiene_deducciones: bool = False
    donaciones: float = 0
    gastos_medicos: float = 0
    guarderia: float = 0
    educacion: float = 0
    familia_numerosa: float = 0
    discapacidad: float = 0
    aportaciones_planes_pensiones: float = 0
    otras_deducciones: float = 0
    descripcion_otras: Optional[str] = None
    notas: Optional[str] = None


class TaxReturnCanaryDeductions(BaseModel):
    """Sezione 12: Deducciones Canarias"""
    tiene_deducciones_canarias: bool = False
    alquiler_vivienda_habitual: float = 0
    gastos_estudios: float = 0
    gastos_guarderia: float = 0
    familia_numerosa: float = 0
    familia_monoparental: float = 0
    discapacidad_mayores_65: float = 0
    donaciones: float = 0
    gastos_enfermedad: float = 0
    adecuacion_vivienda_alquiler: float = 0
    seguro_impago_alquiler: float = 0
    otras_deducciones: float = 0
    descripcion_otras: Optional[str] = None
    notas: Optional[str] = None


class TaxReturnDocument(BaseModel):
    """Documento allegato"""
    id: str
    categoria: str  # certificado_fiscal, nomina, bancario, contrato, factura, crypto, catastral, discapacidad, familiar, otro
    nombre: str
    file_name: str
    file_path: Optional[str] = None
    seccion: Optional[str] = None  # A quale sezione appartiene
    uploaded_at: str


class TaxReturnClientNote(BaseModel):
    """Nota del cliente"""
    id: str
    texto: str
    seccion: Optional[str] = None
    created_at: str


class TaxReturnAdminNote(BaseModel):
    """Nota interna dell'admin"""
    id: str
    texto: str
    seccion: Optional[str] = None
    created_by: str
    created_at: str


class TaxReturnIntegrationRequest(BaseModel):
    """Richiesta di integrazione documentale"""
    id: str
    seccion: str
    mensaje: str
    documentos_richiesti: List[str] = []
    created_by: str
    created_at: str
    risposta_cliente: Optional[str] = None
    risposta_at: Optional[str] = None
    stato: str = "pendente"  # pendente, risposta, chiusa


class TaxReturnAuthorization(BaseModel):
    """Autorizzazione firmata"""
    consent_accepted: bool = False
    authorization_text: str
    signed_at: Optional[str] = None
    signature_data: Optional[str] = None  # Base64 immagine firma
    pdf_path: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


# ==================== TAX RETURN REQUEST (PRATICA) ====================

class TaxReturnSectionsEnabled(BaseModel):
    """Sezioni abilitate dal cliente"""
    datos_personales: bool = True
    situacion_familiar: bool = False
    rentas_trabajo: bool = False
    autonomo: bool = False
    inmuebles: bool = False
    alquileres_cobrados: bool = False
    alquiler_pagado: bool = False
    inversiones: bool = False
    criptomonedas: bool = False
    ganancias_patrimoniales: bool = False
    deducciones: bool = False
    deducciones_canarias: bool = False


class TaxReturnCreate(BaseModel):
    """Creazione nuova pratica dichiarazione redditi"""
    anno_fiscale: int = 2025
    tipo_dichiarazione: str = "individual"  # individual, conjunta
    secciones_habilitadas: Optional[TaxReturnSectionsEnabled] = None


class TaxReturnStatusLog(BaseModel):
    """Log cambio stato"""
    stato_precedente: Optional[str] = None
    stato_nuovo: str
    changed_by: str
    changed_at: str
    motivo: Optional[str] = None


class TaxReturnResponse(BaseModel):
    """Risposta pratica completa"""
    id: str
    client_id: str
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    anno_fiscale: int
    tipo_dichiarazione: str
    stato: str  # bozza, inviata, documentazione_incompleta, in_revisione, pronta, presentata, archiviata
    secciones_habilitadas: TaxReturnSectionsEnabled
    
    # Sezioni dati
    datos_personales: Optional[TaxReturnPersonalData] = None
    situacion_familiar: Optional[TaxReturnFamilyData] = None
    rentas_trabajo: Optional[TaxReturnEmploymentIncome] = None
    autonomo: Optional[TaxReturnSelfEmployment] = None
    inmuebles: Optional[TaxReturnProperties] = None
    alquileres_cobrados: Optional[TaxReturnRentals] = None
    alquiler_pagado: Optional[TaxReturnRentPaid] = None
    inversiones: Optional[TaxReturnInvestments] = None
    criptomonedas: Optional[TaxReturnCrypto] = None
    ganancias_patrimoniales: Optional[TaxReturnCapitalGains] = None
    deducciones: Optional[TaxReturnDeductions] = None
    deducciones_canarias: Optional[TaxReturnCanaryDeductions] = None
    
    # Documenti e note
    documentos: List[TaxReturnDocument] = []
    notas_cliente: List[TaxReturnClientNote] = []
    notas_admin: List[TaxReturnAdminNote] = []
    richieste_integrazione: List[TaxReturnIntegrationRequest] = []
    
    # Conversazione interna (messaggi tra admin e cliente)
    conversazione: List[Dict[str, Any]] = []
    
    # Autorizzazione
    autorizacion: Optional[TaxReturnAuthorization] = None
    
    # Metadata
    status_logs: List[TaxReturnStatusLog] = []
    created_at: str
    updated_at: str
    submitted_at: Optional[str] = None


class TaxReturnListItem(BaseModel):
    """Elemento lista pratiche (vista admin)"""
    id: str
    client_id: str
    client_name: str
    client_email: Optional[str] = None
    anno_fiscale: int
    tipo_dichiarazione: str
    stato: str
    
    # Indicatori sezioni compilate
    has_rentas_trabajo: bool = False
    has_autonomo: bool = False
    has_inmuebles: bool = False
    has_alquileres: bool = False
    has_inversiones: bool = False
    has_criptomonedas: bool = False
    has_ganancias: bool = False
    has_deducciones_canarias: bool = False
    
    # Conteggi
    documentos_count: int = 0
    richieste_pendenti: int = 0
    
    # Autorizzazione
    has_authorization: bool = False
    
    created_at: str
    updated_at: str


class TaxReturnSectionUpdate(BaseModel):
    """Aggiornamento singola sezione"""
    section_name: str
    data: Dict[str, Any]


class IntegrationRequestCreate(BaseModel):
    """Creazione richiesta integrazione"""
    seccion: str
    mensaje: str
    documentos_richiesti: List[str] = []


class IntegrationRequestResponse(BaseModel):
    """Risposta cliente a richiesta integrazione"""
    risposta: str


# ==================== CONVERSAZIONE DICHIARAZIONE ====================

class DeclarationMessageCreate(BaseModel):
    """Creazione messaggio nella conversazione"""
    content: str


class DeclarationMessage(BaseModel):
    """Messaggio nella conversazione di una dichiarazione"""
    id: str
    content: str
    sender_id: str
    sender_name: str
    sender_role: str  # "cliente" o "commercialista"
    created_at: str
    read_by_admin: bool = False
    read_by_client: bool = False


# ==================== VISTA CLIENTI CON DICHIARAZIONI ====================

class ClientDeclarationSummary(BaseModel):
    """Riepilogo dichiarazioni per singolo cliente"""
    client_id: str
    client_name: str
    client_email: Optional[str] = None
    tipo_cliente: Optional[str] = None
    
    # Conteggi dichiarazioni
    total_declarations: int = 0
    declarations_bozza: int = 0
    declarations_inviate: int = 0
    declarations_in_revisione: int = 0
    declarations_presentate: int = 0
    declarations_doc_incompleta: int = 0
    
    # Richieste pendenti totali
    total_richieste_pendenti: int = 0
    
    # Messaggi non letti
    unread_messages: int = 0
    
    # Ultima attività
    last_activity: Optional[str] = None


class ClientDeclarationsListResponse(BaseModel):
    """Lista clienti con riepilogo dichiarazioni"""
    clients: List[ClientDeclarationSummary]
    total_clients: int
    total_declarations: int
