export interface Milestone {
  dias: number;
  titulo: string;
  emoji: string;
  descricao: string;
}

export const milestones: Milestone[] = [
  { dias: 3, titulo: "Iniciante Fiel", emoji: "🌱", descricao: "3 dias seguidos — o começo de algo especial!" },
  { dias: 7, titulo: "Fiel como Daniel", emoji: "🦁", descricao: "7 dias de sequência!" },
  { dias: 14, titulo: "Determinado como Neemias", emoji: "🧱", descricao: "2 semanas sem parar!" },
  { dias: 30, titulo: "Perseverante como Jó", emoji: "🌪️", descricao: "30 dias consecutivos — incrível!" },
  { dias: 60, titulo: "Corajoso como Josué", emoji: "⚔️", descricao: "60 dias de leitura!" },
  { dias: 100, titulo: "Forte como Paulo", emoji: "⚓", descricao: "100 dias — você é extraordinário!" },
  { dias: 180, titulo: "Devoto como Davi", emoji: "🎵", descricao: "6 meses de sequência!" },
  { dias: 365, titulo: "Sábio como Salomão", emoji: "👑", descricao: "Um ano inteiro de leitura!" },
];
