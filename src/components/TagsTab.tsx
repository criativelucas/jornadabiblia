import { useState, useEffect } from 'react';
import { Tag, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { availableTags } from '@/data/tagDefinitions';
import { bibleBooks } from '@/data/bibleBooks';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

interface Props {
  user: User | null;
}

type View = 'add' | 'index';

const TagsTab = ({ user }: Props) => {
  const [view, setView] = useState<View>('add');
  const [selectedBook, setSelectedBook] = useState(bibleBooks[0].name);
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [chapterTags, setChapterTags] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(false);

  const currentBook = bibleBooks.find(b => b.name === selectedBook)!;

  useEffect(() => {
    if (!user) return;
    loadTags();
  }, [user]);

  const loadTags = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('chapter_tags')
      .select('chapter_key, tag')
      .eq('user_id', user.id);
    if (data) {
      const map = new Map<string, string[]>();
      data.forEach(row => {
        const key = row.chapter_key;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(row.tag);
      });
      setChapterTags(map);
    }
  };

  const chapterKey = `${selectedBook}_${selectedChapter}`;
  const currentTags = chapterTags.get(chapterKey) || [];

  const toggleTag = async (tagName: string) => {
    if (!user) { toast.error('Faça login para usar tags.'); return; }
    setLoading(true);

    const has = currentTags.includes(tagName);
    if (has) {
      await supabase
        .from('chapter_tags')
        .delete()
        .eq('user_id', user.id)
        .eq('chapter_key', chapterKey)
        .eq('tag', tagName);
      toast('Tag removida');
    } else {
      await supabase.from('chapter_tags').insert({
        user_id: user.id,
        chapter_key: chapterKey,
        tag: tagName,
      });
      toast('Tag salva');
    }

    await loadTags();
    setLoading(false);
  };

  // Build index grouped by tag
  const tagIndex = new Map<string, string[]>();
  chapterTags.forEach((tags, key) => {
    tags.forEach(tag => {
      if (!tagIndex.has(tag)) tagIndex.set(tag, []);
      tagIndex.get(tag)!.push(key.replace('_', ' '));
    });
  });

  if (!user) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center">
        <Tag className="w-10 h-10 mx-auto opacity-30 text-slate-500 mb-3" />
        <p className="text-slate-400 text-sm">Faça login para usar tags temáticas.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/10 bg-white/5">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Tag className="w-5 h-5 text-purple-400" />
          Tags Temáticas
        </h3>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setView('add')}
            className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${view === 'add' ? 'bg-purple-500/20 border-purple-400/40 text-purple-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
          >
            Adicionar
          </button>
          <button
            onClick={() => setView('index')}
            className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${view === 'index' ? 'bg-purple-500/20 border-purple-400/40 text-purple-300' : 'bg-white/5 border-white/10 text-slate-400'}`}
          >
            Índice Pessoal
          </button>
        </div>
      </div>

      {view === 'add' ? (
        <div className="p-6 space-y-4">
          {/* Book selector */}
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1 block">Livro</label>
            <select
              value={selectedBook}
              onChange={e => { setSelectedBook(e.target.value); setSelectedChapter(1); }}
              className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-400/50"
            >
              {bibleBooks.map(b => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Chapter selector */}
          <div>
            <label className="text-xs text-slate-400 font-medium mb-1 block">Capítulo</label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-hide">
              {Array.from({ length: currentBook.chapters }, (_, i) => i + 1).map(ch => (
                <button
                  key={ch}
                  onClick={() => setSelectedChapter(ch)}
                  className={`w-9 h-9 rounded-lg text-xs font-medium border transition-all ${
                    selectedChapter === ch
                      ? 'bg-purple-500/20 border-purple-400/40 text-purple-300'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* Tag chips */}
          <div>
            <label className="text-xs text-slate-400 font-medium mb-2 block flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              {selectedBook} {selectedChapter}
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => {
                const isSelected = currentTags.includes(tag.name);
                return (
                  <button
                    key={tag.name}
                    onClick={() => toggleTag(tag.name)}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all disabled:opacity-40"
                    style={{
                      borderColor: isSelected ? tag.color : 'rgba(255,255,255,0.1)',
                      backgroundColor: isSelected ? `${tag.color}20` : 'rgba(255,255,255,0.03)',
                      color: isSelected ? tag.color : '#94a3b8',
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6">
          {tagIndex.size === 0 ? (
            <div className="text-center py-8">
              <Tag className="w-10 h-10 mx-auto opacity-30 text-slate-500 mb-3" />
              <p className="text-slate-400 text-sm">Nenhuma tag adicionada ainda.</p>
              <p className="text-slate-500 text-xs mt-1">Comece etiquetando um capítulo!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableTags
                .filter(t => tagIndex.has(t.name))
                .map(tag => (
                  <div key={tag.name}>
                    <p className="text-sm font-bold mb-2" style={{ color: tag.color }}>{tag.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tagIndex.get(tag.name)!.map(ch => (
                        <span key={ch} className="px-2.5 py-1 rounded-lg text-xs bg-white/5 border border-white/10 text-slate-300">
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TagsTab;
