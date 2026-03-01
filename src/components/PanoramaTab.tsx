import { useState } from 'react';
import { ChevronDown, BookOpen, Map } from 'lucide-react';
import { panoramaSections } from '@/data/panoramaData';
import { bibleBooks, getReadChaptersByBook } from '@/data/bibleBooks';

interface Props {
  completedDays: Set<string>;
  allDays: string[];
  months: string[][];
}

type FilterId = 'all' | 'AT' | 'NT' | 'category';

const PanoramaTab = ({ completedDays, allDays, months }: Props) => {
  const [filter, setFilter] = useState<FilterId>('all');
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const readChapters = getReadChaptersByBook(completedDays, allDays, months);

  const filters: { id: FilterId; label: string }[] = [
    { id: 'all', label: 'Visão Geral' },
    { id: 'AT', label: 'Antigo Testamento' },
    { id: 'NT', label: 'Novo Testamento' },
  ];

  const sections = panoramaSections.filter(s => {
    if (filter === 'AT') return s.testament === 'AT';
    if (filter === 'NT') return s.testament === 'NT';
    return true;
  });

  const getBookChapters = (name: string) => {
    const book = bibleBooks.find(b => b.name === name);
    return book?.chapters || 0;
  };

  const getBookRead = (name: string) => readChapters.get(name)?.size || 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Map className="w-5 h-5 text-primary" />
          Panorama Bíblico
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Uma visão geral da Palavra de Deus</p>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-xs font-medium border whitespace-nowrap transition-all ${filter === f.id ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:bg-muted'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {sections.map(section => (
          <div key={section.category} className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground">{section.category}</h4>
                <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">{section.books.length} livros</span>
              </div>
            </div>

            <div className="divide-y divide-border">
              {section.books.map(book => {
                const total = getBookChapters(book.name);
                const read = getBookRead(book.name);
                const progress = total > 0 ? Math.round((read / total) * 100) : 0;
                const isExpanded = expandedBook === book.name;

                return (
                  <div key={book.name}>
                    <button onClick={() => setExpandedBook(isExpanded ? null : book.name)}
                      className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-all">
                      <BookOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{book.name}</span>
                          {progress > 0 && <span className="text-[10px] text-primary font-medium">{progress}%</span>}
                        </div>
                        {total > 0 && (
                          <div className="h-1 w-full max-w-[120px] bg-muted rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 text-sm">
                        <div><p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Resumo</p><p className="text-muted-foreground leading-relaxed">{book.resumo}</p></div>
                        <div><p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Temas</p><p className="text-muted-foreground">{book.temas}</p></div>
                        <div><p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Propósito</p><p className="text-muted-foreground">{book.proposito}</p></div>
                        <div><p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Aplicação</p><p className="text-muted-foreground">{book.aplicacao}</p></div>
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <p className="text-xs font-semibold text-primary mb-1">Curiosidade</p>
                          <p className="text-muted-foreground text-xs">{book.curiosidade}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PanoramaTab;
