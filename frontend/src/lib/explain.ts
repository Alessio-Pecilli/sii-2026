export function splitExplanation(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized
    .split(/(?<=[.!?])\s+(?=[A-ZÀÈÉÌÒÙ"«])/u)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length > 1) return sentences;
  if (normalized.length > 220) {
    const mid = Math.floor(normalized.length / 2);
    const breakAt = normalized.indexOf(" ", mid);
    if (breakAt > 0) {
      return [normalized.slice(0, breakAt).trim(), normalized.slice(breakAt).trim()];
    }
  }
  return [normalized];
}

export function sourceLabel(urlOrTitle: string): string {
  if (!urlOrTitle.startsWith("http")) return urlOrTitle;
  try {
    const host = new URL(urlOrTitle).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return urlOrTitle;
  }
}

export function truncateText(text: string, max = 120): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}
