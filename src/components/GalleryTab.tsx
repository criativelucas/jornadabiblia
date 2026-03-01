import { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, X, Trash2, ImageOff, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { bibleBooks } from '@/data/bibleBooks';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

interface Photo {
  id: string;
  book: string;
  caption: string | null;
  file_path: string;
  created_at: string;
  url?: string;
}

interface Props { user: User | null; }

const GalleryTab = ({ user }: Props) => {
  const [selectedBook, setSelectedBook] = useState(bibleBooks[0].name);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState('');
  const [fullscreen, setFullscreen] = useState<Photo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalPhotos, setTotalPhotos] = useState(0);

  useEffect(() => { if (user) loadPhotos(); }, [user, selectedBook]);
  useEffect(() => { if (user) loadTotalCount(); }, [user]);

  const loadTotalCount = async () => {
    if (!user) return;
    const { count } = await supabase.from('gallery_photos').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    setTotalPhotos(count || 0);
  };

  const loadPhotos = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('gallery_photos').select('*').eq('user_id', user.id).eq('book', selectedBook).order('created_at', { ascending: false });
    if (data) {
      const withUrls = await Promise.all(data.map(async (p: any) => {
        const { data: urlData } = await supabase.storage.from('gallery').createSignedUrl(p.file_path, 3600);
        return { ...p, url: urlData?.signedUrl };
      }));
      setPhotos(withUrls);
    }
    setLoading(false);
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande. Use uma foto menor que 5MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Apenas imagens são aceitas.'); return; }

    setLoading(true);
    const filePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from('gallery').upload(filePath, file);
    if (uploadErr) { toast.error('Erro no upload.'); setLoading(false); return; }

    const { error: dbErr } = await supabase.from('gallery_photos').insert({
      user_id: user.id,
      book: selectedBook,
      caption: caption.trim() || null,
      file_path: filePath,
    });

    if (dbErr) { toast.error('Erro ao salvar foto.'); } else {
      toast.success(`Foto adicionada a ${selectedBook}`);
      setCaption('');
      setShowUpload(false);
      loadPhotos();
      loadTotalCount();
    }
    setLoading(false);
  };

  const handleDelete = async (photo: Photo) => {
    if (!confirm('Deseja remover esta foto?')) return;
    await supabase.storage.from('gallery').remove([photo.file_path]);
    await supabase.from('gallery_photos').delete().eq('id', photo.id);
    setFullscreen(null);
    loadPhotos();
    loadTotalCount();
    toast.success('Foto removida.');
  };

  const filteredBooks = bibleBooks.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!user) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <ImageIcon className="w-10 h-10 mx-auto opacity-30 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">Faça login para usar a galeria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Galeria
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{totalPhotos} fotos no total</p>
        </div>
      </div>

      {/* Book selector */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar livro..."
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {filteredBooks.slice(0, 20).map(b => (
          <button key={b.name} onClick={() => setSelectedBook(b.name)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${selectedBook === b.name ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
            {b.name}
          </button>
        ))}
      </div>

      {/* Photo grid */}
      {photos.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <ImageOff className="w-10 h-10 mx-auto opacity-30 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">Nenhuma foto para {selectedBook}.</p>
          <button onClick={() => setShowUpload(true)} className="mt-3 text-xs text-primary font-medium hover:underline">Adicionar primeira foto +</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map(photo => (
            <button key={photo.id} onClick={() => setFullscreen(photo)} className="aspect-square rounded-xl overflow-hidden border border-border relative group">
              {photo.url && <img src={photo.url} alt={photo.caption || photo.book} className="w-full h-full object-cover" />}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                {photo.caption && <span className="text-white text-xs truncate">{photo.caption}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setShowUpload(true)} className="fixed bottom-6 right-6 lg:right-auto lg:bottom-6 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-all z-30">
        <Plus className="w-5 h-5" />
      </button>

      {/* Upload sheet */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowUpload(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-lg bg-card border-t border-border rounded-t-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-foreground">Adicionar foto</h4>
              <button onClick={() => setShowUpload(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground">Livro: <span className="text-foreground font-medium">{selectedBook}</span></p>
            <input type="text" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Legenda (opcional)" maxLength={100}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
            <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              className="w-full text-sm text-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-primary-foreground file:font-medium file:cursor-pointer" />
          </div>
        </div>
      )}

      {/* Fullscreen lightbox */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setFullscreen(null)}>
          <button onClick={() => setFullscreen(null)} className="absolute top-4 right-4 text-white z-10"><X className="w-6 h-6" /></button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(fullscreen); }} className="absolute top-4 left-4 text-white z-10"><Trash2 className="w-5 h-5" /></button>
          {fullscreen.url && <img src={fullscreen.url} alt={fullscreen.caption || ''} className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />}
          {fullscreen.caption && <p className="absolute bottom-6 left-0 right-0 text-center text-white text-sm">{fullscreen.caption}</p>}
        </div>
      )}
    </div>
  );
};

export default GalleryTab;
