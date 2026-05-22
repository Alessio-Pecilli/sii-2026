# 🛡️ FactCheck-Agent: AI-Driven News Validator

Un agente intelligente progettato per combattere la disinformazione sul Web. Il sistema analizza una notizia in input, recupera prove in tempo reale tramite motori di ricerca (RAG), esegue un'inferenza logica (NLI) tramite un modello custom ottimizzato, e genera una spiegazione dettagliata e trasparente del verdetto.

Il progetto è sviluppato nell'ambito del corso di **Sistemi Intelligenti per Internet (SII)** (6 CFU).

## 🚀 Architettura del Sistema

Il workflow dell'agente è suddiviso in quattro fasi principali:

1. **Retrieval (RAG):** Data una news, l'agente interroga i motori di ricerca per ottenere snippet e articoli correlati in tempo reale.
2. **Logic Core (NLI):** Un modello **DeBERTa-v3-Large** sottoposto a fine-tuning valuta la relazione logica tra la news (Ipotesi) e le evidenze web (Premessa), classificandola come *Entailment* (Vero), *Contradiction* (Falso) o *Neutral* (Insufficienza di prove).
3. **Reasoning (LLM):** Un modello generativo riceve il verdetto del Logic Core e il contesto recuperato per redigere una spiegazione testuale accurata.
4. **Output:** Restituzione all'utente del flag di veridicità e della motivazione documentata.

---

## 🔬 Focus sul Modello NLI & Dataset di Fine-Tuning

Per garantire la massima solidità metodologica, il componente di NLI è stato sottoposto a un processo di fine-tuning a partire dal checkpoint pre-addestrato `cross-encoder/nli-deberta-v3-large`.

* **Dataset Utilizzato:** **FEVER (Fact Extraction and VERification) (link: https://fever.ai/download/fever/train.jsonl)**.
* **Allineamento dei Dati:** I dati originali di FEVER sono stati mappati sulle tre classi del Cross-Encoder:
  * `SUPPORTS` $\rightarrow$ *Entailment* (Notizia Validata)
  * `REFUTES` $\rightarrow$ *Contradiction* (Fake News)
  * `NOT ENOUGH INFO` $\rightarrow$ *Neutral* (Fonti insufficienti o non correlate)
* **Metodologia:** L'approccio Cross-Encoder permette l'attenzione bidirezionale simultanea tra l'affermazione dell'utente e le evidenze testuali, garantendo prestazioni superiori rispetto ai tradizionali classificatori basati solo sullo stile del testo.

---

## 🛠️ Stack Tecnologico

| Componente | Tecnologia |
| :--- | :--- |
| **Orchestratore** | LangChain / CrewAI |
| **NLI Core Model** | `cross-encoder/nli-deberta-v3-large` (Fine-tuned su FEVER) |
| **Generation LLM** | Gemini 3.1 Flash Lite (o similari tramite API) |
| **Search Tool** | DuckDuckGo Search API |
| **Framework** | Python 3.11+ (Transformers, PyTorch, Scikit-learn) |

---

## 📊 Metriche di Valutazione e Report Finali
In conformità con i requisiti del corso, le prestazioni del modello NLI sono valutate confrontando il modello pre-addestrato (baseline) con la versione ottimizzata tramite fine-tuning, analizzando le seguenti metriche:
* Precision, Recall, F1-Score (per classe)
* Confusion Matrix
* Analisi critica dei casi di errore dell'agente (es. fallimenti causati da rumore nell'Information Retrieval).

I dettagli completi sull'approccio metodologico, il codice sorgente e la bibliografia sono documentati nel Report Finale allegato.

---

## ⚠️ Limitazioni e Disclaimer
L'accuratezza del sistema è strettamente legata alla qualità e all'indicizzazione delle fonti terze recuperate sul Web in tempo reale. Il sistema è configurato come uno strumento di supporto al debunking umano.