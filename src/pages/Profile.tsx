import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, User, ZoomIn, ZoomOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import NotificationSettings from "@/components/NotificationSettings";

const CROP_SIZE = 256;

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(false);
  const [reminderTime, setReminderTime] = useState<string>("20:00");
  const [savingReminder, setSavingReminder] = useState(false);

  // Crop states
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (data) {
        const prof = data as any;
        setDisplayName(prof.display_name || "");
        setAvatarUrl(prof.avatar_url || null);
        setReminderEnabled(prof.reminder_enabled === true);
        setReminderTime((prof as any).reminder_time ?? "20:00");
      }
    };
    loadProfile();
  }, [user]);

  const handleSaveName = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() } as any)
      .eq("user_id", user.id);
    setSaving(false);
    toast.success("Nome atualizado!");
  };

  const handleToggleReminder = async (newVal: boolean) => {
    if (!user) return;
    setSavingReminder(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ reminder_enabled: newVal, reminder_time: reminderTime })
      .eq("user_id", user.id);
    setSavingReminder(false);
    if (error) {
      toast.error("Erro ao salvar.");
      return;
    }
    setReminderEnabled(newVal);
    toast.success(newVal ? "Lembretes ativados! 🔔" : "Lembretes desativados.");
  };

  // ── Avatar crop ────────────────────────────────────────────
  const drawCrop = useCallback(() => {
    const canvas = cropCanvasRef.current;
    const img = cropImgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    const drawW = sw * cropScale;
    const drawH = sh * cropScale;
    ctx.drawImage(img, cropOffset.x, cropOffset.y, drawW, drawH);
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [cropOffset, cropScale]);

  useEffect(() => {
    if (cropSrc) drawCrop();
  }, [cropSrc, drawCrop]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        cropImgRef.current = img;
        const scale = Math.min(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        setCropScale(scale);
        setCropOffset({ x: (CROP_SIZE - w) / 2, y: (CROP_SIZE - h) / 2 });
        setCropSrc(src);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropSave = async () => {
    if (!user || !cropCanvasRef.current || !cropImgRef.current) return;
    setSaving(true);
    try {
      // Draw final cropped circle
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = CROP_SIZE;
      finalCanvas.height = CROP_SIZE;
      const fCtx = finalCanvas.getContext("2d")!;
      fCtx.beginPath();
      fCtx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
      fCtx.clip();
      const img = cropImgRef.current;
      const drawW = img.naturalWidth * cropScale;
      const drawH = img.naturalHeight * cropScale;
      fCtx.drawImage(img, cropOffset.x, cropOffset.y, drawW, drawH);

      const blob = await new Promise<Blob>((res) => finalCanvas.toBlob((b) => res(b!), "image/png"));
      const path = `avatars/${user.id}.png`;
      await supabase.storage.from("avatars").upload(path, blob, { upsert: true });
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const finalUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase
        .from("profiles")
        .update({ avatar_url: finalUrl } as any)
        .eq("user_id", user.id);
      setAvatarUrl(finalUrl);
      setCropSrc(null);
      toast.success("Avatar atualizado!");
    } catch {
      toast.error("Erro ao salvar avatar.");
    } finally {
      setSaving(false);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: cropOffset.x, oy: cropOffset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setCropOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.startX),
      y: dragRef.current.oy + (e.clientY - dragRef.current.startY),
    });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const minScale = Math.min(
    CROP_SIZE / (cropImgRef.current?.naturalWidth || CROP_SIZE),
    CROP_SIZE / (cropImgRef.current?.naturalHeight || CROP_SIZE)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <h1 className="text-2xl font-extrabold tracking-tight mb-6">Perfil</h1>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-border" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                <User className="w-10 h-10 text-muted-foreground" />
              </div>
            )}
            <label className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-6 h-6 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
        </div>

        {/* Crop modal */}
        {cropSrc && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-card rounded-3xl p-5 space-y-4 max-w-sm w-full shadow-lg">
              <p className="text-sm font-bold text-foreground text-center">Ajustar foto</p>
              <div className="flex justify-center">
                <canvas
                  ref={cropCanvasRef}
                  width={CROP_SIZE}
                  height={CROP_SIZE}
                  className="rounded-full cursor-grab active:cursor-grabbing touch-none"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                />
              </div>
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-muted-foreground" />
                <input
                  type="range"
                  min={minScale}
                  max={3}
                  step={0.01}
                  value={cropScale}
                  onChange={(e) => setCropScale(Number(e.target.value))}
                  className="flex-1"
                />
                <ZoomIn className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCropSrc(null)} className="flex-1 py-2.5 rounded-full border border-border text-foreground font-medium text-sm hover:bg-muted transition-all">
                  Cancelar
                </button>
                <button onClick={handleCropSave} disabled={saving} className="flex-1 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Name */}
        <div className="rounded-3xl bg-card shadow-sm p-5 mb-4">
          <label className="text-xs text-muted-foreground font-medium block mb-2">Nome de exibição</label>
          <div className="flex gap-2">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary/50"
              placeholder="Seu nome"
            />
            <button
              onClick={handleSaveName}
              disabled={saving}
              className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all disabled:opacity-50"
            >
              Salvar
            </button>
          </div>
        </div>

        {/* Reminder */}
        <div className="rounded-3xl bg-card shadow-sm p-5 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Lembrete de leitura</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {reminderEnabled ? `Ativo · todos os dias às ${reminderTime}` : "Desativado — toque para ativar"}
              </p>
            </div>
            <button
              onClick={() => handleToggleReminder(!reminderEnabled)}
              disabled={savingReminder}
              aria-checked={reminderEnabled}
              className={`relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                reminderEnabled ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <span
                className={`inline-block w-5 h-5 mt-0.5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                  reminderEnabled ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Notification Settings (full component) */}
        <NotificationSettings initialEnabled={reminderEnabled} initialTime={reminderTime} />
      </div>
    </div>
  );
};

export default Profile;
