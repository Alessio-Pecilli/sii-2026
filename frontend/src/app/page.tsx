"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, FileUp, Moon, Search, Sun, X } from "lucide-react";
import { InsightColumn } from "@/components/InsightColumn";
import { verifyNews, VerifyApiError } from "@/lib/api";
import { loadingStages, pipelineSteps } from "@/lib/verdict";
import type { PipelineStep, PipelineStepId, VerifyResponse } from "@/lib/types";

const MIN_QUERY_LENGTH = 10;

const examples = [
  "L'intelligenza artificiale sostituirà il 40% dei lavori entro il 2030.",
  "Il governo italiano ha annunciato nuove misure fiscali per il 2026.",
  "Uno studio dimostra che il caffè riduce il rischio di demenza del 60%.",
];

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    return window.localStorage.getItem("theme") === "dark" ? "dark" : "light";
  });
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<PipelineStep>("idle");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadStage, setLoadStage] = useState(loadingStages[0].label);
  const [loadProgress, setLoadProgress] = useState(5);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadStart = useRef(0);
  const stageIdx = useRef(0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    if (interval.current) clearInterval(interval.current);
  }, []);

  const query = text.trim();
  const valid = query.length >= MIN_QUERY_LENGTH;

  const stepStatus = (id: PipelineStepId) => {
    const order: PipelineStep[] = ["rag", "nli", "llm", "done"];
    const cur = step === "idle" ? -1 : order.indexOf(step);
    const idx = order.indexOf(id);
    if (cur > idx) return "done";
    if (cur === idx) return "active";
    return "";
  };

  const statusLabel = loading
    ? "Analisi in corso…"
    : result
      ? "Report pronto"
      : query && !valid
        ? `Minimo ${MIN_QUERY_LENGTH} caratteri`
        : "Pronto";

  const statusClass = loading ? "thinking" : query && !valid ? "waiting" : "";

  const pickFiles = async (list: FileList | null) => {
    if (!list) return;
    setFiles(Array.from(list));
    const txts = Array.from(list).filter((f) => f.type === "text/plain" || f.name.endsWith(".txt"));
    if (!txts.length) return;
    const merged = (await Promise.all(txts.map((f) => f.text()))).join("\n\n").trim();
    if (merged) setText((p) => (p.trim() ? `${p.trim()}\n\n${merged}` : merged));
  };

  const run = async () => {
    if (!valid || loading) return;
    setError(null);
    setResult(null);
    setLoading(true);
    setStep("rag");
    timers.current.forEach(clearTimeout);
    (["rag", "nli", "llm"] as PipelineStepId[]).forEach((s, i) => {
      timers.current.push(setTimeout(() => setStep(s), i * 1400));
    });

    loadStart.current = performance.now();
    stageIdx.current = 0;
    setLoadStage(loadingStages[0].label);
    setLoadProgress(5);
    if (interval.current) clearInterval(interval.current);
    interval.current = setInterval(() => {
      const elapsed = (performance.now() - loadStart.current) / 1000;
      const target = loadingStages[stageIdx.current];
      setLoadProgress((p) => Math.min(target.progress, p + 2));
      if (elapsed > (stageIdx.current + 1) * 2.5 && stageIdx.current < loadingStages.length - 1) {
        stageIdx.current++;
        setLoadStage(loadingStages[stageIdx.current].label);
      }
    }, 150);

    try {
      const res = await verifyNews({ query });
      timers.current.forEach(clearTimeout);
      setStep("done");
      setResult(res);
      setLoadProgress(100);
    } catch (e) {
      timers.current.forEach(clearTimeout);
      setStep("idle");
      setError(e instanceof VerifyApiError ? e.message : "Errore imprevisto.");
    } finally {
      if (interval.current) clearInterval(interval.current);
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <section className="input-column">
        <header className="page-header">
          <div>
            <h1 className="brand-title">FactCheck</h1>
            <p className="brand-sub">Verifica automatica delle notizie</p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Cambia tema"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </header>

        <label className="field-label" htmlFor="claim">
          Notizia da verificare
        </label>
        <textarea
          id="claim"
          className="news-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Incolla qui il testo della notizia…"
          disabled={loading}
        />

        <div className={`input-meta ${query && !valid ? "warn" : ""}`}>
          <span>{query.length} caratteri</span>
          {query && !valid && <span>Ancora {MIN_QUERY_LENGTH - query.length}</span>}
        </div>

        <div className="toolbar">
          <label
            className="btn btn-ghost"
            style={{ cursor: "pointer", borderColor: isDragOver ? "var(--primary)" : undefined }}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); void pickFiles(e.dataTransfer.files); }}
          >
            <input
              type="file"
              multiple
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => void pickFiles(e.target.files)}
              disabled={loading}
            />
            <FileUp size={16} />
            Allega file
          </label>
          <button type="button" className="btn btn-primary" onClick={() => void run()} disabled={!valid || loading}>
            <Search size={16} />
            Verifica
          </button>
        </div>

        <div className={`status-pill ${statusClass}`}>
          <span className="dot" />
          {statusLabel}
        </div>

        {files.map((f, i) => (
          <div key={`${f.name}-${i}`} className="file-chip">
            <FileText size={14} />
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</span>
            <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} aria-label="Rimuovi">
              <X size={14} />
            </button>
          </div>
        ))}

        {error && <div className="error-box">{error}</div>}

        {!result && !loading && (
          <div className="examples-block">
            <p className="examples-label">Prova con un esempio</p>
            {examples.map((ex) => (
              <button key={ex} type="button" className="example-btn" onClick={() => setText(ex)}>
                {ex}
              </button>
            ))}
          </div>
        )}

        <div className="pipeline-row">
          {pipelineSteps.map((s) => (
            <div key={s.id} className={`pipeline-step ${stepStatus(s.id)}`} title={s.description}>
              {s.label}
            </div>
          ))}
        </div>
      </section>

      <InsightColumn
        result={result}
        query={query}
        isLoading={loading}
        loadingStage={loadStage}
        loadingProgress={loadProgress}
      />
    </div>
  );
}
