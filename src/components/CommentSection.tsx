import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { display_name: string };
}

interface CommentSectionProps {
  monthIndex: number;
  dayIndex: number;
  user: User | null;
}

const CommentSection = ({ monthIndex, dayIndex, user }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [monthIndex, dayIndex]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('id, user_id, content, created_at')
      .eq('month_index', monthIndex)
      .eq('day_index', dayIndex)
      .order('created_at', { ascending: true });

    if (error) return;

    // Fetch profiles for these comments
    const userIds = [...new Set((data || []).map(c => c.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);
      setComments((data || []).map(c => ({
        ...c,
        profile: { display_name: profileMap.get(c.user_id) || 'Anônimo' }
      })));
    } else {
      setComments([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('comments').insert({
      user_id: user.id,
      month_index: monthIndex,
      day_index: dayIndex,
      content: newComment.trim().substring(0, 1000),
    });

    if (error) {
      toast.error('Erro ao enviar comentário.');
    } else {
      setNewComment('');
      fetchComments();
    }
    setLoading(false);
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) fetchComments();
  };

  return (
    <div className="mt-3 pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 mb-3 text-sm text-slate-400">
        <MessageCircle className="w-4 h-4" />
        <span>{comments.length} comentário{comments.length !== 1 ? 's' : ''}</span>
      </div>

      {comments.length > 0 && (
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/5 text-sm">
              <div className="flex-grow min-w-0">
                <span className="font-semibold text-indigo-300">{c.profile?.display_name}</span>
                <p className="text-slate-300 mt-0.5 break-words">{c.content}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {new Date(c.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              {user?.id === c.user_id && (
                <button onClick={() => handleDelete(c.id)} className="flex-shrink-0 p-1 text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escreva um comentário..."
            maxLength={1000}
            className="flex-grow px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400/50 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !newComment.trim()}
            className="px-3 py-2 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/30 transition-all disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <p className="text-xs text-slate-500 italic">Faça login para comentar.</p>
      )}
    </div>
  );
};

export default CommentSection;
