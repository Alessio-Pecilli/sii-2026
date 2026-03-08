# 🛡️ FactCheck-Agent: AI-Driven News Validator

Un agente intelligente progettato per combattere la disinformazione. Il sistema analizza una notizia in input, recupera prove in tempo reale dal web, esegue un'inferenza logica (NLI) e genera una spiegazione dettagliata del verdetto.

## 🚀 Architettura del Sistema

Il workflow dell'agente è suddiviso in quattro fasi principali:

1.  **Retrieval (RAG):** Data una news, l'agente interroga i motori di ricerca per ottenere articoli correlati da fonti autorevoli.
2.  **Logic Core (NLI):** Utilizza un modello fine-tuning a partire da **DeBERTa-v3-NLI** per confrontare la news dell'utente con le evidenze trovate, classificando la relazione come *Entailment* (Vero), *Contradiction* (Falso) o *Neutral*.
3.  **Reasoning (LLM):** Un modello generativo (es. Llama 4 o GPT-4o) riceve il verdetto e i testi di supporto per redigere una spiegazione umana e trasparente.
4.  **Output:** Consegna all'utente il flag (Vero/Falso) e la motivazione documentata.

---

## 🛠️ Stack Tecnologico

| Componente | Tecnologia Suggerita |
| :--- | :--- |
| **Orchestratore** | LangChain / CrewAI |
| **NLI Model** | `cross-encoder/nli-deberta-v3-large` (via Hugging Face) |
| **Generation LLM** | Llama 4 (8B/70B) o Gemini 2.0 API |
| **Search Tool** | Tavily AI / Serper.dev (ottimizzati per LLM) |
| **Framework** | Python 3.11+ |

---

# 🔬 Dettagli sul Modello NLI
A differenza dei normali classificatori, il cuore NLI (Natural Language Inference) permette di rilevare non solo lo "stile" della fake news, ma l'effettiva contraddizione logica tra l'input e le fonti ufficiali recuperate.

# ⚠️ Limitazioni e Disclaimer
L'accuratezza dipende dalla qualità delle fonti recuperate.

Il sistema è progettato come supporto al debunking umano, non come verità assoluta.