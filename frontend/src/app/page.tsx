"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import {
  Brain,
  ChevronDown,
  ExternalLink,
  FileText,
  FileUp,
  Loader2,
  Moon,
  Search,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { verifyNews, VerifyApiError } from "@/lib/api";
import {
  formatConfidence,
  getVerdictDisplay,
  idleDisplay,
  pipelineSteps,
} from "@/lib/verdict";
import type { PipelineStep, PipelineStepId, VerifyResponse } from "@/lib/types";

type Theme = "light" | "dark";

const MIN_QUERY_LENGTH = 10;

const stepIcons: Record<PipelineStepId, typeof Search> = {
  rag: Search,
  nli: Brain,
  llm: Sparkles,
};

export default function Home() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem("theme") === "dark" ? "dark" : "light";
  });
  const [newsText, setNewsText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>("idle");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [showNli, setShowNli] = useState(false);
  const pipelineTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      pipelineTimers.current.forEach(clearTimeout);
    };
  }, []);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const clearPipelineTimers = () => {
    pipelineTimers.current.forEach(clearTimeout);
    pipelineTimers.current = [];
  };

  const startPipelineAnimation = () => {
    clearPipelineTimers();
    const steps: PipelineStep[] = ["rag", "nli", "llm"];
    steps.forEach((step, index) => {
      const timer = setTimeout(() => setPipelineStep(step), index * 1400);
      pipelineTimers.current.push(timer);
    });
  };

  const handleFileSelection = async (incomingFiles: FileList | null) => {
    if (!incomingFiles) return;

    const selected = Array.from(incomingFiles);
    setFiles(selected);

    const textFiles = selected.filter(
      (file) => file.type === "text/plain" || file.name.endsWith(".txt"),
    );
    if (textFiles.length === 0) return;

    const contents = await Promise.all(textFiles.map((file) => file.text()));
    const merged = contents.join("\n\n").trim();
    if (merged) {
      setNewsText((prev) => (prev.trim() ? `${prev.trim()}\n\n${merged}` : merged));
    }
  };

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFileSelection(event.target.files);
  };

  const onDropFiles = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    void handleFileSelection(event.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const trimmedQuery = newsText.trim();
  const isQueryValid = trimmedQuery.length >= MIN_QUERY_LENGTH;
  const charCount = trimmedQuery.length;

  const verdictView = result ? getVerdictDisplay(result.verdict) : idleDisplay;
  const VerdictIcon = verdictView.Icon;

  const runVerification = async () => {
    if (!isQueryValid || isLoading) return;

    setError(null);
    setResult(null);
    setShowDocs(false);
    setShowNli(false);
    setIsLoading(true);
    setPipelineStep("rag");
    startPipelineAnimation();

    try {
      const response = await verifyNews({ query: trimmedQuery });
      clearPipelineTimers();
      setPipelineStep("done");
      setResult(response);
    } catch (err) {
      clearPipelineTimers();
      setPipelineStep("idle");
      if (err instanceof VerifyApiError) {
        setError(err.message);
      } else {
        setError("Errore imprevisto durante la verifica.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getStepStatus = (stepId: PipelineStep) => {
    const order: PipelineStep[] = ["rag", "nli", "llm", "done"];
    const current = pipelineStep === "idle" ? -1 : order.indexOf(pipelineStep);
    const stepIndex = order.indexOf(stepId);
    if (current > stepIndex) return "done";
    if (current === stepIndex) return "active";
    return "pending";
  };

  return (
    <div className="bg-mesh min-h-screen text-slate-900 transition-colors dark:text-slate-100">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 p-4 md:gap-6 md:p-8">
        {/* Header */}
        <header className="flex items-center justify-between animate-fade-in-up">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-500/25">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-indigo-600 dark:text-indigo-400">
                FactCheck Agent
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              Verifica rapida notizia
            </h1>
            <p className="mt-1 max-w-lg text-sm text-slate-500 dark:text-slate-400">
              Pipeline RAG + NLI + LLM per analizzare la credibilità di un claim giornalistico.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur transition hover:bg-white dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Cambia tema"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>

        <div className="grid flex-1 gap-5 lg:grid-cols-2 lg:gap-6">
          {/* Input panel */}
          <section className="glass-card animate-fade-in-up rounded-2xl border border-slate-200/80 p-5 shadow-xl shadow-slate-200/40 dark:border-slate-700/60 dark:shadow-black/20 md:p-6">
            <label htmlFor="news-input" className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Testo della notizia
            </label>
            <textarea
              id="news-input"
              value={newsText}
              onChange={(event) => setNewsText(event.target.value)}
              placeholder="Scrivi o incolla la notizia da verificare (minimo 10 caratteri)..."
              disabled={isLoading}
              className="mt-2 h-36 w-full resize-none rounded-xl border border-slate-200 bg-white/60 p-4 text-sm leading-relaxed outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950/50 dark:focus:border-indigo-500"
            />

            <div className="mt-2 flex items-center justify-between text-xs">
              <span
                className={
                  charCount > 0 && !isQueryValid
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-400"
                }
              >
                {charCount > 0 && !isQueryValid
                  ? `Ancora ${MIN_QUERY_LENGTH - charCount} caratteri`
                  : `${charCount} caratteri`}
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDropFiles}
                className={`inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-sm transition ${
                  isDragOver
                    ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/30"
                    : "border-slate-300 bg-slate-50/80 dark:border-slate-600 dark:bg-slate-900/50"
                } ${isLoading ? "pointer-events-none opacity-50" : ""}`}
              >
                <input
                  type="file"
                  multiple
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={onFileInputChange}
                  disabled={isLoading}
                />
                <FileUp className="h-4 w-4 text-slate-500" />
                <span>Allega .txt</span>
              </label>

              <button
                type="button"
                onClick={() => void runVerification()}
                disabled={!isQueryValid || isLoading}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analisi in corso...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Verifica
                  </>
                )}
              </button>
            </div>

            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 rounded-lg bg-slate-100/80 px-3 py-1.5 text-xs dark:bg-slate-800/60"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label={`Rimuovi ${file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </div>
            )}
          </section>

          {/* Results panel */}
          <section className="glass-card animate-fade-in-up flex flex-col rounded-2xl border border-slate-200/80 p-5 shadow-xl shadow-slate-200/40 dark:border-slate-700/60 dark:shadow-black/20 md:p-6">
            {/* Pipeline stepper */}
            {(isLoading || pipelineStep === "done") && (
              <div className="mb-5">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pipeline
                </p>
                <div className="flex items-center gap-2">
                  {pipelineSteps.map((step, index) => {
                    const status = getStepStatus(step.id);
                    const StepIcon = stepIcons[step.id];
                    return (
                      <div key={step.id} className="flex flex-1 items-center gap-2">
                        <div
                          className={`flex flex-1 flex-col items-center rounded-xl border px-2 py-2.5 transition-all ${
                            status === "active"
                              ? "animate-step-pulse border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/40"
                              : status === "done"
                                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                                : "border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30"
                          }`}
                        >
                          <StepIcon
                            className={`h-4 w-4 ${
                              status === "active"
                                ? "text-indigo-600 dark:text-indigo-400"
                                : status === "done"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-slate-400"
                            }`}
                          />
                          <span className="mt-1 text-[10px] font-medium uppercase tracking-wide">
                            {step.label}
                          </span>
                        </div>
                        {index < pipelineSteps.length - 1 && (
                          <div
                            className={`h-0.5 w-3 shrink-0 rounded ${
                              getStepStatus(pipelineSteps[index + 1].id) !== "pending"
                                ? "bg-emerald-400"
                                : "bg-slate-200 dark:bg-slate-700"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Verdict hero */}
            <div
              className={`flex flex-col items-center rounded-2xl border p-6 text-center transition-all ${verdictView.bgClass} ${verdictView.borderClass} ${
                result ? `ring-4 ${verdictView.ringClass}` : ""
              }`}
            >
              <div
                className={`mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${
                  result ? "animate-pulse-ring" : ""
                } ${verdictView.bgClass}`}
              >
                <VerdictIcon className={`h-9 w-9 ${verdictView.colorClass}`} />
              </div>
              <p className={`text-xl font-bold tracking-tight md:text-2xl ${verdictView.colorClass}`}>
                {verdictView.label}
              </p>

              {result && (
                <div className="mt-4 w-full max-w-xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Confidenza</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-200">
                      {formatConfidence(result.confidence)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        result.verdict === "SUPPORTS"
                          ? "bg-emerald-500"
                          : result.verdict === "REFUTES"
                            ? "bg-rose-500"
                            : "bg-amber-500"
                      } ${isLoading ? "shimmer-bar" : ""}`}
                      style={{ width: `${Math.round(result.confidence * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Explanation & sources */}
            <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
              <div className="rounded-xl border border-slate-200/80 bg-white/50 p-4 dark:border-slate-700/60 dark:bg-slate-950/30">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Analisi
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {result?.explanation ??
                    "Incolla una notizia e avvia l'analisi per visualizzare motivazioni e fonti di supporto."}
                </p>
              </div>

              {result && result.sources && result.sources.length > 0 && (
                <div className="rounded-xl border border-slate-200/80 bg-white/50 p-4 dark:border-slate-700/60 dark:bg-slate-950/30">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Fonti ({result.sources.length})
                  </p>
                  <ul className="mt-2 space-y-2">
                    {result.sources.map((source, index) => {
                      const isUrl = source.startsWith("http");
                      return (
                        <li key={`${source}-${index}`} className="flex items-start gap-2 text-sm">
                          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                          {isUrl ? (
                            <a
                              href={source}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-indigo-600 hover:underline dark:text-indigo-400"
                            >
                              {source}
                            </a>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400">{source}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {result && result.nli_results && result.nli_results.length > 0 && (
                <div className="rounded-xl border border-slate-200/80 bg-white/50 dark:border-slate-700/60 dark:bg-slate-950/30">
                  <button
                    type="button"
                    onClick={() => setShowNli((prev) => !prev)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Risultati NLI ({result.nli_results.length})
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform ${showNli ? "rotate-180" : ""}`}
                    />
                  </button>
                  {showNli && (
                    <div className="space-y-2 border-t border-slate-200/80 px-4 pb-4 dark:border-slate-700/60">
                      {result.nli_results.map((nli, index) => {
                        const nliView = getVerdictDisplay(nli.verdict);
                        return (
                          <div
                            key={index}
                            className={`rounded-lg border p-3 text-xs ${nliView.borderClass} ${nliView.bgClass}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-medium ${nliView.colorClass}`}>
                                {nliView.shortLabel}
                              </span>
                              <span className="font-mono text-slate-500">
                                {formatConfidence(nli.confidence)}
                              </span>
                            </div>
                            {nli.premise && (
                              <p className="mt-1.5 line-clamp-3 text-slate-600 dark:text-slate-400">
                                {nli.premise}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {result && result.retrieved_docs && result.retrieved_docs.length > 0 && (
                <div className="rounded-xl border border-slate-200/80 bg-white/50 dark:border-slate-700/60 dark:bg-slate-950/30">
                  <button
                    type="button"
                    onClick={() => setShowDocs((prev) => !prev)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Documenti recuperati ({result.retrieved_docs.length})
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform ${showDocs ? "rotate-180" : ""}`}
                    />
                  </button>
                  {showDocs && (
                    <div className="space-y-2 border-t border-slate-200/80 px-4 pb-4 dark:border-slate-700/60">
                      {result.retrieved_docs.map((doc, index) => (
                        <p
                          key={index}
                          className="rounded-lg bg-slate-100/80 p-3 font-mono text-[11px] leading-relaxed text-slate-600 dark:bg-slate-800/50 dark:text-slate-400"
                        >
                          {doc}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="pb-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
          Powered by RAG · NLI · Gemini LLM
        </footer>
      </main>
    </div>
  );
}
