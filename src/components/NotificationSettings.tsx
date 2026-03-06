import { useState, useEffect } from "react";
import { Bell, BellOff, Clock, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const TIME_OPTIONS = [
  "05:00", "05:30", "06:00", "06:30", "07:00", "07:30",
  "08:00", "08:30", "09:00", "09:30", "10:00",
  "12:00", "18:00", "19:00", "20:00", "21:00", "22:00",
];

const formatTime = (t: string) => {
  const [h, m] = t.split(":");
  return `${h}:${m}`;
};

interface Props {
  initialEnabled?: boolean;
  initialTime?: string;
}

export default function NotificationSettings({ initialEnabled = false, initialTime = "08:00" }: Props) {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [time, setTime] = useState(initialTime);
  const [saving, setSaving] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (!("Notification" in window)) {
      setPermissionState("unsupported");
    } else {
      setPermissionState(Notification.permission);
    }
  }, []);

  useEffect(() => {
    setEnabled(initialEnabled);
    setTime(initialTime);
  }, [initialEnabled, initialTime]);

  const requestPermissionAndSubscribe = async () => {
    if (!("Notification" in window)) {
      toast.error("Seu navegador não suporta notificações.");
      return false;
    }

    const permission = await Notification.requestPermission();
    setPermissionState(permission);

    if (permission !== "granted") {
      toast.error("Permissão de notificação negada. Ative nas configurações do navegador.");
      return false;
    }

    // Try to subscribe to push if service worker is available
    try {
      const registration = await navigator.serviceWorker?.ready;
      if (registration) {
        // For now we store a simple flag; full Web Push requires VAPID keys
        return true;
      }
    } catch {
      // Service worker not available, still allow notification preference
    }
    return true;
  };

  const handleToggle = async () => {
    if (!user) return;

    if (!enabled) {
      // Enabling
      const ok = await requestPermissionAndSubscribe();
      if (!ok) return;
    }

    const newEnabled = !enabled;
    setSaving(true);

    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        reminder_enabled: newEnabled,
        reminder_time: time,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar preferência.");
      return;
    }

    setEnabled(newEnabled);
    toast.success(newEnabled ? "Lembretes ativados! 🔔" : "Lembretes desativados.");
  };

  const handleTimeChange = async (newTime: string) => {
    if (!user) return;
    setTime(newTime);

    if (enabled) {
      setSaving(true);
      await (supabase as any)
        .from("profiles")
        .update({ reminder_time: newTime })
        .eq("user_id", user.id);
      setSaving(false);
      toast.success(`Horário atualizado para ${formatTime(newTime)}`);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {enabled ? (
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <BellOff className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-foreground">Lembrete diário</p>
            <p className="text-xs text-muted-foreground">
              {enabled ? `Todos os dias às ${formatTime(time)}` : "Receba um lembrete para ler"}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={saving || permissionState === "unsupported"}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            enabled ? "bg-primary" : "bg-muted-foreground/30"
          } ${saving ? "opacity-50" : ""}`}
        >
          <span
            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {permissionState === "unsupported" && (
        <p className="text-xs text-destructive">
          Seu navegador não suporta notificações push.
        </p>
      )}

      {permissionState === "denied" && (
        <p className="text-xs text-destructive">
          Notificações bloqueadas. Ative nas configurações do navegador.
        </p>
      )}

      {/* Time picker — only visible when enabled */}
      {enabled && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Escolha o melhor horário</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => handleTimeChange(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  time === t
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-muted/30 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {formatTime(t)}
                {time === t && <Check className="w-3 h-3 inline ml-1" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
