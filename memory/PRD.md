# Fiscal Tax Canarie - PRD Aggiornato

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie e comunicazioni. Collegata a fiscaltaxcanarie.com.

## User Personas
1. **Cliente**: Utente che accede alla propria area riservata per documenti, scadenze, buste paga
2. **Commercialista/Admin**: Account unico (info@fiscaltaxcanarie.com) con accesso completo a tutti i clienti

## Core Requirements (Static)
- Autenticazione JWT - registrazione SOLO per clienti
- Account commercialista predefinito: info@fiscaltaxcanarie.com / Triana48+
- Calendario scadenze con stati (da_fare, in_lavorazione, completata, scaduta)
- Upload documenti e buste paga PDF
- Appunti con visibilità (interni/pubblici)
- Schede informative modelli tributari
- Design: bianco + #3caca4 (teal) con TESTO BIANCO su sfondi teal
- Log attività e tracciabilità

## What's Been Implemented (Jan 2026)

### Fase 1 - COMPLETATA ✅
**Backend (FastAPI + MongoDB)**
- [x] Auth JWT con ruoli (cliente/commercialista)
- [x] Account commercialista predefinito auto-creato al startup
- [x] Registrazione SOLO per clienti (no opzione commercialista)
- [x] CRUD Clienti con stati (attivo/sospeso/cessato)
- [x] CRUD Documenti con upload PDF
- [x] CRUD Buste Paga con upload PDF
- [x] CRUD Appunti (interni/pubblici)
- [x] Scadenze con stati e priorità (9 scadenze predefinite)
- [x] Modelli Tributari con schede informative (8 modelli)
- [x] Log attività sistema
- [x] Stats avanzate per dashboard

**Frontend (React)**
- [x] Landing page con sezione teal e TESTO BIANCO
- [x] Login/Register (solo clienti)
- [x] Dashboard Commercialista: stats, lista clienti, attività, tab
- [x] Dashboard Cliente: panoramica, scadenze, documenti, buste paga, comunicazioni
- [x] Tab "Guida Modelli Tributari" con schede dettagliate per cliente
- [x] Calendario interattivo con stati scadenze
- [x] Bottoni teal con testo BIANCO

### Fase 2 - DA IMPLEMENTARE
- [ ] OCR e classificazione automatica documenti con OpenAI GPT
- [ ] Rinomina automatica file secondo standard
- [ ] Associazione automatica documento al cliente

### Fase 3 - DA IMPLEMENTARE
- [ ] Assistente AI per clienti (ChatGPT)
- [ ] Notifiche email automatiche con Brevo
- [ ] Richiesta documenti al cliente

### Fase 4 - DA IMPLEMENTARE
- [ ] Statistiche avanzate con grafici
- [ ] Versioning documenti
- [ ] Log completo e audit trail
- [ ] Ricerca avanzata documenti

## Account Predefiniti
- **Commercialista**: info@fiscaltaxcanarie.com / Triana48+

## Modelli Tributari Precaricati (8)
1. Modelo-303 - IVA Trimestrale
2. Modelo-111 - Ritenute IRPF
3. Modelo-130 - Pagamento Frazionato IRPF
4. IGIC - Imposta Generale Indiretta Canarie
5. Modelo-390 - Riepilogo Annuale IVA
6. Modelo-200 - Imposta Società
7. Modelo-347 - Operazioni con Terzi
8. IRPF-Renta - Dichiarazione Redditi Persone Fisiche

## Next Tasks (Priorità)
1. **Fase 2**: Integrare OpenAI GPT per OCR documenti
2. **Fase 3**: Configurare Brevo per email automatiche
3. **Fase 3**: Aggiungere assistente AI
4. **Fase 4**: Dashboard statistiche avanzate
