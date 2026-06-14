"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { splitExplanation, sourceLabel, truncateText } from "@/lib/explain";
import { formatConfidence, getVerdictDisplay } from "@/lib/verdict";
import type { VerifyResponse } from "@/lib/types";

type Props = {
  result: VerifyResponse | null;
  query: string;
  isLoading: boolean;
  loadingStage: string;
  loadingProgress: number;
};

function Card({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="card">
      <p className="card-label">{label}</p>
      {children}
    </div>
  );
}

export function InsightColumn({ result, query, isLoading, loadingStage, loadingProgress }: Props) {
  const verdict = result ? getVerdictDisplay(result.verdict) : null;
  const VerdictIcon = verdict?.Icon;
  const parts = result ? splitExplanation(result.explanation) : [];

  return (
    <aside className="insight-column">
      {isLoading && (
        <div className="loading-overlay active" aria-live="polite">
          <div className="spinner" />
          <h3>Analisi in corso</h3>
          <p>{loadingStage}</p>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${loadingProgress}%` }} />
          </div>
        </div>
      )}

      <div className="insight-top">
        <h2>Risultati</h2>
        <p>Verdetto, analisi e fonti della verifica</p>
      </div>

      {!result && !isLoading && (
        <div className="placeholder-card">
          <p>
            Incolla una notizia e premi <strong>Verifica</strong>.
            <br />
            Il report comparirà qui.
          </p>
        </div>
      )}

      {result && verdict && VerdictIcon && (
        <div className="insight-stack">
          <Card label="Verdetto">
            <div className="verdict-card">
              <div className={`verdict-icon-wrap ${verdict.bgClass}`}>
                <VerdictIcon size={22} style={{ color: verdict.hex }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="verdict-title" style={{ color: verdict.hex }}>{verdict.label}</p>
                <p className="verdict-desc">{verdict.summary}</p>
                <div className="score-row">
                  <div className="score-track">
                    <div
                      className={`score-fill ${verdict.barClass}`}
                      style={{ width: `${Math.round(result.confidence * 100)}%` }}
                    />
                  </div>
                  <span className="score-val">{formatConfidence(result.confidence)}</span>
                </div>
              </div>
            </div>
            <div className="stats-row">
              <div className="stat">
                <div className="stat-val">{result.sources.length}</div>
                <div className="stat-label">Fonti</div>
              </div>
              <div className="stat">
                <div className="stat-val">{result.retrieved_docs.length}</div>
                <div className="stat-label">Documenti</div>
              </div>
              <div className="stat">
                <div className="stat-val">{result.nli_results.length}</div>
                <div className="stat-label">NLI</div>
              </div>
            </div>
          </Card>

          <Card label="Claim">
            <p className="claim-quote">{query}</p>
          </Card>

          <Card label="Analisi">
            <div className={`alert-box ${verdict.alertClass}`}>{verdict.summary}</div>
            <ul className="reason-list">
              {parts.map((part, i) => (
                <li key={i}>{part}</li>
              ))}
            </ul>
          </Card>

          {result.nli_results.length > 0 && (
            <Card label="Coerenza (NLI)">
              {result.nli_results.map((nli, i) => {
                const nv = getVerdictDisplay(nli.verdict);
                return (
                  <div key={i} className="nli-item">
                    <p className="nli-label">{nv.shortLabel}</p>
                    <div className="score-row">
                      <div className="score-track">
                        <div
                          className="score-fill"
                          style={{
                            width: `${Math.round(nli.confidence * 100)}%`,
                            background: nv.hex,
                          }}
                        />
                      </div>
                      <span className="score-val">{formatConfidence(nli.confidence)}</span>
                    </div>
                    {nli.premise && <p className="nli-premise">{truncateText(nli.premise, 260)}</p>}
                  </div>
                );
              })}
            </Card>
          )}

          {result.sources.length > 0 && (
            <Card label={`Fonti (${result.sources.length})`}>
              <ul style={{ listStyle: "none" }}>
                {result.sources.map((src, i) => (
                  <li key={i} className="source-item">
                    {src.startsWith("http") ? (
                      <a href={src} target="_blank" rel="noreferrer">
                        <ExternalLink size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
                        <span>
                          <strong>{sourceLabel(src)}</strong>
                          <small>{truncateText(src, 64)}</small>
                        </span>
                      </a>
                    ) : (
                      <span style={{ padding: "10px 12px", fontSize: "0.8125rem", color: "var(--muted)" }}>
                        {src}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {result.retrieved_docs.length > 0 && (
            <Card label={`Documenti recuperati (${result.retrieved_docs.length})`}>
              {result.retrieved_docs.map((doc, i) => (
                <p key={i} className="doc-item">
                  {doc}
                </p>
              ))}
            </Card>
          )}
        </div>
      )}
    </aside>
  );
}
