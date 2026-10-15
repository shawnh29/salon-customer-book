import { useState } from "react";
import { deleteCustomer } from "../api";
import Modal from "./Modal";

interface Props {
  /** `name` is the display name (already falls back to "Unnamed customer"). */
  customer: { id: string; name: string };
  onDeleted: (name: string) => void;
  onClose: () => void;
}

export default function DeleteConfirm({ customer, onDeleted, onClose }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (deleting) return; // prevent duplicate requests
    setDeleting(true);
    setError(null);
    try {
      await deleteCustomer(customer.id);
      onDeleted(customer.name);
    } catch (err) {
      // A 404 means it was already deleted elsewhere; the list refresh will reflect that.
      setError(err instanceof Error ? err.message : "Could not delete this customer.");
      setDeleting(false);
    }
  }

  return (
    <Modal title="Delete customer?" onRequestClose={() => !deleting && onClose()}>
      <p>
        Are you sure you want to delete <strong>{customer.name}</strong>? This cannot be undone.
      </p>
      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={deleting} autoFocus>
          Cancel
        </button>
        <button type="button" className="btn btn-danger-solid" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Modal>
  );
}
