import { useEffect, useRef, useState } from "react";
import { downloadCsv, isAbortError, listCustomers } from "./api";
import CustomerDetail from "./components/CustomerDetail";
import CustomerForm from "./components/CustomerForm";
import DeleteConfirm from "./components/DeleteConfirm";
import { formatBirthYear } from "./shared/age";
import { nfc } from "./shared/customer";
import type { Customer, CustomerListResponse } from "./types";

type ModalState =
  | { kind: "none" }
  | { kind: "view"; id: string }
  | { kind: "form"; id: string | null }
  | { kind: "delete"; customer: Pick<Customer, "id" | "name"> };

interface Toast {
  type: "success" | "error";
  text: string;
}

const SEARCH_DEBOUNCE_MS = 300;

export default function App() {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // debounced, what the server is asked for
  const [composing, setComposing] = useState(false); // true while a Korean IME is mid-syllable
  const [data, setData] = useState<CustomerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [toast, setToast] = useState<Toast | null>(null);
  const [exporting, setExporting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Debounce typing. Wait until IME composition ends so half-typed Hangul isn't searched.
  useEffect(() => {
    if (composing) return;
    const t = setTimeout(() => setSearchTerm(nfc(query).trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, composing]);

  // Load the list (and search) from the server whenever the term changes or data changes.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    listCustomers(searchTerm, controller.signal)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) return;
        setData(null); // never show stale/fake data when the database can't be read
        setError(err instanceof Error ? err.message : "Could not load customers.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [searchTerm, reloadKey]);

  // Auto-dismiss toasts.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  function clearSearch() {
    setQuery("");
    setSearchTerm("");
    searchRef.current?.focus();
  }

  function handleSaved(c: Customer, mode: "created" | "updated") {
    setModal({ kind: "none" });
    setToast({ type: "success", text: `${c.name} was ${mode === "created" ? "added" : "updated"}.` });
    setReloadKey((k) => k + 1);
  }

  function handleDeleted(name: string) {
    setModal({ kind: "none" });
    setToast({ type: "success", text: `${name} was deleted.` });
    setReloadKey((k) => k + 1);
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      await downloadCsv();
      setToast({ type: "success", text: "CSV downloaded." });
    } catch (err) {
      setToast({ type: "error", text: err instanceof Error ? err.message : "The export failed." });
    } finally {
      setExporting(false);
    }
  }

  const searching = searchTerm !== "";
  const total = data?.total ?? 0;

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1 className="title">Salon Customer Book</h1>
          <p className="count" aria-live="polite">
            {data ? `${total} ${total === 1 ? "customer" : "customers"}` : " "}
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setModal({ kind: "form", id: null })}>
            Add Customer
          </button>
        </div>
      </header>

      <main>
        <div className="search" role="search">
          <label htmlFor="search" className="visually-hidden">
            Search customers
          </label>
          <input
            ref={searchRef}
            id="search"
            type="search"
            className="search-input"
            placeholder="Search by name or notes — English or 한글"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            autoComplete="off"
            spellCheck={false}
          />
          {query !== "" && (
            <button type="button" className="search-clear" onClick={clearSearch} aria-label="Clear search">
              ×
            </button>
          )}
        </div>
        <p className="field-help search-hint">
          Search finds names and notes exactly as saved. English and Korean spellings are not translated
          into each other, so save both names on a customer if you want either one to match.
        </p>

        {searching && data && !error && (
          <p className="result-summary" role="status">
            {data.customers.length === 0
              ? "No matches"
              : `${data.customers.length}${data.truncated ? "+" : ""} ${data.customers.length === 1 ? "match" : "matches"}`}{" "}
            for “{searchTerm}”.{" "}
            <button type="button" className="link-button" onClick={clearSearch}>
              Show all customers
            </button>
          </p>
        )}

        {loading && !data && (
          <p className="status" role="status">
            <span className="spinner" aria-hidden="true" /> Loading customers…
          </p>
        )}

        {error && (
          <div className="alert alert-error" role="alert">
            <p>{error}</p>
            <button type="button" className="btn btn-secondary" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </button>
          </div>
        )}

        {data && !error && data.customers.length === 0 && (
          <div className="empty">
            {searching ? (
              <>
                <p className="empty-title">No customers match “{searchTerm}”.</p>
                <p className="muted">Check the spelling, or try part of the name or a word from the notes.</p>
                <button type="button" className="btn btn-secondary" onClick={clearSearch}>
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="empty-title">No customers yet.</p>
                <p className="muted">Add your first customer to get started.</p>
                <button type="button" className="btn btn-primary" onClick={() => setModal({ kind: "form", id: null })}>
                  Add Customer
                </button>
              </>
            )}
          </div>
        )}

        {data && !error && data.customers.length > 0 && (
          <ul className={loading ? "list is-loading" : "list"} aria-busy={loading}>
            {data.customers.map((c) => (
              <li key={c.id} className="card">
                <div className="card-main">
                  <h2 className="card-name">{c.name}</h2>
                  {(c.english_name || c.korean_name) && (
                    <p className="card-alt">
                      {c.english_name && <span>{c.english_name}</span>}
                      {c.english_name && c.korean_name && <span aria-hidden="true"> · </span>}
                      {c.korean_name && <span lang="ko">{c.korean_name}</span>}
                    </p>
                  )}
                  <p className="card-year">{formatBirthYear(c.birth_year)}</p>
                  {c.notes_preview && <p className="card-notes">{c.notes_preview}</p>}
                </div>
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={() => setModal({ kind: "view", id: c.id })}
                    aria-label={`View ${c.name}`}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={() => setModal({ kind: "form", id: c.id })}
                    aria-label={`Edit ${c.name}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-danger"
                    onClick={() => setModal({ kind: "delete", customer: { id: c.id, name: c.name } })}
                    aria-label={`Delete ${c.name}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {data?.truncated && (
          <p className="field-help">Showing the first 1,000 customers. Use search to narrow the list.</p>
        )}
      </main>

      <footer className="footer">
        <p>Ages are estimates: the current year minus the year of birth, not an exact age.</p>
      </footer>

      {modal.kind === "view" && (
        <CustomerDetail
          customerId={modal.id}
          onEdit={(id) => setModal({ kind: "form", id })}
          onDelete={(customer) => setModal({ kind: "delete", customer })}
          onClose={() => setModal({ kind: "none" })}
        />
      )}
      {modal.kind === "form" && (
        <CustomerForm
          key={modal.id ?? "new"}
          customerId={modal.id}
          onSaved={handleSaved}
          onClose={() => setModal({ kind: "none" })}
        />
      )}
      {modal.kind === "delete" && (
        <DeleteConfirm
          customer={modal.customer}
          onDeleted={handleDeleted}
          onClose={() => setModal({ kind: "none" })}
        />
      )}

      <div className="toast-region" aria-live="polite">
        {toast && <div className={`toast toast-${toast.type}`}>{toast.text}</div>}
      </div>
    </div>
  );
}
