import re
from typing import Any

import torch
from langchain_community.tools import DuckDuckGoSearchResults

import core.ml as ml
from models.state import HiddenState

ITALIAN_STOPWORDS = {
    "a", "ad", "al", "alla", "allo", "anche", "che", "chi", "con", "da", "dal",
    "dalla", "dello", "dei", "del", "della", "di", "e", "ed", "gli", "ha",
    "hanno", "i", "il", "in", "la", "le", "lo", "ma", "nel", "nella", "non",
    "o", "per", "piu", "più", "quale", "quali", "se", "si", "sia", "sono",
    "su", "tra", "un", "una",
}


def _format_search_result(result: dict[str, str], index: int) -> str:
    """Formats a single normalized search result into a readable markdown snippet.

    Args:
        result: A dictionary containing title, snippet, and link keys.
        index: The index of the search result.

    Returns:
        A formatted string with index, title, snippet, and link.
    """
    title = result.get("title") or "Senza titolo"
    snippet = result.get("snippet") or "Snippet non disponibile."
    link = result.get("link") or "Link non disponibile."
    return f"[{index}] {title}\nSnippet: {snippet}\nLink: {link}"


def _normalize_search_results(results: Any) -> list[dict[str, str]]:
    """Normalizes raw search results from DuckDuckGo into a standard dictionary format.

    Args:
        results: Raw results, typically a list of dictionaries from the search tool.

    Returns:
        A list of dictionaries with normalized keys (title, snippet, link).
    """
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
    """Extracts unique source URLs from the normalized search results.

    Args:
        results: Normalized search results list.

    Returns:
        A list of unique source links.
    """
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
    """Extracts and cleans text content from the LLM invocation response.

    Args:
        response: The response object from ChatGoogleGenerativeAI invocation.

    Returns:
        The extracted and cleaned string.
    """
    content = response.content
    if isinstance(content, list):
        content = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
            if not isinstance(part, dict) or part.get("type") != "thinking"
        )
    return str(content).strip()


def _format_confidence_percentage(value: float) -> str:
    """Converts a confidence probability to a percentage string.

    Args:
        value: Float probability between 0.0 and 1.0.

    Returns:
        A formatted string like '85.4%'.
    """
    return f"{round(value * 100, 1)}%"


def _format_sources_for_prompt(sources: list[str]) -> str:
    """Formats a list of sources for inclusion in the LLM final prompt.

    Args:
        sources: A list of source URLs.

    Returns:
        A markdown bulleted list of sources.
    """
    if not sources:
        return "- Nessuna fonte strutturata disponibile."
    return "\n".join(f"- {source}" for source in sources)


def _build_verdict_probabilities(probabilities: torch.Tensor) -> dict[str, float]:
    """Aggregates raw model probabilities into FEVER verdict categories.

    Args:
        probabilities: PyTorch tensor containing predicted probabilities.

    Returns:
        A dictionary mapping 'SUPPORTS', 'REFUTES', and 'NOT ENOUGH INFO' to probabilities.
    """
    verdict_probabilities = {
        "SUPPORTS": 0.0,
        "REFUTES": 0.0,
        "NOT ENOUGH INFO": 0.0,
    }

    for class_id, probability in enumerate(probabilities[0].tolist()):
        model_label = _resolve_model_label(class_id)
        verdict = _map_model_label_to_verdict(model_label)
        verdict_probabilities[verdict] += float(probability)

    return verdict_probabilities


def _format_verdict_probabilities(verdict_probabilities: dict[str, float]) -> str:
    """Formats verdict probabilities into a single comma-separated string.

    Args:
        verdict_probabilities: Dictionary of verdict probabilities.

    Returns:
        A string like 'SUPPORTS=80%, REFUTES=15%, NOT ENOUGH INFO=5%'.
    """
    verdict_order = ["SUPPORTS", "REFUTES", "NOT ENOUGH INFO"]
    return ", ".join(
        f"{verdict}={_format_confidence_percentage(verdict_probabilities.get(verdict, 0.0))}"
        for verdict in verdict_order
    )


def _build_technical_summary(state: HiddenState) -> str:
    """Builds a technical summary markdown string containing NLI metrics.

    Args:
        state: The HiddenState containing NLI results.

    Returns:
        A formatted technical summary string.
    """
    verdict = state["nli_label"]
    confidence = _format_confidence_percentage(state["confidence"])
    model_label = state.get("nli_model_label", "n/d")
    class_id = state.get("nli_class_id", "n/d")
    verdict_probabilities = state.get("verdict_probabilities", {})
    probabilities_text = _format_verdict_probabilities(verdict_probabilities)

    return (
        f"**Verdetto tecnico:** {verdict}. "
        f"**Confidenza NLI:** {confidence}. "
        f"**Classe raw del modello:** {model_label} (id={class_id}). "
        f"**Distribuzione:** {probabilities_text}."
    )


