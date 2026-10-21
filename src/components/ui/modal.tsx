import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  initialFocusRef,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (open) {
      const initialTarget = initialFocusRef?.current ?? dialog.querySelector<HTMLElement>("[autofocus]");
      initialTarget?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [initialFocusRef, open]);

  function close() {
    onOpenChange(false);
  }

  return (
    <dialog
      ref={dialogRef}
      open={open || undefined}
      aria-modal={open ? "true" : undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={() => {
        if (open) close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className={cn(
        "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-xl backdrop:bg-black/50",
        className,
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="grid gap-1">
          <h2 id={titleId} className="text-xl font-semibold">{title}</h2>
          {description ? <p id={descriptionId} className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <button
          type="button"
          autoFocus
          aria-label="Close dialog"
          onClick={close}
          className="focus-ring touch-target -mr-2 -mt-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m18 6-12 12M6 6l12 12" />
          </svg>
        </button>
      </div>
      {children}
    </dialog>
  );
}
