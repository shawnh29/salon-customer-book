import { useEffect, useState } from "react";
import { getCustomer } from "../api";
import { formatBirthYear } from "../shared/age";
import type { Customer } from "../types";
import Modal from "./Modal";

interface Props {
  customerId: string;
  onEdit: (id: string) => void;
  onDelete: (customer: Pick<Customer, "id" | "name">) => void;
  onClose: () => void;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function CustomerDetail({ customerId, onEdit, onDelete, onClose }: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCustomer(customerId)
      .then((c) => {
        if (!cancelled) setCustomer(c);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this customer.");
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return (
    <Modal title={customer ? customer.name : "Customer"} onRequestClose={onClose}>
      {!customer && !error && (
        <p className="status" role="status">
          <span className="spinner" aria-hidden="true" /> Loading customer…
        </p>
      )}

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      {customer && (
        <>
          <dl className="details">
            <div>
              <dt>Name</dt>
              <dd>{customer.name}</dd>
            </div>
            <div>
              <dt>English name</dt>
              <dd>{customer.english_name ?? <span className="muted">—</span>}</dd>
            </div>
            <div>
              <dt>Korean name</dt>
              <dd lang="ko">{customer.korean_name ?? <span className="muted">—</span>}</dd>
            </div>
            <div>
              <dt>Year of Birth</dt>
              <dd>{formatBirthYear(customer.birth_year)}</dd>
            </div>
            <div>
              <dt>Notes</dt>
              {/* Rendered as plain text (React escapes it); line breaks kept via CSS. */}
              <dd className="notes-full">{customer.notes ?? <span className="muted">—</span>}</dd>
            </div>
            <div>
              <dt>Added</dt>
              <dd>{formatDateTime(customer.created_at)}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{formatDateTime(customer.updated_at)}</dd>
            </div>
          </dl>
          <p className="field-help">Age is an estimate: this year minus the year of birth.</p>
        </>
      )}

      <div className="modal-actions">
        {customer && (
          <>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onDelete({ id: customer.id, name: customer.name })}
            >
              Delete
            </button>
            <button type="button" className="btn btn-primary" onClick={() => onEdit(customer.id)}>
              Edit
            </button>
          </>
        )}
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}
