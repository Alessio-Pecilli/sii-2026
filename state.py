class AgentState(TypedDict):
    input: str
    search_queries: list[str]
    retrieved_docs: list[str]
    nli_results: list[dict] # {verdict: "REFUTES/SUPPORTS", confidence: 0.98}
    final_response: str