def _prepend_technical_summary(text: str, state: HiddenState) -> str:
    """Prepends the technical NLI classification metrics summary to the LLM response.

    Args:
        text: The original response from the LLM.
        state: The HiddenState with NLI results.

    Returns:
        The text with prepended technical summary.
    """
    summary = _build_technical_summary(state)
    if text.startswith(summary):
        return text
    return summary + "\n\n" + text.strip()


def _fallback_search_query(query: str) -> str:
    """Extracts keywords from query to form a search string (fallback when LLM is unavailable).

    Args:
        query: The user's original query.

    Returns:
        A simplified search query string.
    """
    words = re.findall(r"\w+", query.lower())
    keywords = [word for word in words if len(word) > 2 and word not in ITALIAN_STOPWORDS]
    selected_words = keywords[:6] or words[:6]
    return " ".join(selected_words).strip() or query.strip()


def _fallback_motivation(state: HiddenState) -> str:
    """Generates a structured fact-checking explanation (fallback when LLM is unavailable).

    Args:
        state: The HiddenState containing the query, researches, and NLI verdict.

    Returns:
        A markdown-formatted final response text.
    """
    verdict = state["nli_label"]
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
        f"{_build_technical_summary(state)}\n\n"
        f"Il verdetto del sistema e' **{verdict}** con una confidenza del {_format_confidence_percentage(state['confidence'])}. "
        f"In termini pratici, significa che {verdict_text}.\n\n"
        "Le evidenze principali considerate dal sistema sono le seguenti:\n\n"
        f"{evidence_text}\n\n"
        "Questa spiegazione e' stata generata con il fallback locale perche' il modello LLM non e' configurato.\n\n"
        f"{conclusion}"
    )


def _map_model_label_to_verdict(model_label: str) -> str:
    """Maps NLI model class labels (e.g. entailment, neutral, contradiction) to FEVER space labels.

    Args:
        model_label: Model config label string.

    Returns:
        One of 'SUPPORTS', 'REFUTES', or 'NOT ENOUGH INFO'.
    """
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
    """Resolves predicted class integer ID to a label string using the model configuration.

    Args:
        predicted_class_id: Int class predicted by the classifier.

    Returns:
        The class label string.
    """
    if ml.nli_model is None:
        raise RuntimeError("Modello NLI non inizializzato in core.ml.")

    id2label = getattr(ml.nli_model.config, "id2label", {}) or {}
    model_label = id2label.get(predicted_class_id, id2label.get(str(predicted_class_id), ""))

    if model_label:
        return str(model_label)

    label2id = getattr(ml.nli_model.config, "label2id", {}) or {}
    for label, class_id in label2id.items():
        if class_id == predicted_class_id:
            return str(label)

    raise ValueError(f"Impossibile risolvere la label NLI per class_id={predicted_class_id}")


def refine_query_node(state: HiddenState) -> dict[str, Any]:
    """Generates a neutral search query for Google/DuckDuckGo from the user claim.

    Args:
        state: The HiddenState containing 'query'.

    Returns:
        A dictionary containing the generated 'search_query'.
    """
    prompt = f"""
    Genera una query di ricerca neutrale per Google/DuckDuckGo a partire da questo testo: "{state['query']}"
    Mantieni solo i termini informativi essenziali, come nomi propri, luoghi, date, enti o evento principale.
    Non aggiungere parole che suggeriscano un esito, una verifica o un giudizio, come "vero", "falso", "bufala", "smentita" o simili.
    Se utile, riformula in modo breve e generico senza cambiare il significato.
    Lunghezza massima: 5-6 parole.
    Rispondi solo con la query, senza virgolette, formattazione o testo aggiuntivo.
    """
    if ml.llm is None:
        search_query = _fallback_search_query(state["query"])
    else:
        res = ml.llm.invoke(prompt)
        search_query = _extract_llm_text(res)

    print(f"[Refine Node] Query di ricerca generata: {search_query}")
    return {"search_query": search_query}


