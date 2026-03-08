"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";
import { ClipboardList, FileUp, Link2, Moon, ShieldCheck, ShieldX, Sun } from "lucide-react";

type Verdict = "true" | "false" | null;
type Theme = "light" | "dark";

const sourcePlaceholders = [
  "https://example.org/fonte-istituzionale",
  "https://example.org/osservatorio-media",
  "https://example.org/database-fact-checking",
];

export default function Home() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") {
      return "light";
    }
    return window.localStorage.getItem("theme") === "dark" ? "dark" : "light";
  });
  const [newsText, setNewsText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  };

  const handleFileSelection = (incomingFiles: FileList | null) => {
    if (!incomingFiles) {
      return;
    }
    setFiles(Array.from(incomingFiles));
  };

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(event.target.files);
  };

  const onDropFiles = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    handleFileSelection(event.dataTransfer.files);
  };

  const verdictView = useMemo(() => {
    if (verdict === "true") {
      return {
        label: "NOTIZIA VERA",
        colorClass: "text-emerald-500 dark:text-emerald-400",
        Icon: ShieldCheck,
        reasons:
          "La struttura del testo, i riferimenti e la coerenza con fonti esterne risultano compatibili con contenuti verificati.",
      };
    }

    if (verdict === "false") {
      return {
        label: "NOTIZIA FALSA",
        colorClass: "text-red-500 dark:text-red-400",
        Icon: ShieldX,
        reasons:
          "Sono emerse incongruenze tra claim, date e fonti, con segnali tipici di contenuto fuorviante o manipolato.",
      };
    }

    return {
      label: "IN ATTESA DI VERIFICA",
      colorClass: "text-slate-400 dark:text-slate-500",
      Icon: ClipboardList,
      reasons:
        "Incolla una notizia e avvia l'analisi per visualizzare motivazioni e fonti di supporto.",
    };
  }, [verdict]);

  const runMockVerification = () => {
    const randomVerdict: Verdict = Math.random() < 0.5 ? "true" : "false";
    setVerdict(randomVerdict);
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <main className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center gap-4 p-4 md:gap-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              AI Fact-Checking
            </p>
            <h1 className="mt-1 text-base font-medium md:text-lg">Verifica rapida notizia</h1>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Cambia tema"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-5">
          <textarea
            value={newsText}
            onChange={(event) => setNewsText(event.target.value)}
            placeholder="Scrivi o incolla la notizia (1-2 righe)..."
            className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-5 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:focus:border-slate-500 dark:focus:bg-slate-900"
          />

          <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row">
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={onDropFiles}
              className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-sm transition ${
                isDragOver
                  ? "border-slate-500 bg-slate-100 dark:border-slate-400 dark:bg-slate-800"
                  : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
              }`}
            >
              <input type="file" multiple className="hidden" onChange={onFileInputChange} />
              <FileUp className="h-4 w-4" />
              <span>Allega file</span>
            </label>

            <button
              type="button"
              onClick={runMockVerification}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Verifica
            </button>
          </div>

          <p className="mt-2 truncate text-xs text-slate-500 dark:text-slate-400">
            {files.length > 0
              ? `${files.length} allegato/i: ${files.map((file) => file.name).join(", ")}`
              : "Nessun allegato selezionato"}
          </p>
        </section>

        <section className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Risultato
          </p>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-5 text-center">
            <verdictView.Icon className={`mb-2 h-8 w-8 ${verdictView.colorClass}`} />
            <p className={`text-2xl font-semibold md:text-3xl ${verdictView.colorClass}`}>
              {verdictView.label}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Motivazioni
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-700 dark:text-slate-300">
              {verdictView.reasons}
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Fonti / Risorse
            </p>
            <ul className="mt-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              {sourcePlaceholders.map((source) => (
                <li key={source} className="flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 shrink-0" />
                  <a
                    href={source}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:text-slate-900 hover:underline dark:hover:text-slate-100"
                  >
                    {source}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
