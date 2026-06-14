import type { LucideIcon } from "lucide-react";
import { AlertTriangle, HelpCircle, ShieldCheck, ShieldX } from "lucide-react";
import type { NliVerdict, PipelineStepId } from "./types";

export type VerdictDisplay = {
  label: string;
  shortLabel: string;
  summary: string;
  hex: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  barClass: string;
  pillClass: string;
  alertClass: string;
  Icon: LucideIcon;
};

const verdictMap: Record<NliVerdict, VerdictDisplay> = {
  SUPPORTS: {
    label: "Notizia supportata",
    shortLabel: "Supportata",
    summary: "Le fonti recuperate confermano il claim.",
    hex: "#22c55e",
    colorClass: "text-emerald-500",
    bgClass: "verdict-bg-ok",
    borderClass: "verdict-border-ok",
    barClass: "bar-ok",
    pillClass: "pill-ok",
    alertClass: "alert-ok",
    Icon: ShieldCheck,
  },
  REFUTES: {
    label: "Notizia smentita",
    shortLabel: "Smentita",
    summary: "Le evidenze contraddicono l'affermazione.",
    hex: "#ef4444",
    colorClass: "text-red-500",
    bgClass: "verdict-bg-warn",
    borderClass: "verdict-border-warn",
    barClass: "bar-warn",
    pillClass: "pill-warn",
    alertClass: "alert-warn",
    Icon: ShieldX,
  },
  "NOT ENOUGH INFO": {
    label: "Non conclusivo",
    shortLabel: "Inconclusivo",
    summary: "Dati insufficienti per un giudizio definitivo.",
    hex: "#f59e0b",
    colorClass: "text-amber-500",
    bgClass: "verdict-bg-neutral",
    borderClass: "verdict-border-neutral",
    barClass: "bar-neutral",
    pillClass: "pill-neutral",
    alertClass: "alert-neutral",
    Icon: HelpCircle,
  },
};

export const idleDisplay: VerdictDisplay = {
  label: "In attesa",
  shortLabel: "-",
  summary: "Avvia una verifica per vedere il report.",
  hex: "#71717a",
  colorClass: "text-zinc-500",
  bgClass: "",
  borderClass: "",
  barClass: "",
  pillClass: "pill",
  alertClass: "",
  Icon: AlertTriangle,
};

export function getVerdictDisplay(verdict: NliVerdict | null): VerdictDisplay {
  if (!verdict) return idleDisplay;
  return verdictMap[verdict];
}

export const pipelineSteps: { id: PipelineStepId; label: string; description: string }[] = [
  { id: "rag", label: "Ricerca", description: "Recupero fonti" },
  { id: "nli", label: "NLI", description: "Coerenza testuale" },
  { id: "llm", label: "LLM", description: "Sintesi finale" },
];

export const loadingStages = [
  { label: "Ricerca fonti sul web...", progress: 30 },
  { label: "Analisi di coerenza...", progress: 55 },
  { label: "Generazione report...", progress: 85 },
  { label: "Completamento...", progress: 96 },
];

export function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}
