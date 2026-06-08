import os
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from langchain_google_genai import ChatGoogleGenerativeAI

llm = None
tokenizer = None
nli_model = None
device = None

def init_models():
    global llm, tokenizer, nli_model, device
    
    llm = ChatGoogleGenerativeAI(model='gemma-4-31b-it')
    
    # Go up two directories from backend/core/ to the root workspace
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__))) 
    model_path = os.path.join(base_dir, "fever-nli-deberta")
    if not os.path.exists(model_path):
        print(f"Modello locale non trovato in {model_path}. Uso il modello base da HuggingFace come fallback.")
        model_path = "cross-encoder/nli-deberta-v3-large"
        
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    nli_model = AutoModelForSequenceClassification.from_pretrained(model_path)
    nli_model.eval()
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    nli_model.to(device)
    print(f"Modelli inizializzati. NLI caricato su: {device}")
