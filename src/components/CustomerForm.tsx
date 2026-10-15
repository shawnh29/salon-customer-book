import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, createCustomer, getCustomer, updateCustomer } from "../api";
import { currentYear, formatBirthYear } from "../shared/age";
import { LIMITS, MIN_BIRTH_YEAR, validateCustomerInput, type FieldErrors } from "../shared/customer";
import type { Customer } from "../types";
import Modal from "./Modal";

interface Props {
  /** null = add a new customer; otherwise edit this customer. */
  customerId: string | null;
  onSaved: (customer: Customer, mode: "created" | "updated") => void;
  onClose: () => void;
}

interface Values {
  name: string;
  birth_year: string;
  notes: string;
}

const EMPTY: Values = { name: "", birth_year: "", notes: "" };

function toValues(c: Customer): Values {
  return {
    name: c.name ?? "",
    birth_year: c.birth_year === null ? "" : String(c.birth_year),
    notes: c.notes ?? "",
  };
}

export default function CustomerForm({ customerId, onSaved, onClose }: Props) {
  const isEdit = customerId !== null;
  const [initial, setInitial] = useState<Values>(EMPTY);
  const [values, setValues] = useState<Values>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // When editing, load the full record (including full notes) from the database.
  useEffect(() => {
    if (customerId === null) return;
    let cancelled = false;
    getCustomer(customerId)
      .then((c) => {
        if (cancelled) return;
        const v = toValues(c);
        setInitial(v);
        setValues(v);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Could not load this customer.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const dirty = (Object.keys(values) as (keyof Values)[]).some((k) => values[k] !== initial[k]);

  // Browser-level warning if the tab is closed/refreshed with unsaved changes.
  useEffect(() => {
    if (!dirty || submitting) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, submitting]);

  function requestClose() {
    if (submitting) return;
    if (dirty && !window.confirm("You have unsaved changes. Discard them?")) return;
    onClose();
  }

  function setField(field: keyof Values, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return; // prevent duplicate submissions

    const result = validateCustomerInput(values);
    if (!result.ok) {
      setErrors(result.errors);
      setServerError(null);
      const first = (["name", "birth_year", "notes"] as const).find((f) => result.errors[f]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setSubmitting(true);
    setServerError(null);
    setErrors({});
    try {
      const saved =
        customerId !== null
          ? await updateCustomer(customerId, result.value)
          : await createCustomer(result.value);
      onSaved(saved, isEdit ? "updated" : "created");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors ?? {});
        setServerError(err.message);
      } else {
        setServerError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  const title = isEdit ? "Edit Customer" : "Add Customer";

  if (loading || loadError) {
    return (
      <Modal title={title} onRequestClose={onClose}>
        {loading ? (
          <p className="status" role="status">
            <span className="spinner" aria-hidden="true" /> Loading customer…
          </p>
        ) : (
          <p className="alert alert-error" role="alert">
            {loadError}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </Modal>
    );
  }

  const yearOk = /^\d{4}$/.test(values.birth_year.trim())
    ? Number(values.birth_year) >= MIN_BIRTH_YEAR && Number(values.birth_year) <= currentYear()
    : false;
  const notesLength = [...values.notes].length;

  return (
    <Modal title={title} onRequestClose={requestClose}>
      <form ref={formRef} onSubmit={handleSubmit} noValidate>
        {serverError && (
          <p className="alert alert-error" role="alert">
            {serverError}
          </p>
        )}

        <div className="field">
          <label htmlFor="f-name">Name</label>
          <input
            id="f-name"
            name="name"
            type="text"
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            autoComplete="off"
            autoFocus
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? "f-name-err" : undefined}
          />
          {errors.name && (
            <p id="f-name-err" className="field-error">
              {errors.name}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="f-year">Year of Birth</label>
          <input
            id="f-year"
            name="birth_year"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            placeholder="e.g. 1995"
            value={values.birth_year}
            onChange={(e) => setField("birth_year", e.target.value.replace(/\D/g, ""))}
            autoComplete="off"
            className="input-year"
            aria-invalid={errors.birth_year ? true : undefined}
            aria-describedby="f-year-help"
          />
          <p id="f-year-help" className={errors.birth_year ? "field-error" : "field-help"}>
            {errors.birth_year ??
              (yearOk
                ? `Will show as ${formatBirthYear(Number(values.birth_year))}. Age is an estimate: this year minus the year of birth.`
                : "Optional. Four digits. Age is an estimate: this year minus the year of birth.")}
          </p>
        </div>

        <div className="field">
          <label htmlFor="f-notes">Notes</label>
          <textarea
            id="f-notes"
            name="notes"
            rows={5}
            value={values.notes}
            onChange={(e) => setField("notes", e.target.value)}
            aria-invalid={errors.notes ? true : undefined}
            aria-describedby="f-notes-help"
          />
          <p
            id="f-notes-help"
            className={errors.notes || notesLength > LIMITS.notes ? "field-error" : "field-help"}
          >
            {errors.notes ?? `${notesLength} / ${LIMITS.notes} characters`}
          </p>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={requestClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Add customer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
