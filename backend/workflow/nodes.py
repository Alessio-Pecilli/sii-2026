import re
from typing import Any

import torch
from langchain_community.tools import DuckDuckGoSearchResults

import core.ml as ml
from models.state import HiddenState

ITALIAN_STOPWORDS = {
    "a",
    "ad",
    "al",
    "alla",
    "allo",
    "anche",
    "che",
    "chi",
    "con",
    "da",
    "dal",
    "dalla",
    "dello",
    "dei",
    "del",
    "della",
    "di",
    "e",
    "ed",
    "gli",
    "ha",
    "hanno",
    "i",
    "il",
    "in",
    "la",
    "le",
    "lo",
    "ma",
    "nel",
    "nella",
    "non",
    "o",
    "per",
    "piu",
    "più",
    "quale",
    "quali",
    "se",
    "si",
    "sia",
    "sono",
    "su",
    "tra",
    "un",
    "una",
}


def _format_search_result(result: dict[str, str], index: int) -> str:
    title = result.get("title") or "Senza titolo"
    snippet = result.get("snippet") or "Snippet non disponibile."
    link = result.get("link") or "Link non disponibile."
    return f"[{index}] {title}\nSnippet: {snippet}\nLink: {link}"


def _normalize_search_results(results: Any) -> list[dict[str, str]]:
    if not isinstance(results, list):
        return []

    normalized_results: list[dict[str, str]] = []
    for item in results:
        if not isinstance(item, dict):
            continue

        normalized_results.append(
            {
                "title": str(item.get("title", "")).strip(),
                "snippet": str(item.get("snippet", "")).strip(),
                "link": str(item.get("link", "")).strip(),
            }
        )

    return normalized_results


def _extract_sources(results: list[dict[str, str]]) -> list[str]:
    seen: set[str] = set()
    sources: list[str] = []

    for result in results:
        link = result.get("link", "").strip()
        if not link or link in seen:
            continue
        seen.add(link)
        sources.append(link)

    return sources


def _extract_llm_text(response: Any) -> str:
    content = response.content
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
            if not isinstance(part, dict) or part.get("type") != "thinking"
        )
    return str(content).strip()


def _fallback_search_query(query: str) -> str:
    words = re.findall(r"\w+", query.lower())
    keywords = [word for word in words if len(word) > 2 and word not in ITALIAN_STOPWORDS]
    selected_words = keywords[:6] or words[:6]
    return " ".join(selected_words).strip() or query.strip()


def _fallback_motivation(state: HiddenState) -> str:
    verdict = state["nli_label"]
    confidence_pct = round(state["confidence"] * 100, 1)
    verdict_text = {
        "SUPPORTS": "le evidenze recuperate sono coerenti con il claim",
        "REFUTES": "le evidenze recuperate contraddicono il claim",
        "NOT ENOUGH INFO": "le evidenze recuperate non bastano per una conclusione solida",
    }.get(verdict, "il sistema non ha prodotto un verdetto interpretabile")

    evidence_lines = state.get("retrieved_docs", [])[:2]
    evidence_text = "\n\n".join(evidence_lines) if evidence_lines else state["researches"]

    conclusion = {
        "SUPPORTS": "Nel complesso, la notizia risulta supportata dalle fonti trovate.",
        "REFUTES": "Nel complesso, la notizia risulta smentita dalle fonti trovate.",
        "NOT ENOUGH INFO": "Nel complesso, le fonti trovate non bastano per confermare o smentire la notizia.",
    }.get(verdict, "Nel complesso, serve una verifica manuale aggiuntiva.")

    return (
        "**Oggetto: Verifica della notizia**\n\n"
        f"Il verdetto del sistema e' **{verdict}** con una confidenza del {confidence_pct}%. "
        f"In termini pratici, significa che {verdict_text}.\n\n"
        "Le evidenze principali considerate dal sistema sono le seguenti:\n\n"
        f"{evidence_text}\n\n"
        "Questa spiegazione e' stata generata con il fallback locale perche' il modello LLM non e' configurato.\n\n"
        f"{conclusion}"
    )


def _map_model_label_to_verdict(model_label: str) -> str:
    normalized_label = model_label.strip().lower().replace(" ", "_")
    verdict_map = {
        "entailment": "SUPPORTS",
        "supports": "SUPPORTS",
        "support": "SUPPORTS",
        "contradiction": "REFUTES",
        "refutes": "REFUTES",
        "refute": "REFUTES",
        "neutral": "NOT ENOUGH INFO",
        "not_enough_info": "NOT ENOUGH INFO",
        "nei": "NOT ENOUGH INFO",
    }

    if normalized_label not in verdict_map:
        raise ValueError(f"Etichetta NLI del modello non riconosciuta: {model_label}")

    return verdict_map[normalized_label]


