import { useState } from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { bibleBooks, getReadChaptersByBook } from '@/data/bibleBooks';

interface Props { completedDays: Set<string>; allDays: string[]; months: string[][]; }
type Filter = 'all' | 'AT' | 'NT' | 'done';

const TrophiesTab = ({ completedDays, allDays, months }: Props) => {
  const [filter, setFilter] = useState<Filter>('all');
  const readChapters = getReadChaptersByBook(completedDays, allDays, months);

  const getBookProgress = (bookName: string) => readChapters.get(bookName)?.size || 0;
  const completedBooks = bibleBooks.filter(b => getBookProgress(b.name) >= b.chapters);

  const filtered = bibleBooks.filter(b => {
    if (filter === 'AT') return b.testament === 'AT';
    if (filter === 'NT') return b.testament === 'NT';
    if (filter === 'done') return getBookProgress(b.name) >= b.chapters;
    return true;
  });

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'AT', label: 'AT' },
    { id: 'NT', label: 'NT' },
    { id: 'done', label: 'Concluídos' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Troféus
        </h3>
        <span className="text-primary font-bold text-lg">{completedBooks.length}<span className="text-muted-foreground font-normal text-sm">/66</span></span>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${filter === f.id ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {filtered.map(book => {
          const read = getBookProgress(book.name);
          const isDone = read >= book.chapters;
          const progress = Math.min(100, (read / book.chapters) * 100);

          return (
            <div key={book.name} className={`relative p-3 rounded-xl border text-center transition-all ${isDone ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
              {isDone && <CheckCircle2 className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-lime" />}
              <BookOpen className={`w-6 h-6 mx-auto ${isDone ? 'text-primary' : 'text-muted-foreground/40'}`} />
              <p className="text-[10px] font-medium text-foreground mt-1.5 truncate">{book.name}</p>
              <p className="text-[9px] text-muted-foreground">{read}/{book.chapters}</p>
              <div className="mt-1">
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${book.testament === 'AT' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {book.testament}
                </span>
              </div>
              {!isDone && (
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden mt-1.5">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Need Award icon
import { Award } from 'lucide-react';

export default TrophiesTab;
