import type { FieldErrors } from "../../../src/shared/customer";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors?: FieldErrors,
  ) {
    super(message);
  }
}

const BASE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: BASE_HEADERS });
}

export function methodNotAllowed(allowed: string[]): Response {
  return new Response(JSON.stringify({ error: "Method not allowed." }), {
    status: 405,
    headers: {
      ...BASE_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      Allow: allowed.join(", "),
    },
  });
}

/** Turns any thrown value into a safe response. Never leaks internals. */
export function errorResponse(err: unknown, where: string): Response {
  if (err instanceof HttpError) {
    return json({ error: err.message, fieldErrors: err.fieldErrors }, err.status);
  }
  // Full details go to the function logs only, never to the browser.
  console.error(`[${where}]`, err);
  return json(
    { error: "The database could not be reached or something went wrong. Please try again." },
    500,
  );
}

const MAX_BODY_CHARS = 30_000;

export async function readJsonBody(req: Request): Promise<unknown> {
  const text = await req.text();
  if (text.length > MAX_BODY_CHARS) throw new HttpError(413, "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

/** Escape LIKE/ILIKE wildcards so user text is matched literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
