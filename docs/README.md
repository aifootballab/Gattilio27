# Documentazione enterprise (docs/)

Solo documenti utili e di riferimento per produzione.

## Diagnostic, chat e riassunto
- **IMPLEMENTAZIONE_DIAGNOSTIC_CHAT.md** – Piano e implementazione: diagnostic, "Aggiorna analisi", cache, suggerimenti (stato: implementato)
- **DIAGNOSTIC_DOCUMENTO_ANALISI_DIFFICOLTA.md** – Dati, flussi, difficoltà e struttura del riassunto analisi
- **CONTROLLO_E2E_DIAGNOSTIC_CHAT.md** – Controllo end-to-end: auth, flussi (diagnostic, Informazioni IA, Statistiche di gioco, partite inserite), sicurezza, coerenza
- **RIASSUNTO_E_NUOVE_INFORMAZIONI_CHAT.md** – Da dove arrivano le informazioni (Informazioni IA, Statistiche di gioco), come entrano nel riassunto, come la chat le usa; RAG vs riassunto; partite inserite vs statistiche screenshot (nessun conflitto)
- **ROADMAP_ENTERPRISE_COACH.md** – Roadmap prodotto enterprise e coach vero (priorità profilo, freschezza dati, UX/responsivo)
- **AUDIT_SUPABASE_TABELLE_E_ALLINEAMENTO.md** – Allineamento DB/codice, tabelle public, quando si popolano (auth/storage/realtime/vault), sottotabelle (players ↔ playing_styles)
- **AUDIT_IA_RAG.md** – RAG eFootball, info_rag.md, classificazione domande

## Auth e email
- **RECUPERO_PASSWORD.md** – Flusso recupero password, configurazione Supabase, task SMTP
- **AUTH_EMAIL_ENTERPRISE_E_REDIRECT.md** – Redirect email, Site URL, NEXT_PUBLIC_APP_URL
- **SICUREZZA.md** – Checklist sicurezza, env, RLS, avvisi Supabase
- **AUDIT_EMAIL_RECUPERO_PASSWORD_E2E.md** – Audit log email, cosa controllare in Dashboard
- **EMAIL_NON_ARRIVANO_DIAGNOSI_ENTERPRISE.md** – Diagnosi email non arrivate, Custom SMTP
- **SMTP_RESEND_SETUP_NOCODE.md** – Setup SMTP con Resend (guida passo-passo)

## Crediti e business
- **SISTEMA_CREDITI_AI.md** – Sistema crediti, utilizzo, periodi
- **COSTI_API_E_PRICING_CREDITI.md** – Costi API e pricing crediti
- **RIEPILOGO_HERO_POINTS_CREDITI.md** – Hero points e crediti
- **INTEGRAZIONE_SITO_PAGAMENTI_HERO_POINTS.md** – Integrazione pagamenti

## Riferimento e audit
- **GESTIONE_ROSA_FUNZIONI.md** – Funzioni gestione rosa, formazione
- **TASK_E_KNOWLEDGE_ESPERIENZA_CLIENTE.md** – Task (obiettivi settimanali), barra Conoscenza, cosa succede quando il cliente completa un task
- **TUTORIAL_COMPLETAMENTO_CLIENTE.md** – Ordine consigliato per completare setup (profilo, rosa, partite, statistiche), perché la barra non si aggiornava, utilizzo stimato, idee tutorial in-app
- **AUDIT_CHAT_COACH.md** – Audit chat coach (ripetività, tasti, varietà consigli)
- **SERVIZI_CLIENTE_EFOOTBALL_AI_COACH_DESCRIZIONE_COMPLETA.md** – Descrizione cartelle e funzioni per servizio al cliente (pagine, API, lib, components)
- **AUDIT_BARRA_CONOSCENZA_AI.md** – Barra Conoscenza AI (evento knowledge-should-refresh, ?refresh=1, utilizzo stimato)
- **AUDIT_UX_IMPOSTAZIONI_PROFILO_E_HERO_POINTS.md** – UX impostazioni profilo e Hero Points
- **AUDIT_ENTERPRISE_TASK_FONTI_VERITA.md** – Enterprise task e fonti di verità
