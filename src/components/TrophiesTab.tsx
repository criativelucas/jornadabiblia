import { useState } from 'react';
import { bibleBooks, getReadChaptersByBook } from '@/data/bibleBooks';

interface Props {
  completedDays: Set<string>;
  allDays: string[];
  months: string[][];
}

type Filter = 'all' | 'AT' | 'NT' | 'done';

const TrophiesTab = ({ completedDays, allDays, months }: Props) => {
  const [filter, setFilter] = useState<Filter>('all');
  const readChapters = getReadChaptersByBook(completedDays, allDays, months);

  const getBookProgress = (bookName: string, totalChapters: number) => {
    const read = readChapters.get(bookName);
    return read ? read.size : 0;
  };

  const completedBooks = bibleBooks.filter(b => getBookProgress(b.name, b.chapters) >= b.chapters);

  const filtered = bibleBooks.filter(b => {
    if (filter === 'AT') return b.testament === 'AT';
    if (filter === 'NT') return b.testament === 'NT';
    if (filter === 'done') return getBookProgress(b.name, b.chapters) >= b.chapters;
    return true;
  });

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'AT', label: 'Antigo Testamento' },
    { id: 'NT', label: 'Novo Testamento' },
    { id: 'done', label: 'Concluídos' },
  ];

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
      <div className="p-6 border-b border-white/10 bg-white/5">
        <h3 className="text-lg font-bold flex items-center gap-2">
          🏆 Troféus
        </h3>
        <p className="text-yellow-400 font-bold text-2xl mt-2">{completedBooks.length}/66 <span className="text-sm font-normal text-slate-400">livros</span></p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-6 py-4 overflow-x-auto scrollbar-hide">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${
              filter === f.id
                ? 'bg-yellow-500/20 border-yellow-400/40 text-yellow-300'
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="p-4 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {filtered.map(book => {
          const read = getBookProgress(book.name, book.chapters);
          const isDone = read >= book.chapters;
          const progress = Math.min(100, (read / book.chapters) * 100);

          return (
            <div
              key={book.name}
              className={`relative p-3 rounded-xl border text-center transition-all ${
                isDone
                  ? 'bg-yellow-500/10 border-yellow-400/30'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {isDone && (
                <div className="absolute top-1 right-1 text-yellow-400 text-[10px]">✅</div>
              )}
              <div className={`text-2xl ${isDone ? '' : 'opacity-40'}`}>{book.emoji}</div>
              <p className="text-[10px] font-medium text-slate-300 mt-1 truncate">{book.name}</p>
              <p className="text-[9px] text-slate-500">{read}/{book.chapters}</p>
              {!isDone && (
                <div className="h-1 w-full bg-black/30 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrophiesTab;
