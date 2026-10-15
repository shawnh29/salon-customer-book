import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  title: string;
  /** Called for Esc, backdrop click, etc. The parent decides whether to actually close. */
  onRequestClose: () => void;
  children: ReactNode;
}

/** Accessible modal built on the native <dialog> element (focus trap + Esc for free). */
export default function Modal({ title, onRequestClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onRequestClose();
      }}
      onMouseDown={(e) => {
        // A press on the dimmed backdrop targets the <dialog> element itself.
        if (e.target === e.currentTarget) onRequestClose();
      }}
    >
      <div className="modal-body">
        <h2 id="modal-title" className="modal-title">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
