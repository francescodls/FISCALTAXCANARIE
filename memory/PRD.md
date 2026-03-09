# Fiscal Tax Canarie - PRD

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. L'app serve ai clienti per conoscere modelli tributari e scadenze, pagamento tasse, accesso alla documentazione. Include sezione per buste paga (PDF) e appunti per ogni cliente.

## User Personas
1. **Cliente**: Cittadino/azienda che ha bisogno di gestire pratiche fiscali
2. **Commercialista**: Professionista che gestisce i clienti e le loro pratiche

## Core Requirements
- Autenticazione JWT con email/password
- Due ruoli: Cliente e Commercialista
- Calendario scadenze fiscali Canarie
- Upload/download documenti PDF
- Upload/download buste paga PDF
- Sistema appunti (interni e pubblici)
- Design: tema chiaro, colori bianco e #3caca4 (teal)

## What's Been Implemented (Jan 2026)
### Backend (FastAPI + MongoDB)
- [x] Auth: register, login, JWT tokens
- [x] CRUD Users con ruoli (cliente/commercialista)
- [x] CRUD Documents con upload PDF (base64)
- [x] CRUD Payslips (buste paga) con upload PDF
- [x] CRUD Notes con visibilità (interno/pubblico)
- [x] Scadenze fiscali predefinite Canarie (12 modelli)
- [x] Stats endpoint per dashboard

### Frontend (React)
- [x] Landing page con servizi
- [x] Login/Register pages
- [x] Client Dashboard: scadenze, documenti, buste paga, appunti
- [x] Commercial Dashboard: lista clienti, stats
- [x] Client Detail page: upload docs/payslips, gestione appunti
- [x] Calendario con date scadenze evidenziate
- [x] Download file PDF

## Test Results
- Backend: 100% (15/15 tests passed)
- Frontend: 90% (funzionalità core funzionanti)

## Prioritized Backlog
### P0 (Critical) - DONE
- [x] Auth system
- [x] CRUD operations
- [x] File upload/download

### P1 (High Priority)
- [ ] Email notifications per scadenze imminenti
- [ ] Password recovery
- [ ] Admin panel per gestione scadenze custom

### P2 (Medium Priority)
- [ ] Export report PDF per cliente
- [ ] Dashboard analytics/charts
- [ ] Multi-language support (ES/IT)
- [ ] Dark mode toggle

## Next Tasks
1. Testare upload documenti/buste paga end-to-end
2. Aggiungere notifiche email scadenze
3. Implementare password recovery
4. Aggiungere gestione scadenze personalizzate
