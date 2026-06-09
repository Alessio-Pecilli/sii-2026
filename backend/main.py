import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from graph import run_verification
from schemas import VerifyRequest, VerifyResponse

load_dotenv()

app = FastAPI(
    title="FactCheck-Agent API",
    description="API per la verifica delle notizie tramite RAG, NLI e LLM.",
    version="1.0.0",
)

allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/verify", response_model=VerifyResponse)
def verify(request: VerifyRequest) -> VerifyResponse:
    if not os.getenv("GOOGLE_API_KEY"):
        raise HTTPException(
            status_code=503,
            detail="GOOGLE_API_KEY non configurata. Imposta la variabile nel file .env del backend.",
        )

    try:
        return run_verification(request.query)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
