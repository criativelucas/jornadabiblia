import { AlertTriangle, X } from "lucide-react";

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "default";
}

const ConfirmModal = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  variant = "default",
}: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div
        className="relative bg-card border border-border rounded-3xl p-7 max-w-[340px] w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <button onClick={onCancel} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
              variant === "danger" ? "bg-destructive/10" : "bg-primary/10"
            }`}
          >
            <AlertTriangle
              className={`w-7 h-7 ${variant === "danger" ? "text-destructive" : "text-primary"}`}
            />
          </div>

          <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{message}</p>

          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-[10px] border border-border text-sm font-medium text-foreground hover:bg-muted transition-all"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-all ${
                variant === "danger"
                  ? "bg-destructive text-destructive-foreground hover:opacity-90"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
