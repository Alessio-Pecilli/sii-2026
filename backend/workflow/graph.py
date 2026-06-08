from langgraph.graph import StateGraph, START, END
from models.state import InputState, HiddenState, OutputState
from workflow.nodes import refine_query_node, search_node, nli_classification_node, generate_motivation_node

def create_workflow():
    workflow = StateGraph(state_schema=HiddenState, input_schema=InputState, output_schema=OutputState)
    
    workflow.add_node("refine_query", refine_query_node)
    workflow.add_node("search_web", search_node)
    workflow.add_node("nli_classification", nli_classification_node)
    workflow.add_node("generate_motivation", generate_motivation_node)

    workflow.add_edge(START, "refine_query")
    workflow.add_edge("refine_query", "search_web")
    workflow.add_edge("search_web", "nli_classification")
    workflow.add_edge("nli_classification", "generate_motivation")
    workflow.add_edge("generate_motivation", END)

    return workflow.compile()
