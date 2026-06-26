from typing import TypedDict


class InputState(TypedDict):
    query: str


class HiddenState(TypedDict):
    query: str
    search_query: str
    researches: str
    sources: list[str]
    retrieved_docs: list[str]
    nli_label: str
    confidence: float
    nli_model_label: str
    nli_class_id: int
    verdict_probabilities: dict[str, float]
    motivation: str
    response: str


class OutputState(TypedDict):
    query: str
    search_query: str
    researches: str
    sources: list[str]
    retrieved_docs: list[str]
    nli_label: str
    confidence: float
    nli_model_label: str
    nli_class_id: int
    verdict_probabilities: dict[str, float]
    motivation: str
    response: str
