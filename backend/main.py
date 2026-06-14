from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException

from core.ml import init_models
from models.schemas import VerifyRequest, VerifyResponse, NliResult
from workflow.graph import create_workflow

load_dotenv(Path(__file__).resolve().with_name(".env"))

workflow_app: Any | None = None


def _normalize_str_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if item is not None]


def _build_verify_response(result: dict[str, Any]) -> VerifyResponse:
    nli_verdict = result.get("nli_label", "NOT ENOUGH INFO")
    confidence = float(result.get("confidence", 0.0) or 0.0)
    explanation = str(result.get("motivation") or result.get("response") or "")
    premise = str(result.get("researches") or "")
    search_query = result.get("search_query")

    return VerifyResponse(
        verdict=nli_verdict,
        confidence=confidence,
        explanation=explanation,
        sources=_normalize_str_list(result.get("sources")),
        nli_results=[
            NliResult(
                verdict=nli_verdict,
                confidence=confidence,
                premise=premise,
            )
        ],
        search_queries=[str(search_query)] if search_query else [],
        retrieved_docs=_normalize_str_list(result.get("retrieved_docs")),
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    global workflow_app

    init_models()
    workflow_app = create_workflow()

    yield

app = FastAPI(title="AI Agent NLI API", lifespan=lifespan)


@app.post("/verify", response_model=VerifyResponse)
async def verify_news(request: VerifyRequest) -> VerifyResponse:
    if workflow_app is None:
        raise HTTPException(status_code=503, detail="Workflow non ancora inizializzato.")

    try:
        result = workflow_app.invoke({"query": request.query})
        return _build_verify_response(result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
