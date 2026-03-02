import { useState, useEffect } from "react";
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
} from "lucide-react";
import { bibleBooks } from "@/data/bibleBooks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface GalleryPhoto {
  id: string;
  src: string;
  legenda: string;
}

// ─── Converte nome do livro em chave válida para o storage ───────
const sanitizeKey = (name: string): string =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const GalleryTab = () => {
  const { user } = useAuth();
  const [selectedBook, setSelectedBook] = useState(bibleBooks[0].name);
  const [fullscreen, setFullscreen] = useState<GalleryPhoto | null>(null);
  const [fullscreenIdx, setFullscreenIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [allPhotoCounts, setAllPhotoCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadBook, setUploadBook] = useState(bibleBooks[0].name);
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const filteredBooks = bibleBooks.filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Check admin role
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    const checkAdmin = async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
      setIsAdmin(!!(data && data.length > 0));
    };
    checkAdmin();
  }, [user]);

  // Load photo counts for all books
  useEffect(() => {
    const loadCounts = async () => {
      const { data } = await supabase.from("gallery_photos").select("book");
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((d) => {
          counts[d.book] = (counts[d.book] || 0) + 1;
        });
        setAllPhotoCounts(counts);
      }
    };
    loadCounts();
  }, []);

  // Load photos for selected book
  useEffect(() => {
    const loadPhotos = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("gallery_photos")
        .select("*")
        .eq("book", selectedBook)
        .order("created_at", { ascending: false });
      if (data) {
        const mapped = data.map((d) => ({
          id: d.id,
          src: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/gallery/${d.file_path}`,
          legenda: d.caption || "",
        }));
        setPhotos(mapped);
      } else {
        setPhotos([]);
      }
      setLoading(false);
    };
    loadPhotos();
  }, [selectedBook]);

  const totalPhotos = Object.values(allPhotoCounts).reduce((sum, n) => sum + n, 0);
  const booksWithPhotos = Object.keys(allPhotoCounts).filter((k) => allPhotoCounts[k] > 0).length;

  const openFullscreen = (idx: number) => {
    setFullscreenIdx(idx);
    setFullscreen(photos[idx]);
  };

  const navigateFullscreen = (dir: 1 | -1) => {
    const next = fullscreenIdx + dir;
    if (next >= 0 && next < photos.length) {
      setFullscreenIdx(next);
      setFullscreen(photos[next]);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Deseja remover esta foto?")) return;
    const { data: photoData } = await supabase.from("gallery_photos").select("file_path").eq("id", photoId).single();
    if (photoData) {
      await supabase.storage.from("gallery").remove([photoData.file_path]);
    }
    await supabase.from("gallery_photos").delete().eq("id", photoId);
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setAllPhotoCounts((prev) => ({ ...prev, [selectedBook]: Math.max(0, (prev[selectedBook] || 1) - 1) }));
    setFullscreen(null);
    toast.success("Foto removida.");
  };

  const handleUpload = async () => {
    if (!uploadFile || !user) return;
    if (uploadFile.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(uploadFile.type)) {
      toast.error("Use JPEG, PNG ou WEBP.");
      return;
    }

    setUploading(true);
    try {
      const ext = uploadFile.name.split(".").pop();
      // ✅ sanitizeKey remove acentos e caracteres inválidos do nome do livro
      const filePath = `${sanitizeKey(uploadBook)}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("gallery").upload(filePath, uploadFile);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("gallery_photos").insert({
        user_id: user.id,
        book: uploadBook,
        file_path: filePath,
        caption: uploadCaption || null,
      } as any);
      if (dbError) throw dbError;

      toast.success(`Imagem publicada em ${uploadBook} ✓`);
      setShowUpload(false);
      setUploadFile(null);
      setUploadCaption("");
      setAllPhotoCounts((prev) => ({ ...prev, [uploadBook]: (prev[uploadBook] || 0) + 1 }));
      if (uploadBook === selectedBook) {
        const { data } = await supabase
          .from("gallery_photos")
          .select("*")
          .eq("book", selectedBook)
          .order("created_at", { ascending: false });
        if (data)
          setPhotos(
            data.map((d) => ({
              id: d.id,
              src: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/gallery/${d.file_path}`,
              legenda: d.caption || "",
            })),
          );
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao publicar imagem.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          Galeria
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalPhotos} fotos em {booksWithPhotos} livros
        </p>
      </div>

      {/* Book search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar livro..."
          className="w-full pl-9 pr-4 py-2 rounded-[10px] bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Book pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
        {filteredBooks.slice(0, 30).map((b) => {
          const count = allPhotoCounts[b.name] || 0;
          return (
            <button
              key={b.name}
              onClick={() => setSelectedBook(b.name)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${selectedBook === b.name ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}
            >
              {b.name}
              {count > 0 && <span className="ml-1 text-[10px] opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Photo grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <ImageOff className="w-10 h-10 mx-auto opacity-30 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">Nenhuma foto para {selectedBook}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((photo, idx) => (
            <button
              key={photo.id}
              onClick={() => openFullscreen(idx)}
              className="aspect-square rounded-xl overflow-hidden border border-border relative group"
            >
              <img src={photo.src} alt={photo.legenda} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                {photo.legenda && <span className="text-white text-xs truncate">{photo.legenda}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen lightbox */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setFullscreen(null)}
        >
          <button onClick={() => setFullscreen(null)} className="absolute top-4 right-4 text-white z-10">
            <X className="w-6 h-6" />
          </button>
          <p className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm z-10">
            {fullscreenIdx + 1} / {photos.length}
          </p>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeletePhoto(fullscreen.id);
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
          {fullscreenIdx < photos.length - 1 && (
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
            <p className="absolute bottom-6 left-0 right-0 text-center text-white text-sm">{fullscreen.legenda}</p>
          )}
        </div>
      )}

      {/* Admin FAB */}
      {isAdmin && (
        <button
          onClick={() => {
            setUploadBook(selectedBook);
            setShowUpload(true);
          }}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center z-40 hover:opacity-90 transition-opacity"
          aria-label="Adicionar foto"
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
