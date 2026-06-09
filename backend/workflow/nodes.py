import torch
from langchain_community.tools import DuckDuckGoSearchRun
from models.state import HiddenState
import core.ml as ml

def refine_query_node(state: HiddenState):
    prompt = f"""
    Devi fare una ricerca su Google/DuckDuckGo per verificare la seguente notizia: "{state['query']}"
    Estrai solo le parole chiave essenziali o formula una query di ricerca ottimale (max 5-6 parole).
    Rispondi unicamente con la stringa di ricerca, senza formattazione o introduzioni.
    """
    res = ml.llm.invoke(prompt)
    content = res.content
    if isinstance(content, list):
        content = "".join(
            part.get('text', '') if isinstance(part, dict) else str(part)
            for part in content
            if not isinstance(part, dict) or part.get('type') != 'thinking'
        )
    search_query = str(content).strip()
    print(f"[Refine Node] Query di ricerca generata: {search_query}")
    return {'search_query': search_query}

def search_node(state: HiddenState):
    search = DuckDuckGoSearchRun()
    results = search.invoke(state['search_query'])
    print(f"[Search Node] Risultati estratti: {results[:100]}...")
    return {'researches': results}

def nli_classification_node(state: HiddenState):
    premise = state['researches']
    hypothesis = state['query']
    
    inputs = ml.tokenizer(premise, hypothesis, padding="max_length", truncation=True, max_length=256, return_tensors="pt")
    inputs = {k: v.to(ml.device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = ml.nli_model(**inputs)
        
    logits = outputs.logits
    probs = torch.nn.functional.softmax(logits, dim=-1)
    predicted_class_id = logits.argmax().item()
    confidence = probs[0, predicted_class_id].item()
    
    mapping = {
        0: "SUPPORTS",
        1: "NOT ENOUGH INFO",
        2: "REFUTES"
    }
    
    label = mapping[predicted_class_id]
    print(f"[NLI Node] Etichetta NLI generata: {label} con confidenza {confidence}")
    return {'nli_label': label, 'confidence': confidence}

def generate_motivation_node(state: HiddenState):
    final_prompt = f"""
    L'utente ha richiesto di verificare questa notizia: "{state['query']}"
    
    Abbiamo cercato sul web e trovato queste informazioni fattuali: "{state['researches']}"
    
    Il nostro modello di intelligenza artificiale NLI ha classificato la veridicità della notizia come: "{state['nli_label']}" 
    (dove SUPPORTS = confermata dalle fonti, NOT ENOUGH INFO = fonti insufficienti per dare una conferma/smentita, REFUTES = smentita apertamente dalle fonti).
    
    Scrivi una risposta esauriente e logica per l'utente in cui spieghi perché la notizia ha ottenuto questa classificazione, 
    utilizzando e citando discorsivamente le informazioni fattuali che abbiamo trovato. Sii professionale ma chiaro.
    """
    res = ml.llm.invoke(final_prompt)
    
    content = res.content
    if isinstance(content, list):
        content = "".join(
            part.get('text', '') if isinstance(part, dict) else str(part)
            for part in content
            if not isinstance(part, dict) or part.get('type') != 'thinking'
        )
    motivation_text = str(content)
    final_response = motivation_text + "\n\n---\n**Evidenza grezza recuperata dal web (DuckDuckGo):**\n" + state['researches']
    
    return {'motivation': motivation_text, 'response': final_response}
