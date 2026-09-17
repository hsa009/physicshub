import { useEffect, useRef } from "react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  caption?: string;
  open: boolean;
  onClose: () => void;
}

export default function ImageLightbox({
  src,
  alt,
  caption,
  open,
  onClose,
}: ImageLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      lastActiveRef.current = document.activeElement as HTMLElement | null;
      dlg.showModal();
    } else if (!open && dlg.open) {
      dlg.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="image-lightbox"
      onClick={onBackdropClick}
      onClose={onClose}
      aria-label={alt || "Image preview"}
    >
      <div className="image-lightbox-frame">
        <button
          type="button"
          onClick={onClose}
          className="image-lightbox-close"
          aria-label="Close image preview"
        >
          <span aria-hidden>×</span>
        </button>
        <img
          src={src}
          alt={alt}
          className="image-lightbox-img"
          loading="eager"
        />
        {(alt || caption) && (
          <p className="image-lightbox-caption">
            {caption ?? alt}
          </p>
        )}
      </div>
    </dialog>
  );
}
