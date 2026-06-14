from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class NliVerdict(str, Enum):
    SUPPORTS = "SUPPORTS"
    NOT_ENOUGH_INFO = "NOT ENOUGH INFO"
    REFUTES = "REFUTES"


class VerifyRequest(BaseModel):
    query: str = Field(..., min_length=10, max_length=2000)


class NliResult(BaseModel):
    verdict: NliVerdict
    confidence: float = Field(..., ge=0.0, le=1.0)
    premise: str = ""


class VerifyResponse(BaseModel):
    verdict: NliVerdict
    confidence: float = Field(..., ge=0.0, le=1.0)
    explanation: str
    sources: list[str]
    nli_results: list[NliResult]
    search_queries: list[str] = Field(default_factory=list)
    retrieved_docs: list[str] = Field(default_factory=list)
