import { getDatabase } from "@netlify/database";
import type { Config } from "@netlify/functions";
import { calcAge } from "../../src/shared/age";
import { errorResponse, methodNotAllowed } from "./lib/http";

// GET /api/export  ->  CSV download of every customer
export const config: Config = {
  path: "/api/export",
};

interface Row {
  name: string;
  english_name: string | null;
  korean_name: string | null;
  birth_year: number;
  notes: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Quote every field and double any quotes (handles commas and multiline notes).
 * Text that starts with = + - @ tab or CR could be run as a formula by Excel /
 * Sheets, so it gets a leading apostrophe to force it to be plain text.
 */
function textCell(value: string | null): string {
  let s = value ?? "";
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function plainCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function iso(value: Date | string): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return methodNotAllowed(["GET"]);

  try {
    const db = getDatabase();
    const rows = await db.sql<Row>`
      SELECT name, english_name, korean_name, birth_year, notes, created_at, updated_at
      FROM customers
      ORDER BY lower(name), created_at`;

    const header = [
      "Name",
      "English Name",
      "Korean Name",
      "Year of Birth",
      "Age (estimate at export)",
      "Notes",
      "Created At (UTC)",
      "Updated At (UTC)",
    ].map(plainCell);

    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          textCell(r.name),
          textCell(r.english_name),
          textCell(r.korean_name),
          plainCell(r.birth_year),
          plainCell(calcAge(r.birth_year)),
          textCell(r.notes),
          plainCell(iso(r.created_at)),
          plainCell(iso(r.updated_at)),
        ].join(","),
      );
    }

    // UTF-8 BOM so Excel opens Korean text correctly.
    const csv = "﻿" + lines.join("\r\n") + "\r\n";
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="salon-customers-${date}.csv"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return errorResponse(err, "export");
  }
};
