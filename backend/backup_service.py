"""
Servizio Backup per Fiscal Tax Canarie
Gestisce export dati, backup ZIP e restore
"""
import os
import io
import json
import zipfile
import base64
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


async def create_client_backup(
    db,
    client_id: str,
    include_documents: bool = True,
    include_payslips: bool = True,
    include_notes: bool = True,
    include_deadlines: bool = True,
    include_fees: bool = True
) -> Dict[str, Any]:
    """
    Crea un backup ZIP completo per un singolo cliente.
    Include tutti i documenti, buste paga, note, scadenze e onorari.
    
    Returns:
        Dict con backup_data (bytes), filename, e statistiche
    """
    try:
        # Recupera dati cliente
        client = await db.users.find_one({"id": client_id, "role": "cliente"}, {"_id": 0, "password": 0})
        if not client:
            return {"success": False, "error": "Cliente non trovato"}
        
        # Crea buffer ZIP in memoria
        zip_buffer = io.BytesIO()
        
        stats = {
            "documents": 0,
            "payslips": 0,
            "notes": 0,
            "deadlines": 0,
            "fees": 0,
            "total_size_bytes": 0
        }
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # 1. Info cliente (JSON)
            client_json = json.dumps(client, indent=2, ensure_ascii=False, default=str)
            zf.writestr("cliente_info.json", client_json)
            
            # 2. Documenti
            if include_documents:
                documents = await db.documents.find({"client_id": client_id}, {"_id": 0}).to_list(10000)
                docs_metadata = []
                
                for doc in documents:
                    # Salva file se presente
                    if doc.get("file_data"):
                        try:
                            file_bytes = base64.b64decode(doc["file_data"])
                            safe_filename = f"documenti/{doc.get('id', 'unknown')}_{doc.get('file_name', 'file.pdf')}"
                            zf.writestr(safe_filename, file_bytes)
                            stats["total_size_bytes"] += len(file_bytes)
                        except Exception as e:
                            logger.warning(f"Errore decodifica documento {doc.get('id')}: {e}")
                    
                    # Rimuovi file_data dal metadata per ridurre dimensione JSON
                    doc_meta = {k: v for k, v in doc.items() if k != "file_data"}
                    docs_metadata.append(doc_meta)
                    stats["documents"] += 1
                
                # Salva metadata documenti
                zf.writestr("documenti/metadata.json", json.dumps(docs_metadata, indent=2, ensure_ascii=False, default=str))
            
            # 3. Buste paga
            if include_payslips:
                payslips = await db.payslips.find({"client_id": client_id}, {"_id": 0}).to_list(10000)
                payslips_metadata = []
                
                for ps in payslips:
                    if ps.get("file_data"):
                        try:
                            file_bytes = base64.b64decode(ps["file_data"])
                            safe_filename = f"buste_paga/{ps.get('id', 'unknown')}_{ps.get('file_name', 'file.pdf')}"
                            zf.writestr(safe_filename, file_bytes)
                            stats["total_size_bytes"] += len(file_bytes)
                        except Exception as e:
                            logger.warning(f"Errore decodifica busta paga {ps.get('id')}: {e}")
                    
                    ps_meta = {k: v for k, v in ps.items() if k != "file_data"}
                    payslips_metadata.append(ps_meta)
                    stats["payslips"] += 1
                
                zf.writestr("buste_paga/metadata.json", json.dumps(payslips_metadata, indent=2, ensure_ascii=False, default=str))
            
            # 4. Note/Comunicazioni
            if include_notes:
                notes = await db.notes.find({"client_id": client_id}, {"_id": 0}).to_list(10000)
                zf.writestr("comunicazioni/note.json", json.dumps(notes, indent=2, ensure_ascii=False, default=str))
                stats["notes"] = len(notes)
            
            # 5. Scadenze
            if include_deadlines:
                deadlines = await db.deadlines.find(
                    {"$or": [{"client_ids": client_id}, {"applies_to_all": True}]},
                    {"_id": 0}
                ).to_list(10000)
                zf.writestr("scadenze/scadenze.json", json.dumps(deadlines, indent=2, ensure_ascii=False, default=str))
                stats["deadlines"] = len(deadlines)
            
            # 6. Onorari/Fatture
            if include_fees:
                fees = await db.fees.find({"client_id": client_id}, {"_id": 0}).to_list(10000)
                zf.writestr("onorari/onorari.json", json.dumps(fees, indent=2, ensure_ascii=False, default=str))
                stats["fees"] = len(fees)
            
            # 7. Riepilogo backup
            backup_info = {
                "backup_date": datetime.now(timezone.utc).isoformat(),
                "client_id": client_id,
                "client_name": client.get("full_name", ""),
                "client_email": client.get("email", ""),
                "statistics": stats,
                "version": "1.0"
            }
            zf.writestr("backup_info.json", json.dumps(backup_info, indent=2, ensure_ascii=False))
        
        # Ottieni bytes del ZIP
        zip_buffer.seek(0)
        backup_data = zip_buffer.read()
        
        # Nome file backup
        client_name_safe = "".join(c for c in client.get("full_name", "cliente") if c.isalnum() or c in " _-").strip()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"backup_{client_name_safe}_{timestamp}.zip"
        
        logger.info(f"Backup creato per cliente {client_id}: {filename} ({len(backup_data)} bytes)")
        
        return {
            "success": True,
            "backup_data": backup_data,
            "filename": filename,
            "statistics": stats,
            "size_bytes": len(backup_data),
            "size_mb": round(len(backup_data) / (1024 * 1024), 2)
        }
        
    except Exception as e:
        logger.error(f"Errore creazione backup cliente {client_id}: {e}")
        return {"success": False, "error": str(e)}


