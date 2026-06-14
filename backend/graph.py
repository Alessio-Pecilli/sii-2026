import json
import os
import re
from typing import Any, TypedDict

from langchain_community.tools import DuckDuckGoSearchRun
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, START, StateGraph

from schemas import NliResult, NliVerdict, VerifyResponse


class InputState(TypedDict):
    query: str


class HiddenState(TypedDict):
    query: str
    researches: list[Any]
    response: str


class OutputState(TypedDict):
    response: str


def _get_llm() -> ChatGoogleGenerativeAI:
    model = os.getenv("GEMINI_MODEL", "gemma-4-31b-it")
    return ChatGoogleGenerativeAI(model=model)


def search_node(state: HiddenState) -> dict[str, list[Any]]:
    search = DuckDuckGoSearchRun()
    results = search.invoke(state["query"])
    return {"researches": [results]}


def generate_answer(state: HiddenState) -> dict[str, str]:
    llm = _get_llm()
    final_prompt = f"""
Analizza se questa notizia è attendibile in modo professionale.
News utente: {state["query"]}
Risultati ricerche: {state["researches"]}

Rispondi SOLO con un JSON valido (senza markdown) con questa struttura:
{{
  "verdict": "SUPPORTS" | "NOT ENOUGH INFO" | "REFUTES",
  "confidence": 0.0-1.0,
  "explanation": "spiegazione dettagliata in italiano",
  "sources": ["url o titolo fonte", ...]
}}
"""
    res = llm.invoke(final_prompt)
    return {"response": res.content}


def _extract_urls(text: str) -> list[str]:
    return re.findall(r"https?://[^\s\])\"']+", text)


def _parse_llm_payload(raw: str) -> dict[str, Any]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {
            "verdict": "NOT ENOUGH INFO",
            "confidence": 0.5,
            "explanation": raw,
            "sources": _extract_urls(raw),
        }


def _normalize_verdict(value: str) -> NliVerdict:
    normalized = value.strip().upper()
    if normalized in {"SUPPORTS", "TRUE", "VERA", "VERO"}:
        return NliVerdict.SUPPORTS
    if normalized in {"REFUTES", "FALSE", "FALSA", "FALSO"}:
        return NliVerdict.REFUTES
    return NliVerdict.NOT_ENOUGH_INFO


def build_verify_response(query: str, researches: list[Any], raw_response: str) -> VerifyResponse:
    payload = _parse_llm_payload(raw_response)
    verdict = _normalize_verdict(str(payload.get("verdict", "NOT ENOUGH INFO")))
    confidence = float(payload.get("confidence", 0.5))
    explanation = str(payload.get("explanation", raw_response))
    sources = [str(source) for source in payload.get("sources", []) if source]

    retrieved_docs = [str(item) for item in researches if item]
    if not sources:
        sources = _extract_urls("\n".join(retrieved_docs))

    nli_results = [
        NliResult(
            verdict=verdict,
            confidence=confidence,
            premise=retrieved_docs[0][:500] if retrieved_docs else "",
        )
    ]

    return VerifyResponse(
        verdict=verdict,
        confidence=confidence,
        explanation=explanation,
        sources=sources[:8],
        nli_results=nli_results,
        search_queries=[query],
        retrieved_docs=retrieved_docs,
    )


def compile_graph():
    workflow = StateGraph(
        state_schema=HiddenState,
        input_schema=InputState,
        output_schema=OutputState,
    )
    workflow.add_node("search_news", search_node)
    workflow.add_node("response", generate_answer)
    workflow.add_edge(START, "search_news")
    workflow.add_edge("search_news", "response")
    workflow.add_edge("response", END)
    return workflow.compile()


def run_verification(query: str) -> VerifyResponse:
    app = compile_graph()
    result = app.invoke({"query": query})
    researches = result.get("researches", [])
    return build_verify_response(query, researches, result.get("response", ""))
