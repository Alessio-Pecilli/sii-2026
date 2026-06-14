export type InlineToken = {
  text: string;
  strong?: boolean;
};

export type ExplanationBlock =
  | { type: "heading"; content: InlineToken[] }
  | { type: "paragraph"; content: InlineToken[] }
  | { type: "list"; items: InlineToken[][] };

function normalizeExplanation(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseInline(text: string): InlineToken[] {
  const normalized = text.replace(/[ \t]+/g, " ").trim();
  if (!normalized) return [];

  return normalized
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return { text: part.slice(2, -2).trim(), strong: true };
      }

      return { text: part };
    })
    .filter((token) => token.text);
}

function isDivider(block: string): boolean {
  return /^([*_-]\s*){3,}$/.test(block.trim());
}

function isBulletLine(line: string): boolean {
  return /^([-*\u2022]|\d+\.)\s+/.test(line.trim());
}

function stripBulletMarker(line: string): string {
  return line.trim().replace(/^([-*\u2022]|\d+\.)\s+/, "");
}

function isFullBoldHeading(block: string): boolean {
  const trimmed = block.trim();
  return /^\*\*[^*].+\*\*$/.test(trimmed) && !trimmed.includes("\n") && trimmed.length <= 180;
}

export function parseExplanation(text: string): ExplanationBlock[] {
  const normalized = normalizeExplanation(text);
  if (!normalized) return [];

  const blocks: ExplanationBlock[] = [];

  for (const block of normalized.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (!trimmed || isDivider(trimmed)) continue;

    const lines = trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) continue;

    if (lines.every(isBulletLine)) {
      blocks.push({
        type: "list",
        items: lines.map((line) => parseInline(stripBulletMarker(line))),
      });
      continue;
    }

    if (lines.length === 1 && /^#{1,6}\s+/.test(lines[0])) {
      blocks.push({
        type: "heading",
        content: parseInline(lines[0].replace(/^#{1,6}\s+/, "")),
      });
      continue;
    }

    if (lines.length === 1 && isFullBoldHeading(lines[0])) {
      blocks.push({
        type: "heading",
        content: parseInline(lines[0]),
      });
      continue;
    }

    blocks.push({
      type: "paragraph",
      content: parseInline(lines.join(" ")),
    });
  }

  if (blocks.length) return blocks;
  return [{ type: "paragraph", content: parseInline(normalized.replace(/\n+/g, " ")) }];
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

export function sourceFaviconUrl(url: string): string | null {
  if (!url.startsWith("http")) return null;
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(origin)}`;
  } catch {
    return null;
  }
}

export function truncateText(text: string, max = 120): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}
