import type { VerifyRequest, VerifyResponse } from "./types";

export class VerifyApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "VerifyApiError";
    this.status = status;
  }
}

export async function verifyNews(payload: VerifyRequest): Promise<VerifyResponse> {
  const response = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as VerifyResponse | { detail?: string; error?: string };

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && ("detail" in data || "error" in data)
        ? String(data.detail ?? data.error)
        : "Errore durante la verifica.";
    throw new VerifyApiError(message, response.status);
  }

  return data as VerifyResponse;
}
