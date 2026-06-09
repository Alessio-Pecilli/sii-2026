# AI Agent NLI API (Backend)

Questo backend implementa un agente di Intelligenza Artificiale basato su un flusso di lavoro **RAG (Retrieval-Augmented Generation)** abbinato alla classificazione **NLI (Natural Language Inference)**. 

Lo scopo principale del backend è ricevere un'affermazione o una notizia dall'utente, cercare informazioni rilevanti sul web per verificarne la veridicità e, tramite un modello locale di classificazione, stabilire se le fonti confermano (SUPPORTS), smentiscono (REFUTES) o non hanno abbastanza informazioni (NOT ENOUGH INFO) sulla notizia. L'agente genera poi una spiegazione discorsiva basata sull'esito.

## 🗂️ Struttura del Progetto

Il codice è stato suddiviso in moduli per garantire manutenibilità e chiarezza delle responsabilità:

* `main.py`: Punto di ingresso dell'applicazione FastAPI. Si occupa di configurare il ciclo di vita dell'applicazione (caricamento dei modelli in avvio) e di esporre la rotta HTTP principale (`/verify`).
* `requirements.txt`: Elenca tutte le librerie Python necessarie per l'ambiente.
* `models/`
  * `state.py`: Definisce la struttura degli "Stati" (es. `HiddenState`, `InputState`, `OutputState`) passati tra i nodi nel grafo di LangGraph.
  * `api.py`: Contiene i modelli Pydantic usati per tipizzare e validare in automatico il JSON in ingresso e in uscita dalle rotte API.
* `core/`
  * `ml.py`: Contiene la logica di inizializzazione dei modelli di Machine Learning. Carica il Large Language Model (LLM via Google GenAI) e il modello locale NLI fine-tuned (basato su DeBERTa). Se il modello locale non viene trovato, effettua un fallback al modello HuggingFace base.
* `workflow/`
  * `nodes.py`: Contiene i nodi operativi del grafo LangGraph. Ogni nodo esegue un compito specifico:
    1. **`refine_query_node`**: Usa l'LLM per estrapolare le keyword di ricerca.
    2. **`search_node`**: Esegue la ricerca vera e propria tramite DuckDuckGo.
    3. **`nli_classification_node`**: Invia la notizia iniziale (Ipotesi) e i risultati della ricerca (Premessa) al modello NLI, che emette il verdetto.
    4. **`generate_motivation_node`**: Fa scrivere all'LLM un testo conclusivo e argomentato, integrando i link di origine.
  * `graph.py`: Importa i nodi, definisce la sequenza operativa con le transizioni e compila l'applicativo LangGraph.

## 🚀 Come Avviare il Backend

Assicurati di trovarti nella directory `backend` e di avere un ambiente virtuale (`.venv`) attivo.

**1. Installa le dipendenze:**
```bash
pip install -r requirements.txt
```

**2. Configura le variabili d'ambiente (se necessario):**
Il backend utilizza `langchain-google-genai`, per cui è necessaria una chiave API di Google salvata come variabile d'ambiente (es. `GOOGLE_API_KEY`). Assicurati che sia settata nel tuo ambiente o in un file `.env` letto alla radice.

**3. Avvia il server FastAPI:**
```bash
uvicorn main:app --reload
```
Il server si avvierà su `http://127.0.0.1:8000`.

## 🌐 Endpoints

L'endpoint principale esposto dall'applicazione è `POST /verify`.
Puoi esplorare l'interfaccia Swagger generata automaticamente da FastAPI visitando: `http://127.0.0.1:8000/docs`

### Esempio di Utilizzo

**Richiesta (POST `/verify`):**
```json
{
  "query": "Addio Bastoni, netta posizione dell’Inter: annuncio di Romano"
}
```

**Risposta (JSON):**
```json
{
  "response": "La spiegazione discorsiva generata dall'LLM che analizza la notizia e la fonte confermando o smentendo il contenuto... \n\n---\n**Evidenza grezza recuperata dal web (DuckDuckGo):**\n..."
}
```
