export type NliVerdict = "SUPPORTS" | "NOT ENOUGH INFO" | "REFUTES";

export type NliResult = {
  verdict: NliVerdict;
  confidence: number;
  premise: string;
};

export type VerifyRequest = {
  query: string;
};

export type VerifyResponse = {
  verdict: NliVerdict;
  confidence: number;
  explanation: string;
  sources: string[];
  nli_results: NliResult[];
  search_queries: string[];
  retrieved_docs: string[];
};

export type PipelineStepId = "rag" | "nli" | "llm";
export type PipelineStep = "idle" | PipelineStepId | "done";
