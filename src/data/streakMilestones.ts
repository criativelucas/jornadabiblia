export interface Milestone {
  dias: number;
  titulo: string;
  emoji: string;
  descricao: string;
  icon: string;
  cor: string;
}

export const milestones: Milestone[] = [
  { dias: 3, titulo: "Iniciante Fiel", emoji: "🌱", descricao: "3 dias seguidos — o começo de algo especial!", icon: "Flame", cor: "#F97316" },
  { dias: 7, titulo: "Fiel como Daniel", emoji: "🦁", descricao: "7 dias de sequência!", icon: "Shield", cor: "#1A56FF" },
  { dias: 14, titulo: "Determinado como Neemias", emoji: "🧱", descricao: "2 semanas sem parar!", icon: "Layers", cor: "#8B5CF6" },
  { dias: 30, titulo: "Perseverante como Jó", emoji: "🌪️", descricao: "30 dias consecutivos — incrível!", icon: "Star", cor: "#F59E0B" },
  { dias: 60, titulo: "Corajoso como Josué", emoji: "⚔️", descricao: "60 dias de leitura!", icon: "Sword", cor: "#EF4444" },
  { dias: 100, titulo: "Forte como Paulo", emoji: "⚓", descricao: "100 dias — você é extraordinário!", icon: "Anchor", cor: "#06B6D4" },
  { dias: 180, titulo: "Devoto como Davi", emoji: "🎵", descricao: "6 meses de sequência!", icon: "Music", cor: "#EC4899" },
  { dias: 365, titulo: "Sábio como Salomão", emoji: "👑", descricao: "Um ano inteiro de leitura!", icon: "Crown", cor: "#CCFF00" },
];