async def create_full_backup(
    db,
    user_id: str,
    include_clients: bool = True,
    include_documents: bool = True,
    include_settings: bool = True
) -> Dict[str, Any]:
    """
    Crea un backup ZIP completo di TUTTI i dati dello studio.
    Solo per commercialista.
    
    Returns:
        Dict con backup_data (bytes), filename, e statistiche
    """
    try:
        zip_buffer = io.BytesIO()
        
        stats = {
            "clients": 0,
            "documents": 0,
            "payslips": 0,
            "notes": 0,
            "deadlines": 0,
            "fees": 0,
            "client_lists": 0,
            "tax_models": 0,
            "total_size_bytes": 0
        }
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            
            # 1. Tutti i clienti
            if include_clients:
                clients = await db.users.find({"role": "cliente"}, {"_id": 0, "password": 0}).to_list(100000)
                zf.writestr("clienti/clienti.json", json.dumps(clients, indent=2, ensure_ascii=False, default=str))
                stats["clients"] = len(clients)
                
                # Per ogni cliente, crea una sottocartella
                for client in clients:
                    client_id = client.get("id")
                    client_name_safe = "".join(c for c in client.get("full_name", "cliente") if c.isalnum() or c in " _-").strip()[:30]
                    client_folder = f"clienti/{client_name_safe}_{client_id[:8]}"
                    
                    if include_documents:
                        # Documenti
                        docs = await db.documents.find({"client_id": client_id}, {"_id": 0}).to_list(10000)
                        for doc in docs:
                            if doc.get("file_data"):
                                try:
                                    file_bytes = base64.b64decode(doc["file_data"])
                                    zf.writestr(f"{client_folder}/documenti/{doc.get('file_name', 'file.pdf')}", file_bytes)
                                    stats["total_size_bytes"] += len(file_bytes)
                                    stats["documents"] += 1
                                except:
                                    pass
                        
                        # Buste paga
                        payslips = await db.payslips.find({"client_id": client_id}, {"_id": 0}).to_list(10000)
                        for ps in payslips:
                            if ps.get("file_data"):
                                try:
                                    file_bytes = base64.b64decode(ps["file_data"])
                                    zf.writestr(f"{client_folder}/buste_paga/{ps.get('file_name', 'file.pdf')}", file_bytes)
                                    stats["total_size_bytes"] += len(file_bytes)
                                    stats["payslips"] += 1
                                except:
                                    pass
                    
                    # Note
                    notes = await db.notes.find({"client_id": client_id}, {"_id": 0}).to_list(10000)
                    if notes:
                        zf.writestr(f"{client_folder}/note.json", json.dumps(notes, indent=2, ensure_ascii=False, default=str))
                        stats["notes"] += len(notes)
                    
                    # Onorari
                    fees = await db.fees.find({"client_id": client_id}, {"_id": 0}).to_list(10000)
                    if fees:
                        zf.writestr(f"{client_folder}/onorari.json", json.dumps(fees, indent=2, ensure_ascii=False, default=str))
                        stats["fees"] += len(fees)
            
            # 2. Scadenze globali
            deadlines = await db.deadlines.find({}, {"_id": 0}).to_list(100000)
            zf.writestr("scadenze/scadenze.json", json.dumps(deadlines, indent=2, ensure_ascii=False, default=str))
            stats["deadlines"] = len(deadlines)
            
            # 3. Liste clienti
            client_lists = await db.client_lists.find({}, {"_id": 0}).to_list(1000)
            zf.writestr("configurazione/liste_clienti.json", json.dumps(client_lists, indent=2, ensure_ascii=False, default=str))
            stats["client_lists"] = len(client_lists)
            
            # 4. Modelli tributari
            tax_models = await db.tax_models.find({}, {"_id": 0}).to_list(1000)
            zf.writestr("configurazione/modelli_tributari.json", json.dumps(tax_models, indent=2, ensure_ascii=False, default=str))
            stats["tax_models"] = len(tax_models)
            
            # 5. Attività recenti
            activities = await db.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(10000)
            zf.writestr("logs/attivita.json", json.dumps(activities, indent=2, ensure_ascii=False, default=str))
            
            # 6. Info backup
            backup_info = {
                "backup_date": datetime.now(timezone.utc).isoformat(),
                "backup_type": "full",
                "created_by": user_id,
                "statistics": stats,
                "version": "1.0"
            }
            zf.writestr("backup_info.json", json.dumps(backup_info, indent=2, ensure_ascii=False))
        
        zip_buffer.seek(0)
        backup_data = zip_buffer.read()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"backup_completo_FiscalTaxCanarie_{timestamp}.zip"
        
        logger.info(f"Backup completo creato: {filename} ({len(backup_data)} bytes)")
        
        return {
            "success": True,
            "backup_data": backup_data,
            "filename": filename,
            "statistics": stats,
            "size_bytes": len(backup_data),
            "size_mb": round(len(backup_data) / (1024 * 1024), 2)
        }
        
    except Exception as e:
        logger.error(f"Errore creazione backup completo: {e}")
        return {"success": False, "error": str(e)}


