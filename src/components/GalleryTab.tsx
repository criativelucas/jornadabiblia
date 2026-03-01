import { useState } from 'react';
import { Image as ImageIcon, ImageOff, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { bibleBooks } from '@/data/bibleBooks';
import { galleryImages } from '@/data/galleryData';

const GalleryTab = () => {
  const [selectedBook, setSelectedBook] = useState(bibleBooks[0].name);
  const [fullscreen, setFullscreen] = useState<{ src: string; legenda: string } | null>(null);
  const [fullscreenIdx, setFullscreenIdx] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const photos = galleryImages[selectedBook] || [];
  const filteredBooks = bibleBooks.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const booksWithPhotos = Object.keys(galleryImages).filter(k => galleryImages[k].length > 0);
  const totalPhotos = Object.values(galleryImages).reduce((sum, arr) => sum + arr.length, 0);

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

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          Galeria
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalPhotos} fotos em {booksWithPhotos.length} livros
        </p>
      </div>

      {/* Book search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar livro..."
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
      </div>

      {/* Book pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {filteredBooks.slice(0, 30).map(b => {
          const count = (galleryImages[b.name] || []).length;
          return (
            <button key={b.name} onClick={() => setSelectedBook(b.name)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${selectedBook === b.name ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
              {b.name}{count > 0 && <span className="ml-1 text-[10px] opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Photo grid */}
      {photos.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <ImageOff className="w-10 h-10 mx-auto opacity-30 text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">Nenhuma foto para {selectedBook}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((photo, idx) => (
            <button key={photo.id} onClick={() => openFullscreen(idx)} className="aspect-square rounded-xl overflow-hidden border border-border relative group">
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
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setFullscreen(null)}>
          <button onClick={() => setFullscreen(null)} className="absolute top-4 right-4 text-white z-10"><X className="w-6 h-6" /></button>
          <p className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm z-10">{fullscreenIdx + 1} / {photos.length}</p>
          {fullscreenIdx > 0 && (
            <button onClick={e => { e.stopPropagation(); navigateFullscreen(-1); }} className="absolute left-4 text-white z-10"><ChevronLeft className="w-8 h-8" /></button>
          )}
          {fullscreenIdx < photos.length - 1 && (
            <button onClick={e => { e.stopPropagation(); navigateFullscreen(1); }} className="absolute right-4 text-white z-10"><ChevronRight className="w-8 h-8" /></button>
          )}
          <img src={fullscreen.src} alt={fullscreen.legenda} className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
          {fullscreen.legenda && <p className="absolute bottom-6 left-0 right-0 text-center text-white text-sm">{fullscreen.legenda}</p>}
        </div>
      )}
    </div>
  );
};

export default GalleryTab;
