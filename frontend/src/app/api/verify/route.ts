import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

export async function POST(request: Request) {
  let body: { query?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON non valido." }, { status: 400 });
  }

  if (!body.query || body.query.trim().length < 10) {
    return NextResponse.json(
      { error: "Inserisci una notizia di almeno 10 caratteri." },
      { status: 400 },
    );
  }

  try {
    const backendResponse = await fetch(`${BACKEND_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: body.query.trim() }),
      cache: "no-store",
    });

    const data = await backendResponse.json();
    return NextResponse.json(data, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      {
        error:
          "Backend non raggiungibile. Avvia il server Python con: uvicorn main:app --reload --port 8000",
      },
      { status: 503 },
    );
  }
}
