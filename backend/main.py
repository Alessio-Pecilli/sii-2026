from fastapi import FastAPI, HTTPException
from contextlib import asynccontextmanager

from models.api import QueryRequest, QueryResponse
from core.ml import init_models
from workflow.graph import create_workflow

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

@app.post("/verify", response_model=QueryResponse)
async def verify_news(request: QueryRequest):
    if workflow_app is None:
        raise HTTPException(status_code=503, detail="Workflow non ancora inizializzato.")
    
    try:
        input_data = {"query": request.query}
        result = workflow_app.invoke(input_data)
        return QueryResponse(response=result['response'])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
