import type { LucideIcon } from "lucide-react";
import { AlertTriangle, HelpCircle, ShieldCheck, ShieldX } from "lucide-react";
import type { NliVerdict, PipelineStepId } from "./types";

export type VerdictDisplay = {
  label: string;
  shortLabel: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  ringClass: string;
  Icon: LucideIcon;
};

const verdictMap: Record<NliVerdict, VerdictDisplay> = {
  SUPPORTS: {
    label: "NOTIZIA VERIFICATA",
    shortLabel: "Supportata",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    borderClass: "border-emerald-200 dark:border-emerald-800/60",
    ringClass: "ring-emerald-500/30",
    Icon: ShieldCheck,
  },
  REFUTES: {
    label: "NOTIZIA REFUTATA",
    shortLabel: "Smentita",
    colorClass: "text-rose-600 dark:text-rose-400",
    bgClass: "bg-rose-50 dark:bg-rose-950/40",
    borderClass: "border-rose-200 dark:border-rose-800/60",
    ringClass: "ring-rose-500/30",
    Icon: ShieldX,
  },
  "NOT ENOUGH INFO": {
    label: "DATI INSUFFICIENTI",
    shortLabel: "Inconclusivo",
    colorClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    borderClass: "border-amber-200 dark:border-amber-800/60",
    ringClass: "ring-amber-500/30",
    Icon: HelpCircle,
  },
};

export const idleDisplay: VerdictDisplay = {
  label: "IN ATTESA DI VERIFICA",
  shortLabel: "—",
  colorClass: "text-slate-400 dark:text-slate-500",
  bgClass: "bg-slate-50 dark:bg-slate-900/50",
  borderClass: "border-slate-200 dark:border-slate-800",
  ringClass: "ring-slate-300/20",
  Icon: AlertTriangle,
};

export function getVerdictDisplay(verdict: NliVerdict | null): VerdictDisplay {
  if (!verdict) return idleDisplay;
  return verdictMap[verdict];
}

export const pipelineSteps: { id: PipelineStepId; label: string; description: string }[] = [
  { id: "rag", label: "Ricerca", description: "Recupero fonti web" },
  { id: "nli", label: "NLI", description: "Analisi coerenza" },
  { id: "llm", label: "LLM", description: "Valutazione finale" },
];

export function formatConfidence(value: number): string {
  return `${Math.round(value * 100)}%`;
}
