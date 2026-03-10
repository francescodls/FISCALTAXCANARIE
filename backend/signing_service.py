"""
Servizio di Firma Digitale con certificati .p12
Utilizza pyHanko per firmare documenti PDF
"""
import os
import io
import logging
import base64
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logger = logging.getLogger(__name__)

# Directory per i certificati
CERTIFICATES_DIR = ROOT_DIR / "certificates"
CERTIFICATES_DIR.mkdir(exist_ok=True)

async def sign_pdf_with_p12(
    pdf_data: bytes,
    p12_data: bytes,
    p12_password: str,
    signer_name: str = "Fiscal Tax Canarie",
    reason: str = "Documento firmato digitalmente",
    location: str = "Isole Canarie, Spagna",
    visible_signature: bool = True
) -> Dict[str, Any]:
    """
    Firma un documento PDF con un certificato .p12
    
    Args:
        pdf_data: Contenuto del PDF in bytes
        p12_data: Contenuto del certificato .p12 in bytes
        p12_password: Password del certificato
        signer_name: Nome del firmatario
        reason: Motivo della firma
        location: Luogo della firma
        visible_signature: Se True, aggiunge una firma visibile
    
    Returns:
        Dict con success, signed_pdf_data (base64), o error
    """
    try:
        from pyhanko.sign import signers, fields
        from pyhanko.sign.signers import PdfSigner
        from pyhanko.sign.signers.pdf_signer import PdfSignatureMetadata
        from pyhanko.pdf_utils.reader import PdfFileReader
        from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
        from cryptography.hazmat.primitives.serialization import pkcs12
        from cryptography.hazmat.backends import default_backend
        
        # Carica il certificato .p12
        private_key, certificate, additional_certs = pkcs12.load_key_and_certificates(
            p12_data, 
            p12_password.encode('utf-8'),
            default_backend()
        )
        
        if not private_key or not certificate:
            return {"success": False, "error": "Certificato non valido o password errata"}
        
        # Crea il signer
        from pyhanko.keys import load_cert_from_pemder
        from pyhanko.sign.signers import SimpleSigner
        
        signer = SimpleSigner(
            signing_cert=certificate,
            signing_key=private_key,
            cert_registry=None,
            other_certs=list(additional_certs) if additional_certs else None
        )
        
        # Prepara il PDF per la firma
        pdf_input = io.BytesIO(pdf_data)
        pdf_reader = PdfFileReader(pdf_input)
        
        # Crea writer incrementale
        w = IncrementalPdfFileWriter(pdf_input)
        
        # Metadata della firma
        signature_meta = PdfSignatureMetadata(
            field_name="Signature1",
            name=signer_name,
            reason=reason,
            location=location
        )
        
        # Firma il documento
        pdf_output = io.BytesIO()
        
        if visible_signature:
            # Firma visibile in basso a destra della prima pagina
            sig_field = fields.SigFieldSpec(
                sig_field_name="Signature1",
                on_page=0,  # Prima pagina
                box=(350, 50, 550, 100)  # Posizione
            )
            
            signed = signers.PdfSigner(
                signature_meta,
                signer,
                stamp_style=None  # Può essere personalizzato
            ).sign_pdf(
                w,
                output=pdf_output,
                existing_fields_only=False,
                appearance_text_params={
                    'signer': signer_name,
                    'reason': reason,
                    'location': location,
                    'timestamp': datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M:%S UTC')
                }
            )
        else:
            # Firma invisibile
            signed = signers.PdfSigner(
                signature_meta,
                signer
            ).sign_pdf(w, output=pdf_output)
        
        # Converti in base64
        pdf_output.seek(0)
        signed_pdf_base64 = base64.b64encode(pdf_output.read()).decode('utf-8')
        
        logger.info(f"Documento firmato con successo da {signer_name}")
        
        return {
            "success": True,
            "signed_pdf_data": signed_pdf_base64,
            "signer_name": signer_name,
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "reason": reason,
            "location": location
        }
        
    except Exception as e:
        logger.error(f"Errore firma PDF: {str(e)}")
        return {"success": False, "error": str(e)}


