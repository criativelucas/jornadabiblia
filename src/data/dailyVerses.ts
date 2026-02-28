export interface DailyVerse {
  ref: string;
  texto: string;
}

export const dailyVerses: DailyVerse[] = [
  { ref: "Filipenses 4:13", texto: "Posso tudo naquele que me fortalece." },
  { ref: "Salmos 23:1", texto: "O Senhor é o meu pastor e nada me faltará." },
  { ref: "Jeremias 29:11", texto: "Porque eu sei os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro." },
  { ref: "Isaías 40:31", texto: "Mas aqueles que esperam no Senhor renovarão as suas forças. Voarão como águias; correrão e não ficarão exaustos; caminharão e não se cansarão." },
  { ref: "Romanos 8:28", texto: "Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus." },
  { ref: "Provérbios 3:5-6", texto: "Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento. Reconheça-o em todos os seus caminhos, e ele endireitará as suas veredas." },
  { ref: "João 3:16", texto: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo o que nele crer não pereça, mas tenha a vida eterna." },
  { ref: "Salmos 46:1", texto: "Deus é o nosso refúgio e força, socorro bem presente na angústia." },
  { ref: "Mateus 11:28", texto: "Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei." },
  { ref: "Gálatas 5:22-23", texto: "O fruto do Espírito é amor, alegria, paz, paciência, amabilidade, bondade, fidelidade, mansidão e domínio próprio." },
  { ref: "Salmos 121:2", texto: "O meu socorro vem do Senhor, que fez o céu e a terra." },
  { ref: "2 Coríntios 12:9", texto: "A minha graça é suficiente para você, pois o meu poder se aperfeiçoa na fraqueza." },
  { ref: "Josué 1:9", texto: "Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar." },
  { ref: "Salmos 37:4", texto: "Deleite-se no Senhor, e ele atenderá aos desejos do seu coração." },
  { ref: "Efésios 2:8", texto: "Pois vocês são salvos pela graça, por meio da fé, e isto não vem de vocês, é dom de Deus." },
  { ref: "Romanos 12:2", texto: "Não se amolde ao padrão deste mundo, mas transforme-se pela renovação da sua mente." },
  { ref: "Mateus 6:33", texto: "Busquem, pois, em primeiro lugar o Reino de Deus e a sua justiça, e todas essas coisas serão acrescentadas a vocês." },
  { ref: "Salmos 119:105", texto: "A tua palavra é lâmpada que ilumina os meus passos e luz que clareia o meu caminho." },
  { ref: "1 João 4:4", texto: "Vocês são de Deus, filhinhos, e os venceram, porque aquele que está em vocês é maior do que aquele que está no mundo." },
  { ref: "Deuteronômio 31:6", texto: "Sejam fortes e corajosos. Não tenham medo nem fiquem apavorados por causa delas, pois o Senhor, o seu Deus, vai com vocês; nunca os deixará, nunca os abandonará." },
  { ref: "Salmos 34:18", texto: "O Senhor está perto dos que têm o coração quebrantado e salva os de espírito abatido." },
  { ref: "Isaías 41:10", texto: "Não tema, pois estou com você; não se apavore, pois sou o seu Deus. Eu o fortalecerei e o ajudarei; eu o sustentarei com a minha destra fiel." },
  { ref: "Hebreus 11:1", texto: "Ora, a fé é a certeza daquilo que esperamos e a prova das coisas que não vemos." },
  { ref: "2 Timóteo 1:7", texto: "Pois Deus não nos deu espírito de covardia, mas de poder, de amor e de equilíbrio." },
  { ref: "1 Coríntios 13:13", texto: "Agora, pois, permanecem a fé, a esperança e o amor, estes três; porém o maior destes é o amor." },
  { ref: "Tiago 1:2-3", texto: "Considerem motivo de grande alegria, meus irmãos, quando vocês enfrentarem provações de várias espécies, pois sabem que a provação da sua fé produz perseverança." },
  { ref: "Salmos 16:8", texto: "Tenho posto o Senhor sempre diante de mim; porque ele está à minha mão direita, não serei abalado." },
  { ref: "João 14:27", texto: "Deixo-lhes a paz; a minha paz lhes dou. Não a dou como o mundo a dá. Não se perturbem os seus corações, nem tenham medo." },
  { ref: "Miquéias 6:8", texto: "O que o Senhor requer de você: que pratique a justiça, que seja fiel e leal e que viva em humilde comunhão com o seu Deus." },
  { ref: "Habacuque 3:19", texto: "O Senhor Soberano é a minha força! Ele me dá a leveza dos pés de uma cerva e me conduz com segurança pelas alturas." },
];

export function getTodayVerse(): DailyVerse {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return dailyVerses[dayOfYear % dailyVerses.length];
}
