from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
from schemas import VerifyRequest, VerifyResponse, NliResult
from core.ml import init_models
from workflow.graph import create_workflow

load_dotenv()



workflow_app = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global workflow_app
    
    # Initialize ML models
    init_models()
    
    # Build LangGraph Workflow
    workflow_app = create_workflow()
    
    yield
    
    # Any cleanup can go here

app = FastAPI(title="AI Agent NLI API", lifespan=lifespan)

@app.post("/verify", response_model=VerifyResponse)
async def verify_news(request: VerifyRequest):
    if workflow_app is None:
        raise HTTPException(status_code=503, detail="Workflow non ancora inizializzato.")
    
    try:
        input_data = {"query": request.query}
        result = workflow_app.invoke(input_data)

        nli_verdict = result.get("nli_label", "NOT ENOUGH INFO")
        confidence = result.get("confidence", 0.0)
        explanation = result.get("motivation", result.get("response", ""))
        search_queries = [result.get("search_query")] if result.get("search_query") else []
        sources = result.get("sources", [])
        retrieved_docs = result.get("retrieved_docs", [])

        return VerifyResponse(
            verdict=nli_verdict,
            confidence=confidence,
            explanation=explanation,
            sources=sources,
            nli_results=[
                NliResult(
                    verdict=nli_verdict,
                    confidence=confidence,
                    premise=result.get("researches", ""),
                )
            ],
            search_queries=search_queries,
            retrieved_docs=retrieved_docs,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
