import { useState, useEffect, useRef } from "react";
import {
  Image as ImageIcon,
  ImageOff,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Trash2,
  Upload,
  Sparkles,
} from "lucide-react";
import { bibleBooks } from "@/data/bibleBooks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ConfirmModal from "./ConfirmModal";

interface GalleryPhoto {
  id: string;
  src: string; // URL full
  thumb: string; // URL miniatura (carregamento rápido)
  legenda: string;
  book: string;
}

const sanitizeKey = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

// Gera URL de thumbnail via Supabase Image Transformation
const thumbUrl = (path: string) =>
  `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/render/image/public/gallery/${path}?width=320&quality=65&resize=cover`;

const fullUrl = (path: string) => `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/gallery/${path}`;

// ─── Lazy image com fade-in ───────────────────────────────────────
function LazyImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={`${className} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}

const GalleryTab = () => {
  const { user } = useAuth();
  const [selectedBook, setSelectedBook] = useState<string | null>(null); // null = mosaico
  const [fullscreen, setFullscreen] = useState<GalleryPhoto | null>(null);
  const [fullscreenIdx, setFullscreenIdx] = useState(0);
  const [fullscreenList, setFullscreenList] = useState<GalleryPhoto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [bookPhotos, setBookPhotos] = useState<GalleryPhoto[]>([]);
  const [mosaicPhotos, setMosaicPhotos] = useState<GalleryPhoto[]>([]);
  const [allPhotoCounts, setAllPhotoCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [mosaicLoading, setMosaicLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadBook, setUploadBook] = useState(bibleBooks[0].name);
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  const filteredBooks = bibleBooks.filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Admin check
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .then(({ data }) => setIsAdmin(!!(data && data.length > 0)));
  }, [user]);

  // Contagem de fotos por livro
  useEffect(() => {
    supabase
      .from("gallery_photos")
      .select("book")
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        data.forEach((d) => {
          counts[d.book] = (counts[d.book] || 0) + 1;
        });
        setAllPhotoCounts(counts);
      });
  }, []);

  // Mosaico geral — até 30 fotos recentes de todos os livros
  useEffect(() => {
    setMosaicLoading(true);
    supabase
      .from("gallery_photos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) {
          setMosaicPhotos(
            data.map((d) => ({
              id: d.id,
              src: fullUrl(d.file_path),
              thumb: thumbUrl(d.file_path),
              legenda: d.caption || "",
              book: d.book,
            })),
          );
        }
        setMosaicLoading(false);
      });
  }, []);

  // Fotos do livro selecionado
  useEffect(() => {
    if (!selectedBook) return;
    setLoading(true);
    supabase
      .from("gallery_photos")
      .select("*")
      .eq("book", selectedBook)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setBookPhotos(
            data.map((d) => ({
              id: d.id,
              src: fullUrl(d.file_path),
              thumb: thumbUrl(d.file_path),
              legenda: d.caption || "",
              book: d.book,
            })),
          );
        } else {
          setBookPhotos([]);
        }
        setLoading(false);
      });
  }, [selectedBook]);

  const totalPhotos = Object.values(allPhotoCounts).reduce((s, n) => s + n, 0);
  const booksWithPhotos = Object.keys(allPhotoCounts).filter((k) => allPhotoCounts[k] > 0).length;

  const openFullscreen = (photos: GalleryPhoto[], idx: number) => {
    setFullscreenList(photos);
    setFullscreenIdx(idx);
    setFullscreen(photos[idx]);
  };

  const navigateFullscreen = (dir: 1 | -1) => {
    const next = fullscreenIdx + dir;
    if (next >= 0 && next < fullscreenList.length) {
      setFullscreenIdx(next);
      setFullscreen(fullscreenList[next]);
    }
  };

  // Swipe no lightbox (mobile)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) navigateFullscreen(diff > 0 ? 1 : -1);
    touchStartX.current = null;
  };

  const handleDeletePhoto = async (photoId: string) => {
    const { data: photoData } = await supabase.from("gallery_photos").select("file_path").eq("id", photoId).single();
    if (photoData) await supabase.storage.from("gallery").remove([photoData.file_path]);
    await supabase.from("gallery_photos").delete().eq("id", photoId);
    setBookPhotos((p) => p.filter((x) => x.id !== photoId));
    setMosaicPhotos((p) => p.filter((x) => x.id !== photoId));
    if (selectedBook) setAllPhotoCounts((p) => ({ ...p, [selectedBook]: Math.max(0, (p[selectedBook] || 1) - 1) }));
    setFullscreen(null);
    setDeleteConfirmId(null);
    toast.success("Foto removida.");
  };

  const handleUpload = async () => {
    if (!uploadFile || !user) return;
    if (uploadFile.size > 5 * 1024 * 1024) {
      toast.error("Máximo 5MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(uploadFile.type)) {
      toast.error("Use JPEG, PNG ou WEBP.");
      return;
    }
    setUploading(true);
    try {
      const ext = uploadFile.name.split(".").pop();
      const filePath = `${sanitizeKey(uploadBook)}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("gallery").upload(filePath, uploadFile);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("gallery_photos").insert({
        user_id: user.id,
        book: uploadBook,
        file_path: filePath,
        caption: uploadCaption || null,
      } as any);
      if (dbErr) throw dbErr;
      toast.success(`Imagem publicada em ${uploadBook} ✓`);
      setShowUpload(false);
      setUploadFile(null);
      setUploadCaption("");
      setAllPhotoCounts((p) => ({ ...p, [uploadBook]: (p[uploadBook] || 0) + 1 }));
      // Recarrega fotos relevantes
      if (uploadBook === selectedBook) {
        const { data } = await supabase
          .from("gallery_photos")
          .select("*")
          .eq("book", selectedBook)
          .order("created_at", { ascending: false });
        if (data)
          setBookPhotos(
            data.map((d) => ({
              id: d.id,
              src: fullUrl(d.file_path),
              thumb: thumbUrl(d.file_path),
              legenda: d.caption || "",
              book: d.book,
            })),
          );
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao publicar.");
    } finally {
      setUploading(false);
    }
  };

  const currentPhotos = selectedBook ? bookPhotos : mosaicPhotos;

  return (
    <div className="space-y-4">
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        title="Remover foto?"
        message="Deseja remover esta foto? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        variant="danger"
        onConfirm={() => deleteConfirmId && handleDeletePhoto(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          Galeria
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalPhotos} fotos em {booksWithPhotos} livros
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar livro..."
          className="w-full pl-9 pr-4 py-2 rounded-[10px] bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Book pills — "Todas" primeiro */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
        <button
          onClick={() => setSelectedBook(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all flex items-center gap-1 ${
            selectedBook === null
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-card border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <Sparkles className="w-3 h-3" /> Todas
        </button>
        {filteredBooks
          .filter((b) => allPhotoCounts[b.name] > 0)
          .map((b) => (
            <button
              key={b.name}
              onClick={() => setSelectedBook(b.name)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${
                selectedBook === b.name
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {b.name}
              <span className="ml-1 text-[10px] opacity-70">({allPhotoCounts[b.name]})</span>
            </button>
          ))}
        {/* Livros sem fotos por último */}
        {filteredBooks
          .filter((b) => !allPhotoCounts[b.name])
          .map((b) => (
            <button
              key={b.name}
              onClick={() => setSelectedBook(b.name)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${
                selectedBook === b.name
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:bg-muted opacity-50"
              }`}
            >
              {b.name}
            </button>
          ))}
      </div>

      {/* Mosaico ou grid do livro */}
      {(selectedBook ? loading : mosaicLoading) ? (
        /* Skeleton do mosaico */
        <div className="columns-2 sm:columns-3 gap-2 space-y-2">
          {[...Array(9)].map((_, i) => (
            <div
              key={i}
              className="w-full rounded-xl bg-muted animate-pulse mb-2"
              style={{ height: `${120 + (i % 3) * 40}px` }}
            />
          ))}
        </div>
      ) : currentPhotos.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <ImageOff className="w-10 h-10 mx-auto opacity-30 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm mb-3">
            {selectedBook ? "Nenhuma imagem para este livro ainda." : "Nenhuma imagem na galeria ainda."}
          </p>
          {isAdmin && selectedBook && (
            <button
              onClick={() => {
                setUploadBook(selectedBook);
                setShowUpload(true);
              }}
              className="px-4 py-2 rounded-[10px] bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
            >
              Adicionar imagem +
            </button>
          )}
        </div>
      ) : (
        /* Mosaico com columns (masonry nativo CSS) */
        <div className="columns-2 sm:columns-3 gap-2">
          {currentPhotos.map((photo, idx) => (
            <button
              key={photo.id}
              onClick={() => openFullscreen(currentPhotos, idx)}
              className="w-full mb-2 rounded-xl overflow-hidden border border-border relative group block"
            >
              <LazyImage src={photo.thumb} alt={photo.legenda} className="w-full h-auto object-cover" />
              {/* Overlay com livro (no mosaico) ou legenda */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                {!selectedBook && (
                  <span className="text-white text-[10px] font-bold bg-black/40 rounded px-1.5 py-0.5 self-start mb-1">
                    {photo.book}
                  </span>
                )}
                {photo.legenda && <span className="text-white text-xs truncate">{photo.legenda}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setFullscreen(null)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button onClick={() => setFullscreen(null)} className="absolute top-4 right-4 text-white z-10">
            <X className="w-6 h-6" />
          </button>
          <p className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm z-10">
            {fullscreenIdx + 1} / {fullscreenList.length}
            {!selectedBook && <span className="ml-2 text-white/50">· {fullscreen.book}</span>}
          </p>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmId(fullscreen.id);
              }}
              className="absolute top-4 left-4 text-white/70 hover:text-red-400 z-10"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          {fullscreenIdx > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateFullscreen(-1);
              }}
              className="absolute left-4 text-white z-10"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          {fullscreenIdx < fullscreenList.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateFullscreen(1);
              }}
              className="absolute right-4 text-white z-10"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          <img
            src={fullscreen.src}
            alt={fullscreen.legenda}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {fullscreen.legenda && (
            <p className="absolute bottom-6 left-0 right-0 text-center text-white text-sm px-4">{fullscreen.legenda}</p>
          )}
        </div>
      )}

      {/* Admin FAB */}
      {isAdmin && (
        <button
          onClick={() => {
            setUploadBook(selectedBook || bibleBooks[0].name);
            setShowUpload(true);
          }}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Upload bottom sheet */}
      {showUpload && isAdmin && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowUpload(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl p-6 space-y-4"
            style={{ maxHeight: "80vh", overflowY: "auto" }}
          >
            <div className="flex justify-between items-center">
              <h4 className="text-base font-bold text-foreground">Publicar imagem</h4>
              <button onClick={() => setShowUpload(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Livro</label>
              <select
                value={uploadBook}
                onChange={(e) => setUploadBook(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] bg-muted border border-border text-sm text-foreground"
              >
                {bibleBooks.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Imagem</label>
              <label className="flex items-center gap-2 px-4 py-3 rounded-[10px] border border-dashed border-border cursor-pointer hover:bg-muted transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {uploadFile ? uploadFile.name : "Selecionar imagem (JPEG, PNG, WEBP)"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Legenda (opcional)</label>
              <input
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value.slice(0, 120))}
                placeholder="Descreva brevemente..."
                className="w-full px-3 py-2 rounded-[10px] bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground"
                maxLength={120}
              />
              <p className="text-[10px] text-muted-foreground mt-1">{uploadCaption.length}/120</p>
            </div>
            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="w-full py-3 rounded-[10px] bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Publicar imagem
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryTab;