async def export_database_json(db, user_id: str) -> Dict[str, Any]:
    """
    Esporta tutto il database in formato JSON (senza file binari).
    Utile per migrazione o analisi dati.
    """
    try:
        export_data = {
            "export_date": datetime.now(timezone.utc).isoformat(),
            "exported_by": user_id,
            "collections": {}
        }
        
        # Esporta tutte le collection (senza file_data)
        collections_to_export = [
            ("users", {"_id": 0, "password": 0}),
            ("documents", {"_id": 0, "file_data": 0}),
            ("payslips", {"_id": 0, "file_data": 0}),
            ("notes", {"_id": 0}),
            ("deadlines", {"_id": 0}),
            ("fees", {"_id": 0}),
            ("client_lists", {"_id": 0}),
            ("tax_models", {"_id": 0}),
            ("certificates", {"_id": 0}),
            ("activity_logs", {"_id": 0})
        ]
        
        for coll_name, projection in collections_to_export:
            try:
                coll = db[coll_name]
                docs = await coll.find({}, projection).to_list(100000)
                export_data["collections"][coll_name] = docs
            except Exception as e:
                logger.warning(f"Errore export collection {coll_name}: {e}")
                export_data["collections"][coll_name] = []
        
        json_str = json.dumps(export_data, indent=2, ensure_ascii=False, default=str)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"export_database_{timestamp}.json"
        
        return {
            "success": True,
            "data": json_str,
            "filename": filename,
            "size_bytes": len(json_str.encode('utf-8'))
        }
        
    except Exception as e:
        logger.error(f"Errore export database: {e}")
        return {"success": False, "error": str(e)}


async def get_backup_history(db, limit: int = 20) -> List[Dict[str, Any]]:
    """Recupera storico backup dal database"""
    try:
        backups = await db.backups.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
        return backups
    except:
        return []


async def log_backup(db, backup_info: Dict[str, Any]) -> None:
    """Salva info backup nel database"""
    try:
        await db.backups.insert_one({
            "id": str(uuid.uuid4()),
            "filename": backup_info.get("filename"),
            "type": backup_info.get("type", "full"),
            "size_bytes": backup_info.get("size_bytes", 0),
            "statistics": backup_info.get("statistics", {}),
            "created_by": backup_info.get("created_by"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.warning(f"Errore salvataggio log backup: {e}")