async def verify_pdf_signature(pdf_data: bytes) -> Dict[str, Any]:
    """
    Verifica le firme digitali di un PDF
    
    Args:
        pdf_data: Contenuto del PDF in bytes
    
    Returns:
        Dict con dettagli delle firme trovate
    """
    try:
        from pyhanko.sign.validation import validate_pdf_signature
        from pyhanko.pdf_utils.reader import PdfFileReader
        import io
        
        pdf_input = io.BytesIO(pdf_data)
        reader = PdfFileReader(pdf_input)
        
        signatures = []
        
        # Itera su tutti i campi firma
        if hasattr(reader, 'embedded_signatures'):
            for sig in reader.embedded_signatures:
                try:
                    status = validate_pdf_signature(sig)
                    signatures.append({
                        "field_name": sig.field_name,
                        "valid": status.valid,
                        "intact": status.intact,
                        "signer_name": str(sig.signer_cert.subject) if hasattr(sig, 'signer_cert') else "Unknown",
                        "signing_time": sig.signing_time.isoformat() if sig.signing_time else None
                    })
                except Exception as sig_error:
                    signatures.append({
                        "field_name": sig.field_name if hasattr(sig, 'field_name') else "Unknown",
                        "valid": False,
                        "error": str(sig_error)
                    })
        
        return {
            "success": True,
            "has_signatures": len(signatures) > 0,
            "signature_count": len(signatures),
            "signatures": signatures
        }
        
    except Exception as e:
        logger.error(f"Errore verifica firma: {str(e)}")
        return {"success": False, "error": str(e)}


async def save_certificate(
    certificate_data: bytes,
    certificate_name: str,
    user_id: str
) -> Dict[str, Any]:
    """
    Salva un certificato .p12 per un commercialista
    
    Args:
        certificate_data: Contenuto del certificato in bytes
        certificate_name: Nome del certificato
        user_id: ID dell'utente proprietario
    
    Returns:
        Dict con percorso del certificato salvato
    """
    try:
        # Crea directory per l'utente
        user_cert_dir = CERTIFICATES_DIR / user_id
        user_cert_dir.mkdir(exist_ok=True)
        
        # Salva il certificato
        cert_path = user_cert_dir / f"{certificate_name}.p12"
        with open(cert_path, 'wb') as f:
            f.write(certificate_data)
        
        logger.info(f"Certificato salvato: {cert_path}")
        
        return {
            "success": True,
            "certificate_name": certificate_name,
            "path": str(cert_path)
        }
        
    except Exception as e:
        logger.error(f"Errore salvataggio certificato: {str(e)}")
        return {"success": False, "error": str(e)}


async def list_certificates(user_id: str) -> Dict[str, Any]:
    """Lista i certificati di un utente"""
    try:
        user_cert_dir = CERTIFICATES_DIR / user_id
        
        if not user_cert_dir.exists():
            return {"success": True, "certificates": []}
        
        certs = []
        for cert_file in user_cert_dir.glob("*.p12"):
            certs.append({
                "name": cert_file.stem,
                "filename": cert_file.name,
                "size": cert_file.stat().st_size,
                "created_at": datetime.fromtimestamp(cert_file.stat().st_ctime, timezone.utc).isoformat()
            })
        
        return {"success": True, "certificates": certs}
        
    except Exception as e:
        logger.error(f"Errore lista certificati: {str(e)}")
        return {"success": False, "error": str(e)}


async def delete_certificate(user_id: str, certificate_name: str) -> Dict[str, Any]:
    """Elimina un certificato"""
    try:
        cert_path = CERTIFICATES_DIR / user_id / f"{certificate_name}.p12"
        
        if not cert_path.exists():
            return {"success": False, "error": "Certificato non trovato"}
        
        cert_path.unlink()
        logger.info(f"Certificato eliminato: {cert_path}")
        
        return {"success": True, "message": "Certificato eliminato"}
        
    except Exception as e:
        logger.error(f"Errore eliminazione certificato: {str(e)}")
        return {"success": False, "error": str(e)}
