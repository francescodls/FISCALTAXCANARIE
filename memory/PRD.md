# Fiscal Tax Canarie - PRD Aggiornato

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie e comunicazioni. Collegata a fiscaltaxcanarie.com.

## User Personas
1. **Cliente**: Utente che accede alla propria area riservata per documenti, scadenze, buste paga
2. **Commercialista/Admin**: Account unico (info@fiscaltaxcanarie.com / Triana48+) con accesso completo

## Core Requirements (Static)
- Autenticazione JWT - registrazione SOLO per clienti
- Account commercialista predefinito
- Scadenze assegnate dal commercialista per tipo cliente (non predefinite)
- Upload documenti con analisi AI automatica
- Design: bianco + #3caca4 (teal) con TESTO BIANCO su sfondi teal

## What's Been Implemented (Jan 2026)

### Fase 1 - COMPLETATA ✅
- [x] Auth JWT con ruoli
- [x] Account commercialista predefinito
- [x] Registrazione SOLO per clienti
- [x] Tab con colori corretti (testo grigio su sfondo bianco)
- [x] Footer con numero telefono +34 658 071 848
- [x] Modelli Tributari con schede informative (8 modelli)

### Fase 2 - COMPLETATA ✅
- [x] **Classificazione AI documenti** con OpenAI GPT (via Emergent LLM Key)
- [x] Estrazione testo da PDF
- [x] Analisi automatica: tipo documento, modello tributario, descrizione
- [x] Suggerimento cliente, categoria e tag
- [x] Nome file standardizzato suggerito
- [x] Sezione "Caricamento Intelligente con AI" nel dettaglio cliente
- [x] Endpoint `/api/documents/upload-auto` con analisi AI
- [x] Endpoint `/api/documents/pending-verification` per documenti da verificare
- [x] Endpoint `/api/documents/{id}/verify` per confermare assegnazione
- [x] **Tab Scadenze** nel dettaglio cliente per assegnare scadenze per cliente
- [x] Scadenze NON predefinite (commercialista le crea manualmente per tipo cliente)

### Fase 3 - DA IMPLEMENTARE
- [ ] Assistente AI chatbot per clienti
- [ ] Notifiche email automatiche con Brevo
- [ ] Richiesta documenti al cliente

### Fase 4 - DA IMPLEMENTARE
- [ ] Statistiche avanzate con grafici
- [ ] Versioning documenti
- [ ] Log completo e audit trail
- [ ] Ricerca avanzata documenti

## Account Predefiniti
- **Commercialista**: info@fiscaltaxcanarie.com / Triana48+

## Endpoints AI Implementati
- `POST /api/documents/upload-auto` - Upload con analisi AI
- `GET /api/documents/pending-verification` - Documenti da verificare
- `PUT /api/documents/{id}/verify` - Verifica documento
- `PUT /api/documents/{id}/rename` - Rinomina documento

## Next Tasks (Priorità)
1. **Fase 3**: Configurare Brevo per notifiche email
2. **Fase 3**: Assistente AI chatbot
3. **Fase 4**: Dashboard statistiche avanzate
