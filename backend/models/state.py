from typing import TypedDict

class InputState(TypedDict):
    query: str

class HiddenState(TypedDict):
    query: str
    search_query: str
    researches: str
    nli_label: str
    motivation: str
    response: str

class OutputState(TypedDict):
    response: str