def _resolve_model_label(predicted_class_id: int) -> str:
    id2label = getattr(ml.nli_model.config, "id2label", {}) or {}
    model_label = id2label.get(predicted_class_id, id2label.get(str(predicted_class_id), ""))

    if model_label:
        return str(model_label)

    label2id = getattr(ml.nli_model.config, "label2id", {}) or {}
    for label, class_id in label2id.items():
        if class_id == predicted_class_id:
            return str(label)

    raise ValueError(f"Impossibile risolvere la label NLI per class_id={predicted_class_id}")


def refine_query_node(state: HiddenState):
    prompt = f"""
    Devi fare una ricerca su Google/DuckDuckGo per verificare la seguente notizia: "{state['query']}"
    Estrai solo le parole chiave essenziali o formula una query di ricerca ottimale (max 5-6 parole).
    Rispondi unicamente con la stringa di ricerca, senza formattazione o introduzioni.
    """
    if ml.llm is None:
        search_query = _fallback_search_query(state["query"])
    else:
        res = ml.llm.invoke(prompt)
        search_query = _extract_llm_text(res)

    print(f"[Refine Node] Query di ricerca generata: {search_query}")
    return {"search_query": search_query}


def search_node(state: HiddenState):
    search = DuckDuckGoSearchResults(output_format="list", num_results=5)
    raw_results = search.invoke(state["search_query"])
    normalized_results = _normalize_search_results(raw_results)
    retrieved_docs = [
        _format_search_result(result, index)
        for index, result in enumerate(normalized_results, start=1)
    ]
    researches = "\n\n".join(retrieved_docs) if retrieved_docs else "Nessun risultato trovato."
    sources = _extract_sources(normalized_results)

    print(
        f"[Search Node] Risultati estratti: {len(normalized_results)} documenti, "
        f"{len(sources)} fonti."
    )
    return {
        "researches": researches,
        "retrieved_docs": retrieved_docs,
        "sources": sources,
    }


def nli_classification_node(state: HiddenState):
    premise = state["researches"]
    hypothesis = state["query"]

    inputs = ml.tokenizer(
        premise,
        hypothesis,
        padding="max_length",
        truncation=True,
        max_length=256,
        return_tensors="pt",
    )
    inputs = {key: value.to(ml.device) for key, value in inputs.items()}

    with torch.no_grad():
        outputs = ml.nli_model(**inputs)

    logits = outputs.logits
    probs = torch.nn.functional.softmax(logits, dim=-1)
    predicted_class_id = logits.argmax().item()
    confidence = probs[0, predicted_class_id].item()
    model_label = _resolve_model_label(predicted_class_id)
    label = _map_model_label_to_verdict(model_label)
    print(
        f"[NLI Node] class_id={predicted_class_id}, model_label={model_label}, "
        f"verdict={label}, confidence={confidence}"
    )
    return {"nli_label": label, "confidence": confidence}


def generate_motivation_node(state: HiddenState):
    final_prompt = f"""
    Devi preparare il testo finale per un sistema di fact-checking.

    Claim dell'utente:
    "{state['query']}"

    Evidenze recuperate dal web:
    "{state['researches']}"

    Verdetto NLI:
    "{state['nli_label']}"

    Legenda del verdetto:
    - SUPPORTS = confermato dalle fonti
    - REFUTES = smentito dalle fonti
    - NOT ENOUGH INFO = dati insufficienti per una conclusione solida

    Scrivi in italiano una risposta professionale, chiara e logica.

    Vincoli obbligatori:
    - Non scrivere premesse meta come "ecco una proposta di risposta".
    - Apri con un titolo breve in markdown, per esempio: **Oggetto: Verifica della notizia ...**
    - Prosegui con 3-5 paragrafi brevi e ben collegati.
    - Spiega prima il verdetto, poi le evidenze principali, poi l'eventuale causa del malinteso se emerge.
    - Concludi con una frase finale netta e coerente con il verdetto.
    - Non inventare fatti non presenti nelle evidenze recuperate.
    - Mantieni un tono umano, non burocratico.
    """
    if ml.llm is None:
        motivation_text = _fallback_motivation(state)
    else:
        res = ml.llm.invoke(final_prompt)
        motivation_text = _extract_llm_text(res)
    final_response = (
        motivation_text
        + "\n\n---\n**Evidenza grezza recuperata dal web (DuckDuckGo):**\n"
        + state["researches"]
    )

    if state.get("sources"):
        final_response += "\n\n**Fonti:**\n" + "\n".join(
            f"- {source}" for source in state["sources"]
        )

    return {"motivation": motivation_text, "response": final_response}
