import os

import torch
from langchain_google_genai import ChatGoogleGenerativeAI
from transformers import AutoModelForSequenceClassification, AutoTokenizer

llm = None
tokenizer = None
nli_model = None
device = None


def _build_llm():
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GOOGLE_API_KEY/GEMINI_API_KEY non impostata. I nodi LLM useranno un fallback locale.")
        return None

    model_name = os.getenv("GEMINI_MODEL", "gemma-4-31b-it")
    print(f"Uso modello generativo: {model_name}")
    return ChatGoogleGenerativeAI(model=model_name, api_key=api_key)


def _is_complete_local_model_dir(path: str) -> bool:
    if not os.path.isdir(path):
        return False

    files = set(os.listdir(path))
    required_files = {"config.json", "model.safetensors", "tokenizer.json", "tokenizer_config.json"}
    return required_files.issubset(files)


def _resolve_model_path() -> str:
    backend_dir = os.path.dirname(os.path.dirname(__file__))
    workspace_dir = os.path.dirname(backend_dir)
    candidate_paths = [
        os.path.join(backend_dir, "fever-nli-deberta"),
        os.path.join(workspace_dir, "fever-nli-deberta"),
    ]

    for candidate_path in candidate_paths:
        if _is_complete_local_model_dir(candidate_path):
            print(f"Uso modello locale da: {candidate_path}")
            return candidate_path

    fallback_model = "cross-encoder/nli-deberta-v3-large"
    print(
        "Modello locale non trovato o incompleto. "
        f"Uso il modello base da HuggingFace come fallback: {fallback_model}"
    )
    return fallback_model


def _load_tokenizer(model_path: str):
    try:
        return AutoTokenizer.from_pretrained(model_path)
    except ValueError as exc:
        if model_path == "cross-encoder/nli-deberta-v3-large":
            raise RuntimeError(
                "Impossibile caricare il tokenizer del fallback HuggingFace. "
                "Installa `sentencepiece` oppure ripristina la cartella locale `fever-nli-deberta`."
            ) from exc
        raise


def init_models():
    global llm, tokenizer, nli_model, device

    llm = _build_llm()

    model_path = _resolve_model_path()
    tokenizer = _load_tokenizer(model_path)
    nli_model = AutoModelForSequenceClassification.from_pretrained(model_path)
    nli_model.eval()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    nli_model.to(device)
    print(f"Modelli inizializzati. NLI caricato su: {device}")