def search_node(state: HiddenState) -> dict[str, Any]:
    """Searches the web for evidence relative to the search query.

    Args:
        state: The HiddenState containing 'search_query'.

    Returns:
        A dictionary with 'researches', 'retrieved_docs', and 'sources'.
    """
    retrieved_docs: list[str] = []
    sources: list[str] = []
    researches = "Nessun risultato trovato a causa di un errore di connessione."

    try:
        search = DuckDuckGoSearchResults(output_format="list", num_results=5)
        raw_results = search.invoke(state["search_query"])
        normalized_results = _normalize_search_results(raw_results)
        retrieved_docs = [
            _format_search_result(result, index)
            for index, result in enumerate(normalized_results, start=1)
        ]
        researches = "\n\n".join(retrieved_docs) if retrieved_docs else "Nessun risultato trovato."
        sources = _extract_sources(normalized_results)
    except Exception as e:
        print(f"[Search Node] Errore durante la ricerca sul web: {e}")

    print(
        f"[Search Node] Risultati estratti: {len(retrieved_docs)} documenti, "
        f"{len(sources)} fonti."
    )
    return {
        "researches": researches,
        "retrieved_docs": retrieved_docs,
        "sources": sources,
    }


def nli_classification_node(state: HiddenState) -> dict[str, Any]:
    """Compares web evidence against the original claim using the NLI sequence classifier.

    Args:
        state: The HiddenState containing 'researches' (Premise) and 'query' (Hypothesis).

    Returns:
        A dictionary mapping NLI verdict, confidence, and internal model predictions.
    """
    premise = state["researches"]
    hypothesis = state["query"]

    if ml.tokenizer is None or ml.nli_model is None:
        raise RuntimeError(
            "Modello NLI o Tokenizer non inizializzati in core.ml. Assicurati di chiamare init_models() prima dell'esecuzione."
        )

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
    verdict_probabilities = _build_verdict_probabilities(probs)

    print(
        f"[NLI Node] class_id={predicted_class_id}, model_label={model_label}, "
        f"verdict={label}, confidence={confidence}, "
        f"distribution={verdict_probabilities}"
    )
    return {
        "nli_label": label,
        "confidence": confidence,
        "nli_model_label": model_label,
        "nli_class_id": predicted_class_id,
        "verdict_probabilities": verdict_probabilities,
    }


def generate_motivation_node(state: HiddenState) -> dict[str, Any]:
    """Generates the final natural language explanation response via the LLM.

    Args:
        state: The HiddenState containing claim, NLI classifications, and sources.

    Returns:
        A dictionary containing the generated 'motivation' and final 'response'.
    """
    confidence_text = _format_confidence_percentage(state["confidence"])
    sources_text = _format_sources_for_prompt(state.get("sources", []))
    probabilities_text = _format_verdict_probabilities(state.get("verdict_probabilities", {}))
    final_prompt = f"""
    Devi preparare il testo finale per un sistema di fact-checking.

    Claim dell'utente:
    "{state['query']}"

    Evidenze recuperate dal web:
    "{state['researches']}"

    Verdetto NLI:
    "{state['nli_label']}"

    Confidenza NLI:
    "{confidence_text}"

    Classe tecnica raw del modello:
    "{state.get('nli_model_label', 'n/d')}"

    Distribuzione delle probabilita aggregate per verdetto:
    "{probabilities_text}"

    Fonti candidate da citare solo se coerenti con le evidenze:
    {sources_text}

    Legenda del verdetto:
    - SUPPORTS = confermato dalle fonti
    - REFUTES = smentito dalle fonti
    - NOT ENOUGH INFO = dati insufficienti per una conclusione solida

    Scrivi in italiano una risposta professionale, chiara e logica.

    Vincoli obbligatori:
    - Non scrivere premesse meta come "ecco una proposta di risposta".
    - Apri con un titolo breve in markdown, per esempio: **Oggetto: Verifica della notizia ...**
    - Subito dopo il titolo dichiara esplicitamente il verdetto NLI esatto, senza riformularlo in senso opposto.
    - Prosegui con 3-5 paragrafi brevi e ben collegati.
    - Spiega prima il verdetto, poi le evidenze principali, poi l'eventuale causa del malinteso se emerge.
    - Devi spiegare il verdetto NLI, non ricalcolarlo e non contraddirlo.
    - Se il verdetto e' REFUTES non usare formule che implichino conferma; se e' SUPPORTS non usare formule che implichino smentita.
    - Se la confidenza non e' alta, puoi esprimere cautela ma devi restare coerente con il verdetto NLI.
    - Cita in modo sobrio 1-3 fonti, ma solo se presenti nelle fonti candidate o nelle evidenze recuperate.
    - Concludi con una frase finale netta e coerente con il verdetto.
    - Non inventare fatti non presenti nelle evidenze recuperate.
    - Mantieni un tono umano, non burocratico.
    """
    if ml.llm is None:
        motivation_text = _fallback_motivation(state)
    else:
        res = ml.llm.invoke(final_prompt)
        motivation_text = _prepend_technical_summary(_extract_llm_text(res), state)

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
