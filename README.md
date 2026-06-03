# 🛡️ FactCheck-Agent: AI-Driven News Validator

Un agente intelligente progettato per combattere la disinformazione sul Web. Il sistema analizza una notizia in input, recupera prove in tempo reale tramite motori di ricerca (RAG), esegue un'inferenza logica (NLI) tramite un modello custom ottimizzato, e genera una spiegazione dettagliata e trasparente del verdetto.

Il progetto è sviluppato nell'ambito del corso di **Sistemi Intelligenti per Internet (SII)** (6 CFU).

---

## 🚀 Architettura del Sistema

Il workflow dell'agente è suddiviso in quattro fasi principali:

1. **Retrieval (RAG):** Data una news, l'agente interroga i motori di ricerca per ottenere snippet e articoli correlati in tempo reale.
2. **Logic Core (NLI):** Un modello **DeBERTa-v3** (di default `cross-encoder/nli-deberta-v3-base` per efficienza di addestramento su GPU T4, o `cross-encoder/nli-deberta-v3-large` con ottimizzazioni VRAM) valuta la relazione logica tra la news (Ipotesi) e le evidenze web (Premessa), classificandola come:
   * **SUPPORTS (0)** $\rightarrow$ *Entailment* (Notizia Validata)
   * **NOT ENOUGH INFO (1)** $\rightarrow$ *Neutral* (Fonti insufficienti o non correlate)
   * **REFUTES (2)** $\rightarrow$ *Contradiction* (Notizia Confutata / Fake News)
3. **Reasoning (LLM):** Un modello generativo riceve il verdetto del Logic Core e il contesto recuperato per redigere una spiegazione testuale accurata.
4. **Output:** Restituzione all'utente del flag di veridicità e della motivazione documentata.

---

## 🔬 Focus sul Modello NLI & Dataset di Fine-Tuning

Il componente NLI è addestrato ed ottimizzato tramite il notebook dedicato situato in `notebooks/fever_nli_finetuning.ipynb`.

* **Dataset Utilizzato:** **`pietrolesci/nli_fever`** (caricato direttamente da Hugging Face), che fornisce coppie Premessa/Ipotesi già estratte ed allineate dal dataset FEVER.
* **Suddivisione dei Dati (Splits):**
  * **Train Set:** Utilizzato per il fine-tuning dei modelli (sottoinsieme di 5000 campioni per questioni di risorse).
  * **Validation (Dev) Set:** Utilizzato come set di sviluppo e validazione (1000 campioni) per confrontare le performance dei vari iperparametri e selezionare il modello migliore.
  * **Test Set:** Split ufficiale di test di Hugging Face (1000 campioni, con label native poste a `-1`) su cui effettuare l'inferenza finale e generare le predizioni testuali.
* **Ottimizzazione degli Iperparametri (Grid Search):**
  Vengono addestrati e confrontati sistematicamente tre configurazioni di modello:
  1. **Modello 1:** Learning Rate = `1e-5`, Weight Decay = `0.01`
  2. **Modello 2:** Learning Rate = `2e-5`, Weight Decay = `0.01`
  3. **Modello 3:** Learning Rate = `3e-5`, Weight Decay = `0.1`

---

## 💾 File di Report e Grafici Generati

Eseguendo il notebook di addestramento verranno generati automaticamente nella cartella corrente i seguenti file utili per la stesura della relazione finale del progetto:
* 📄 **`experiment_results.csv`**: Un report tabellare che confronta le metriche (Accuracy, Precision, Recall, F1-Score) sul validation set per ciascuna configurazione della griglia di ricerca.
* 📄 **`hf_test_predictions.csv`**: Le predizioni testuali del modello migliore sulle notizie non etichettate dello split di test ufficiale.
* 🖼️ **`model_performance_comparison.png`**: Grafico a barre ad alta risoluzione che confronta l'accuratezza e l'F1-Score di tutti i modelli addestrati.
* 🖼️ **`loss_and_confusion_matrix.png`**: Grafico combinato contenente l'andamento delle curve di Loss (Train vs Val) per tutti i modelli e la matrice di confusione del modello migliore calcolata sul validation set.

---

## 🛠️ Stack Tecnologico & Requisiti

| Componente | Tecnologia |
| :--- | :--- |
| **Orchestratore** | LangChain / CrewAI / LangGraph |
| **NLI Core Model** | `cross-encoder/nli-deberta-v3-base` (o `large` con ottimizzazione memoria) |
| **Generation LLM** | Gemini 3.1 Flash Lite (o simili tramite API Google GenAI) |
| **Search Tool** | DuckDuckGo Search API |
| **Accelerazione Hardware** | NVIDIA CUDA (GPU) / Google Cloud TPU v5e / RAPIDS `cudf` |

### ⚠️ Prevenzione OOM (Out Of Memory) su GPU T4 (16 GB VRAM)
Nel caso si scelga di addestrare la versione `large` del modello, il notebook include le seguenti ottimizzazioni per rientrare nei limiti fisici della GPU:
* **Gradient Checkpointing**: Riduce drasticamente l'occupazione della VRAM scambiando memoria con ricalcolo dei gradienti nel backward pass.
* **Gradient Accumulation**: Riduce il batch size fisico a `4` ma esegue l'aggiornamento dei pesi ogni `2` step, mantenendo un batch size efficace di `8`.

---

## 🚀 Istruzioni per l'Esecuzione su Google Colab

1. Apri Google Colab e carica il notebook `notebooks/fever_nli_finetuning.ipynb`.
2. Esegui la cella **1. Setup & Librerie** per installare le dipendenze (incluse `sentencepiece` e `torchvision` allineate).
3. **IMPORTANTE:** Per evitare errori di importazione dinamica (`ImportError: cannot import name 'VideoReader'`), fai clic su **Runtime > Riavvia sessione** nel menu superiore di Colab subito dopo l'installazione.
4. Esegui le celle in sequenza per lanciare la ricerca degli iperparametri e generare i report e i grafici finali.