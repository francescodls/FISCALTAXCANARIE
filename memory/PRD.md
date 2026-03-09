# Fiscal Tax Canarie - PRD Aggiornato

## Problem Statement
App per studio legale e commercialisti "Fiscal Tax Canarie" alle Isole Canarie. Gestione clienti, documenti fiscali, scadenze tributarie e comunicazioni.

## User Personas
1. **Cliente**: Accede alla propria area per documenti, scadenze, modifica anagrafica
2. **Commercialista/Admin**: Account unico con accesso completo

## What's Been Implemented

### Fase 1-4 - COMPLETATE ✅
(vedere changelog precedente)

### Fase 5 - COMPLETATA ✅
- [x] Anagrafica cliente estesa (NIE, NIF, CIF, IBAN, indirizzo)
- [x] Liste clienti personalizzate
- [x] Upload globale documenti multipli con AI
- [x] Eliminazione/archiviazione clienti

### Fase 6 (9 Marzo 2026) - COMPLETATA ✅

**1. Cliente può modificare propria anagrafica**
- Tab "I Miei Dati" nella dashboard cliente
- Campi modificabili: nome, telefono, NIE, NIF, CIF, codice fiscale, indirizzo completo, IBAN
- Email non modificabile (readonly)
- Endpoint: `PUT /api/auth/me`

**2. Classificazione automatica clienti in liste**
- Quando il commercialista imposta `tipo_cliente` (autonomo/società/privato)
- Il cliente viene automaticamente aggiunto alla lista corrispondente
- Le liste vengono create automaticamente se non esistono
- Rimozione automatica da altre liste di tipo

**3. Modelli tributari con video YouTube**
- Pagina gestione modelli: `/admin/models`
- Campo `video_youtube` per URL video
- Thumbnail automatica da YouTube (img.youtube.com/vi/{id}/mqdefault.jpg)
- Anteprima video nel dialog con pulsante play rosso

**4. Rimossa sezione "Conseguenze mancata presentazione"**
- Campo rimosso dal modello `ModelloTributarioResponse`
- Sezione non più visibile nel frontend
- UI più rassicurante per i clienti

## Account Predefiniti
- **Commercialista**: info@fiscaltaxcanarie.com / Triana48+

## API Endpoints Principali

### Profilo Cliente
- `GET /api/auth/me` - Info profilo con campi estesi
- `PUT /api/auth/me` - Cliente modifica propria anagrafica

### Modelli Tributari
- `GET /api/modelli-tributari` - Lista con video_thumbnail
- `POST /api/modelli-tributari` - Crea (solo commercialista)
- `PUT /api/modelli-tributari/{id}` - Modifica con video YouTube
- `DELETE /api/modelli-tributari/{id}` - Elimina

### Clienti
- `PUT /api/clients/{id}` - Modifica con auto-classificazione in lista

## Database Schema Aggiornato

**users (clienti)**:
```json
{
  "id": "uuid",
  "email": "string",
  "full_name": "string",
  "phone": "string",
  "codice_fiscale": "string",
  "nie": "string",
  "nif": "string", 
  "cif": "string",
  "indirizzo": "string",
  "citta": "string",
  "cap": "string",
  "provincia": "string",
  "iban": "string",
  "tipo_cliente": "autonomo|societa|privato",
  "lists": ["list_id_1", "list_id_2"],
  "role": "cliente|commercialista",
  "stato": "attivo|sospeso|cessato"
}
```

**modelli_tributari**:
```json
{
  "id": "uuid",
  "codice": "Modelo-303",
  "nome": "IGIC Trimestrale",
  "descrizione": "string",
  "a_cosa_serve": "string",
  "chi_deve_presentarlo": "string",
  "periodicita": "mensile|trimestrale|annuale",
  "scadenza_tipica": "string",
  "documenti_necessari": ["doc1", "doc2"],
  "note_operative": "string",
  "video_youtube": "https://youtube.com/watch?v=...",
  "video_thumbnail": "https://img.youtube.com/vi/.../hqdefault.jpg"
}
```

## Integrazioni
- **OpenAI GPT-4o-mini**: Chatbot, analisi documenti, ricerca semantica
- **Brevo**: Email transazionali

## Next Tasks
1. **P2**: Scadenze ricorrenti con promemoria automatici
2. **P2**: Versioning documenti con storico
3. **P3**: Report esportabili (PDF/Excel)

## Future Tasks
- Firma elettronica
- WhatsApp Business
- Multilingua (IT/ES)
