import { getDatabase } from "@netlify/database";
import type { Config, Context } from "@netlify/functions";
import { isUuid, nfc, validateCustomerInput } from "../../src/shared/customer";
import type { Customer, CustomerListItem } from "../../src/types";
import {
  HttpError,
  errorResponse,
  escapeLike,
  json,
  methodNotAllowed,
  noContent,
  readJsonBody,
} from "./lib/http";

// GET/POST /api/customers        GET/PUT/DELETE /api/customers/:id
export const config: Config = {
  path: ["/api/customers", "/api/customers/:id"],
};

const LIST_LIMIT = 1000; // kept as a literal in the SQL below
const MAX_QUERY_CHARS = 100;

export default async (req: Request, context: Context): Promise<Response> => {
  try {
    const id = context.params?.id;

    if (id === undefined) {
      if (req.method === "GET") return await listCustomers(req);
      if (req.method === "POST") return await createCustomer(req);
      return methodNotAllowed(["GET", "POST"]);
    }

    if (!isUuid(id)) throw new HttpError(400, "Invalid customer id.");

    if (req.method === "GET") return await getCustomer(id);
    if (req.method === "PUT") return await updateCustomer(req, id);
    if (req.method === "DELETE") return await deleteCustomer(id);
    return methodNotAllowed(["GET", "PUT", "DELETE"]);
  } catch (err) {
    return errorResponse(err, "customers");
  }
};

async function listCustomers(req: Request): Promise<Response> {
  const db = getDatabase();
  const raw = new URL(req.url).searchParams.get("q") ?? "";
  const q = nfc(raw).trim();
  if ([...q].length > MAX_QUERY_CHARS) {
    throw new HttpError(400, `Search must be ${MAX_QUERY_CHARS} characters or fewer.`);
  }

  const [{ count }] = await db.sql<{ count: number }>`SELECT count(*)::int AS count FROM customers`;

  let rows: CustomerListItem[];
  if (q === "") {
    rows = await db.sql<CustomerListItem>`
      SELECT id, name, english_name, korean_name, birth_year,
             left(notes, 200) AS notes_preview, created_at, updated_at
      FROM customers
      ORDER BY lower(name), created_at
      LIMIT 1001`;
  } else {
    // Partial, case-insensitive match across all four searchable fields.
    // The user text is passed as a bound parameter and LIKE wildcards are escaped.
    const pattern = `%${escapeLike(q)}%`;
    rows = await db.sql<CustomerListItem>`
      SELECT id, name, english_name, korean_name, birth_year,
             left(notes, 200) AS notes_preview, created_at, updated_at
      FROM customers
      WHERE name ILIKE ${pattern}
         OR english_name ILIKE ${pattern}
         OR korean_name ILIKE ${pattern}
         OR notes ILIKE ${pattern}
      ORDER BY lower(name), created_at
      LIMIT 1001`;
  }

  const truncated = rows.length > LIST_LIMIT;
  return json({ customers: truncated ? rows.slice(0, LIST_LIMIT) : rows, total: count, truncated });
}

async function getCustomer(id: string): Promise<Response> {
  const db = getDatabase();
  const rows = await db.sql<Customer>`
    SELECT id, name, english_name, korean_name, birth_year, notes, created_at, updated_at
    FROM customers
    WHERE id = ${id}::uuid`;
  if (rows.length === 0) throw new HttpError(404, "Customer not found.");
  return json(rows[0]);
}

async function createCustomer(req: Request): Promise<Response> {
  const result = validateCustomerInput(await readJsonBody(req));
  if (!result.ok) throw new HttpError(400, "Please fix the highlighted fields.", result.errors);
  const c = result.value;

  const db = getDatabase();
  const rows = await db.sql<Customer>`
    INSERT INTO customers (name, english_name, korean_name, birth_year, notes)
    VALUES (${c.name}, ${c.english_name}, ${c.korean_name}, ${c.birth_year}, ${c.notes})
    RETURNING id, name, english_name, korean_name, birth_year, notes, created_at, updated_at`;
  return json(rows[0], 201);
}

async function updateCustomer(req: Request, id: string): Promise<Response> {
  const result = validateCustomerInput(await readJsonBody(req));
  if (!result.ok) throw new HttpError(400, "Please fix the highlighted fields.", result.errors);
  const c = result.value;

  const db = getDatabase();
  const rows = await db.sql<Customer>`
    UPDATE customers
    SET name = ${c.name},
        english_name = ${c.english_name},
        korean_name = ${c.korean_name},
        birth_year = ${c.birth_year},
        notes = ${c.notes},
        updated_at = now()
    WHERE id = ${id}::uuid
    RETURNING id, name, english_name, korean_name, birth_year, notes, created_at, updated_at`;
  if (rows.length === 0) throw new HttpError(404, "Customer not found.");
  return json(rows[0]);
}

async function deleteCustomer(id: string): Promise<Response> {
  const db = getDatabase();
  const rows = await db.sql<{ id: string }>`
    DELETE FROM customers WHERE id = ${id}::uuid RETURNING id`;
  if (rows.length === 0) throw new HttpError(404, "Customer not found.");
  return noContent();
}
