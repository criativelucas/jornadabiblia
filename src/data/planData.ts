// Plano de Leitura Bíblica Cronológica - 3 opções de duração

export type PlanOption = {
  id: string;
  label: string;
  description: string;
  days: string[];
};

// 6 Meses (180 dias) - Plano fornecido pelo usuário
const plan6Months: string[] = [
  "Gênesis 1-7", "Gênesis 8-11; Jó 1-3", "Jó 4-10", "Jó 11-17", "Jó 18-24",
  "Jó 25-31", "Jó 32-38", "Jó 39-42; Gênesis 12-14", "Gênesis 15-21", "Gênesis 22-28",
  "Gênesis 29-35", "Gênesis 36-42", "Gênesis 43-49", "Gênesis 50; Êxodo 1-6", "Êxodo 7-13",
  "Êxodo 14-20", "Êxodo 21-27", "Êxodo 28-34", "Êxodo 35-40; Levítico 1", "Levítico 2-8",
  "Levítico 9-15", "Levítico 16-22", "Levítico 23-27; Números 1-2", "Números 3-9", "Números 10-16",
  "Números 17-23", "Números 24-30", "Números 31-36; Deuteronômio 1", "Deuteronômio 2-8", "Deuteronômio 9-15",
  "Deuteronômio 16-22", "Deuteronômio 23-29", "Deuteronômio 30-34; Josué 1-2", "Josué 3-9", "Josué 10-16",
  "Josué 17-23", "Josué 24; Juízes 1-6", "Juízes 7-13", "Juízes 14-20", "Juízes 21; Rute 1-4; 1 Samuel 1-2",
  "1 Samuel 3-9", "1 Samuel 10-16", "1 Samuel 17-23", "1 Samuel 24-30", "1 Samuel 31; 1 Crônicas 1-6",
  "1 Crônicas 7-10; 2 Samuel 1-3", "2 Samuel 4-8; 1 Crônicas 11-12", "Salmos 1-7", "Salmos 8-14", "Salmos 15-21",
  "Salmos 22-28", "Salmos 29-35", "Salmos 36-42", "Salmos 43-49", "Salmos 50-56",
  "Salmos 57-63", "Salmos 64-70", "Salmos 71-77", "Salmos 78-84", "Salmos 85-91",
  "Salmos 92-98", "Salmos 99-105", "Salmos 106-112", "Salmos 113-118", "Salmos 119",
  "Salmos 120-128", "Salmos 129-137", "Salmos 138-145", "Salmos 146-150; 2 Samuel 9-10",
  "2 Samuel 11-15; 1 Crônicas 13-14", "2 Samuel 16-20; 1 Crônicas 15-16", "2 Samuel 21-24; 1 Crônicas 17-19",
  "1 Crônicas 20-26", "1 Crônicas 27-29; 1 Reis 1-4", "Provérbios 1-7", "Provérbios 8-14", "Provérbios 15-21",
  "Provérbios 22-28", "Provérbios 29-31; Eclesiastes 1-4", "Eclesiastes 5-12", "Cantares 1-8",
  "1 Reis 5-9; 2 Crônicas 1-3", "2 Crônicas 4-9; 1 Reis 10-11", "1 Reis 12-16; 2 Crônicas 10-12",
  "1 Reis 17-21; 2 Crônicas 13-15", "1 Reis 22; 2 Reis 1-4; 2 Crônicas 16-17", "2 Reis 5-9; 2 Crônicas 18-19",
  "2 Reis 10-14; 2 Crônicas 20-22", "Jonas 1-4; Amós 1-3", "Amós 4-9; Oséias 1", "Oséias 2-8",
  "Oséias 9-14; Miquéias 1", "Miquéias 2-7; Isaías 1", "Isaías 2-8", "Isaías 9-15", "Isaías 16-22",
  "Isaías 23-29", "Isaías 30-36", "Isaías 37-43", "Isaías 44-50", "Isaías 51-57",
  "Isaías 58-64", "Isaías 65-66; 2 Reis 15-17; 2 Crônicas 23-24", "2 Reis 18-21; 2 Crônicas 25-27",
  "2 Reis 22-25; 2 Crônicas 28-30", "2 Crônicas 31-36; Naum 1", "Naum 2-3; Sofonias 1-3; Habacuque 1-2",
  "Habacuque 3; Jeremias 1-6", "Jeremias 7-13", "Jeremias 14-20", "Jeremias 21-27", "Jeremias 28-34",
  "Jeremias 35-41", "Jeremias 42-48", "Jeremias 49-52; Lamentações 1-3", "Lamentações 4-5; Obadias 1; Ezequiel 1-4",
  "Ezequiel 5-11", "Ezequiel 12-18", "Ezequiel 19-25", "Ezequiel 26-32", "Ezequiel 33-39",
  "Ezequiel 40-46", "Ezequiel 47-48; Daniel 1-5", "Daniel 6-12", "Esdras 1-6; Ageu 1", "Ageu 2; Zacarias 1-6",
  "Zacarias 7-13", "Zacarias 14; Ester 1-6", "Ester 7-10; Esdras 7-9", "Esdras 10; Neemias 1-6",
  "Neemias 7-13", "Malaquias 1-4; Mateus 1-3", "Mateus 4-10", "Mateus 11-17", "Mateus 18-24",
  "Mateus 25-28; Marcos 1-3", "Marcos 4-10", "Marcos 11-16; Lucas 1", "Lucas 2-8", "Lucas 9-15",
  "Lucas 16-22", "Lucas 23-24; João 1-5", "João 6-12", "João 13-19", "João 20-21; Atos 1-5",
  "Atos 6-12", "Atos 13-19", "Atos 20-26", "Atos 27-28; Tiago 1-5", "Gálatas 1-6; 1 Tessalonicenses 1",
  "1 Tessalonicenses 2-5; 2 Tessalonicenses 1-3", "1 Coríntios 1-7", "1 Coríntios 8-14", "1 Coríntios 15-16; 2 Coríntios 1-5",
  "2 Coríntios 6-12", "2 Coríntios 13; Romanos 1-6", "Romanos 7-13", "Romanos 14-16; Efésios 1-4",
  "Efésios 5-6; Filipenses 1-4; Colossenses 1", "Colossenses 2-4; Filemom 1; 1 Timóteo 1-3",
  "1 Timóteo 4-6; Tito 1-3; 1 Pedro 1", "1 Pedro 2-5; Hebreus 1-3", "Hebreus 4-10",
  "Hebreus 11-13; 2 Timóteo 1-4", "2 Pedro 1-3; Judas 1; 1 João 1-3",
  "1 João 4-5; 2 João 1; 3 João 1; Apocalipse 1-3", "Apocalipse 4-5", "Apocalipse 6-7",
  "Apocalipse 8-9", "Apocalipse 10-11", "Apocalipse 12-13", "Apocalipse 14-15", "Apocalipse 16",
  "Apocalipse 17", "Apocalipse 18", "Apocalipse 19", "Apocalipse 20", "Apocalipse 21",
  "Apocalipse 22; Salmos 1-2", "Salmos 150; João 1-3"
];

// 3 Meses (90 dias) - ritmo mais intenso (~12-14 capítulos/dia)
const plan3Months: string[] = [
  "Gênesis 1-14", "Gênesis 15-28", "Gênesis 29-42", "Gênesis 43-50; Jó 1-3", "Jó 4-17",
  "Jó 18-31", "Jó 32-42", "Êxodo 1-13", "Êxodo 14-27", "Êxodo 28-40",
  "Levítico 1-14", "Levítico 15-27", "Números 1-12", "Números 13-24", "Números 25-36",
  "Deuteronômio 1-13", "Deuteronômio 14-26", "Deuteronômio 27-34; Josué 1-2", "Josué 3-16", "Josué 17-24; Juízes 1-3",
  "Juízes 4-13", "Juízes 14-21; Rute 1-4", "1 Samuel 1-13", "1 Samuel 14-24", "1 Samuel 25-31; 1 Crônicas 1-3",
  "1 Crônicas 4-12", "2 Samuel 1-10; 1 Crônicas 13-14", "2 Samuel 11-20; 1 Crônicas 15-16", "2 Samuel 21-24; 1 Crônicas 17-22",
  "1 Crônicas 23-29; 1 Reis 1-2", "Salmos 1-14", "Salmos 15-28", "Salmos 29-42", "Salmos 43-56",
  "Salmos 57-70", "Salmos 71-84", "Salmos 85-98", "Salmos 99-112", "Salmos 113-119",
  "Salmos 120-145", "Salmos 146-150; 1 Reis 3-8", "1 Reis 9-11; 2 Crônicas 1-9",
  "Provérbios 1-14", "Provérbios 15-28", "Provérbios 29-31; Eclesiastes 1-12",
  "Cantares 1-8; 1 Reis 12-14", "1 Reis 15-22; 2 Crônicas 10-16",
  "2 Reis 1-9; 2 Crônicas 17-19", "2 Reis 10-17; 2 Crônicas 20-24",
  "Jonas 1-4; Amós 1-9", "Oséias 1-14", "Miquéias 1-7; Isaías 1-2",
  "Isaías 3-15", "Isaías 16-29", "Isaías 30-43", "Isaías 44-57", "Isaías 58-66; 2 Reis 18-19",
  "2 Reis 20-25; 2 Crônicas 25-30", "2 Crônicas 31-36; Naum 1-3",
  "Sofonias 1-3; Habacuque 1-3; Jeremias 1-3", "Jeremias 4-16", "Jeremias 17-29",
  "Jeremias 30-41", "Jeremias 42-52", "Lamentações 1-5; Obadias 1; Ezequiel 1-2",
  "Ezequiel 3-15", "Ezequiel 16-28", "Ezequiel 29-39", "Ezequiel 40-48",
  "Daniel 1-12", "Esdras 1-6; Ageu 1-2; Zacarias 1-2", "Zacarias 3-14",
  "Ester 1-10; Esdras 7-8", "Esdras 9-10; Neemias 1-10", "Neemias 11-13; Malaquias 1-4; Mateus 1-2",
  "Mateus 3-14", "Mateus 15-25", "Mateus 26-28; Marcos 1-8",
  "Marcos 9-16; Lucas 1-2", "Lucas 3-14", "Lucas 15-24",
  "João 1-12", "João 13-21; Atos 1-2", "Atos 3-14",
  "Atos 15-26", "Atos 27-28; Tiago 1-5; Gálatas 1-4",
  "Gálatas 5-6; 1 Tessalonicenses 1-5; 2 Tessalonicenses 1-3; 1 Coríntios 1-2",
  "1 Coríntios 3-14", "1 Coríntios 15-16; 2 Coríntios 1-10",
  "2 Coríntios 11-13; Romanos 1-10", "Romanos 11-16; Efésios 1-6; Filipenses 1-2",
  "Filipenses 3-4; Colossenses 1-4; Filemom 1; 1 Timóteo 1-6; Tito 1-3",
  "1 Pedro 1-5; Hebreus 1-8", "Hebreus 9-13; 2 Timóteo 1-4; 2 Pedro 1-3; Judas 1",
  "1 João 1-5; 2 João 1; 3 João 1; Apocalipse 1-6", "Apocalipse 7-15", "Apocalipse 16-22"
];

// 1 Ano (365 dias) - ritmo suave (~3-4 capítulos/dia)
const plan1Year: string[] = [
  // Gênesis (50 capítulos) - 17 dias
  "Gênesis 1-3", "Gênesis 4-6", "Gênesis 7-9", "Gênesis 10-12", "Gênesis 13-15",
  "Gênesis 16-18", "Gênesis 19-21", "Gênesis 22-24", "Gênesis 25-27", "Gênesis 28-30",
  "Gênesis 31-33", "Gênesis 34-36", "Gênesis 37-39", "Gênesis 40-42", "Gênesis 43-45",
  "Gênesis 46-48", "Gênesis 49-50; Jó 1",
  // Jó (42 capítulos) - 14 dias
  "Jó 2-4", "Jó 5-7", "Jó 8-10", "Jó 11-13", "Jó 14-16",
  "Jó 17-19", "Jó 20-22", "Jó 23-25", "Jó 26-28", "Jó 29-31",
  "Jó 32-34", "Jó 35-37", "Jó 38-40", "Jó 41-42",
  // Êxodo (40 capítulos) - 13 dias
  "Êxodo 1-3", "Êxodo 4-6", "Êxodo 7-9", "Êxodo 10-12", "Êxodo 13-15",
  "Êxodo 16-18", "Êxodo 19-21", "Êxodo 22-24", "Êxodo 25-27", "Êxodo 28-30",
  "Êxodo 31-33", "Êxodo 34-36", "Êxodo 37-40",
  // Levítico (27 capítulos) - 9 dias
  "Levítico 1-3", "Levítico 4-6", "Levítico 7-9", "Levítico 10-12", "Levítico 13-15",
  "Levítico 16-18", "Levítico 19-21", "Levítico 22-24", "Levítico 25-27",
  // Números (36 capítulos) - 12 dias
  "Números 1-3", "Números 4-6", "Números 7-9", "Números 10-12", "Números 13-15",
  "Números 16-18", "Números 19-21", "Números 22-24", "Números 25-27", "Números 28-30",
  "Números 31-33", "Números 34-36",
  // Deuteronômio (34 capítulos) - 11 dias
  "Deuteronômio 1-3", "Deuteronômio 4-6", "Deuteronômio 7-9", "Deuteronômio 10-12", "Deuteronômio 13-15",
  "Deuteronômio 16-18", "Deuteronômio 19-21", "Deuteronômio 22-24", "Deuteronômio 25-27",
  "Deuteronômio 28-30", "Deuteronômio 31-34",
  // Josué (24 capítulos) - 8 dias
  "Josué 1-3", "Josué 4-6", "Josué 7-9", "Josué 10-12", "Josué 13-15",
  "Josué 16-18", "Josué 19-21", "Josué 22-24",
  // Juízes (21 capítulos) - 7 dias
  "Juízes 1-3", "Juízes 4-6", "Juízes 7-9", "Juízes 10-12", "Juízes 13-15",
  "Juízes 16-18", "Juízes 19-21",
  // Rute (4 capítulos) - 2 dias
  "Rute 1-2", "Rute 3-4",
  // 1 Samuel (31 capítulos) - 10 dias
  "1 Samuel 1-3", "1 Samuel 4-6", "1 Samuel 7-9", "1 Samuel 10-12", "1 Samuel 13-15",
  "1 Samuel 16-18", "1 Samuel 19-21", "1 Samuel 22-24", "1 Samuel 25-27", "1 Samuel 28-31",
  // 1 Crônicas (29 capítulos) - 10 dias
  "1 Crônicas 1-3", "1 Crônicas 4-6", "1 Crônicas 7-9", "1 Crônicas 10-12", "1 Crônicas 13-15",
  "1 Crônicas 16-18", "1 Crônicas 19-21", "1 Crônicas 22-24", "1 Crônicas 25-27", "1 Crônicas 28-29",
  // 2 Samuel (24 capítulos) - 8 dias
  "2 Samuel 1-3", "2 Samuel 4-6", "2 Samuel 7-9", "2 Samuel 10-12", "2 Samuel 13-15",
  "2 Samuel 16-18", "2 Samuel 19-21", "2 Samuel 22-24",
  // Salmos (150 capítulos) - 38 dias
  "Salmos 1-4", "Salmos 5-8", "Salmos 9-12", "Salmos 13-16", "Salmos 17-19",
  "Salmos 20-23", "Salmos 24-27", "Salmos 28-31", "Salmos 32-35", "Salmos 36-39",
  "Salmos 40-43", "Salmos 44-47", "Salmos 48-51", "Salmos 52-55", "Salmos 56-59",
  "Salmos 60-63", "Salmos 64-67", "Salmos 68-70", "Salmos 71-73", "Salmos 74-77",
  "Salmos 78-80", "Salmos 81-84", "Salmos 85-88", "Salmos 89-91", "Salmos 92-95",
  "Salmos 96-99", "Salmos 100-103", "Salmos 104-106", "Salmos 107-109", "Salmos 110-113",
  "Salmos 114-118", "Salmos 119", "Salmos 120-125", "Salmos 126-131", "Salmos 132-137",
  "Salmos 138-142", "Salmos 143-146", "Salmos 147-150",
  // 1 Reis (22 capítulos) - 7 dias
  "1 Reis 1-3", "1 Reis 4-6", "1 Reis 7-9", "1 Reis 10-12", "1 Reis 13-15",
  "1 Reis 16-18", "1 Reis 19-22",
  // Provérbios (31 capítulos) - 10 dias
  "Provérbios 1-3", "Provérbios 4-6", "Provérbios 7-9", "Provérbios 10-12", "Provérbios 13-15",
  "Provérbios 16-18", "Provérbios 19-21", "Provérbios 22-24", "Provérbios 25-27", "Provérbios 28-31",
  // Eclesiastes (12 capítulos) - 4 dias
  "Eclesiastes 1-3", "Eclesiastes 4-6", "Eclesiastes 7-9", "Eclesiastes 10-12",
  // Cantares (8 capítulos) - 3 dias
  "Cantares 1-3", "Cantares 4-6", "Cantares 7-8",
  // 2 Crônicas (36 capítulos) - 12 dias
  "2 Crônicas 1-3", "2 Crônicas 4-6", "2 Crônicas 7-9", "2 Crônicas 10-12", "2 Crônicas 13-15",
  "2 Crônicas 16-18", "2 Crônicas 19-21", "2 Crônicas 22-24", "2 Crônicas 25-27", "2 Crônicas 28-30",
  "2 Crônicas 31-33", "2 Crônicas 34-36",
  // 2 Reis (25 capítulos) - 8 dias
  "2 Reis 1-3", "2 Reis 4-6", "2 Reis 7-9", "2 Reis 10-12", "2 Reis 13-15",
  "2 Reis 16-18", "2 Reis 19-21", "2 Reis 22-25",
  // Profetas Menores parte 1 - 8 dias
  "Jonas 1-4", "Amós 1-3", "Amós 4-6", "Amós 7-9", "Oséias 1-4",
  "Oséias 5-9", "Oséias 10-14", "Miquéias 1-4",
  // Miquéias fim + Isaías (66 capítulos) - 24 dias
  "Miquéias 5-7", "Isaías 1-3", "Isaías 4-6", "Isaías 7-9", "Isaías 10-12",
  "Isaías 13-15", "Isaías 16-18", "Isaías 19-21", "Isaías 22-24", "Isaías 25-27",
  "Isaías 28-30", "Isaías 31-33", "Isaías 34-36", "Isaías 37-39", "Isaías 40-42",
  "Isaías 43-45", "Isaías 46-48", "Isaías 49-51", "Isaías 52-54", "Isaías 55-57",
  "Isaías 58-60", "Isaías 61-63", "Isaías 64-66",
  // Profetas Menores parte 2 - 4 dias
  "Naum 1-3", "Sofonias 1-3", "Habacuque 1-3",
  // Jeremias (52 capítulos) - 17 dias
  "Jeremias 1-3", "Jeremias 4-6", "Jeremias 7-9", "Jeremias 10-12", "Jeremias 13-15",
  "Jeremias 16-18", "Jeremias 19-21", "Jeremias 22-24", "Jeremias 25-27", "Jeremias 28-30",
  "Jeremias 31-33", "Jeremias 34-36", "Jeremias 37-39", "Jeremias 40-42", "Jeremias 43-45",
  "Jeremias 46-48", "Jeremias 49-52",
  // Lamentações + Obadias - 3 dias
  "Lamentações 1-2", "Lamentações 3-5", "Obadias 1",
  // Ezequiel (48 capítulos) - 16 dias
  "Ezequiel 1-3", "Ezequiel 4-6", "Ezequiel 7-9", "Ezequiel 10-12", "Ezequiel 13-15",
  "Ezequiel 16-18", "Ezequiel 19-21", "Ezequiel 22-24", "Ezequiel 25-27", "Ezequiel 28-30",
  "Ezequiel 31-33", "Ezequiel 34-36", "Ezequiel 37-39", "Ezequiel 40-42", "Ezequiel 43-45",
  "Ezequiel 46-48",
  // Daniel (12 capítulos) - 4 dias
  "Daniel 1-3", "Daniel 4-6", "Daniel 7-9", "Daniel 10-12",
  // Pós-exílio - 10 dias
  "Esdras 1-3", "Esdras 4-6", "Ageu 1-2", "Zacarias 1-4", "Zacarias 5-8",
  "Zacarias 9-11", "Zacarias 12-14", "Ester 1-3", "Ester 4-7", "Ester 8-10",
  // Esdras/Neemias/Malaquias - 7 dias
  "Esdras 7-10", "Neemias 1-3", "Neemias 4-6", "Neemias 7-9", "Neemias 10-13",
  "Malaquias 1-2", "Malaquias 3-4",
  // Mateus (28 capítulos) - 9 dias
  "Mateus 1-3", "Mateus 4-6", "Mateus 7-9", "Mateus 10-12", "Mateus 13-15",
  "Mateus 16-18", "Mateus 19-21", "Mateus 22-24", "Mateus 25-28",
  // Marcos (16 capítulos) - 5 dias
  "Marcos 1-3", "Marcos 4-6", "Marcos 7-9", "Marcos 10-12", "Marcos 13-16",
  // Lucas (24 capítulos) - 8 dias
  "Lucas 1-3", "Lucas 4-6", "Lucas 7-9", "Lucas 10-12", "Lucas 13-15",
  "Lucas 16-18", "Lucas 19-21", "Lucas 22-24",
  // João (21 capítulos) - 7 dias
  "João 1-3", "João 4-6", "João 7-9", "João 10-12", "João 13-15",
  "João 16-18", "João 19-21",
  // Atos (28 capítulos) - 9 dias
  "Atos 1-3", "Atos 4-6", "Atos 7-9", "Atos 10-12", "Atos 13-15",
  "Atos 16-18", "Atos 19-21", "Atos 22-24", "Atos 25-28",
  // Epístolas - 19 dias
  "Tiago 1-3", "Tiago 4-5; Gálatas 1", "Gálatas 2-4", "Gálatas 5-6; 1 Tessalonicenses 1-2",
  "1 Tessalonicenses 3-5; 2 Tessalonicenses 1", "2 Tessalonicenses 2-3; 1 Coríntios 1-2",
  "1 Coríntios 3-5", "1 Coríntios 6-8", "1 Coríntios 9-11", "1 Coríntios 12-14",
  "1 Coríntios 15-16; 2 Coríntios 1", "2 Coríntios 2-5", "2 Coríntios 6-9",
  "2 Coríntios 10-13", "Romanos 1-3", "Romanos 4-6", "Romanos 7-9", "Romanos 10-12", "Romanos 13-16",
  // Epístolas da prisão e pastorais - 9 dias
  "Efésios 1-3", "Efésios 4-6", "Filipenses 1-4", "Colossenses 1-4; Filemom 1",
  "1 Timóteo 1-3", "1 Timóteo 4-6; Tito 1", "Tito 2-3; 1 Pedro 1-2",
  "1 Pedro 3-5", "Hebreus 1-3",
  // Hebreus + cartas finais - 7 dias
  "Hebreus 4-6", "Hebreus 7-9", "Hebreus 10-11", "Hebreus 12-13; 2 Timóteo 1-2",
  "2 Timóteo 3-4; 2 Pedro 1-3", "Judas 1; 1 João 1-3", "1 João 4-5; 2 João 1; 3 João 1",
  // Apocalipse (22 capítulos) - 11 dias
  "Apocalipse 1-2", "Apocalipse 3-4", "Apocalipse 5-6", "Apocalipse 7-8", "Apocalipse 9-10",
  "Apocalipse 11-12", "Apocalipse 13-14", "Apocalipse 15-16", "Apocalipse 17-18",
  "Apocalipse 19-20", "Apocalipse 21-22"
];

export const planOptions: PlanOption[] = [
  {
    id: '3months',
    label: '3 Meses',
    description: '90 dias • ~12-14 cap/dia • Ritmo intenso',
    days: plan3Months,
  },
  {
    id: '6months',
    label: '6 Meses',
    description: '180 dias • ~6-7 cap/dia • Ritmo equilibrado',
    days: plan6Months,
  },
  {
    id: '1year',
    label: '1 Ano',
    description: '365 dias • ~3-4 cap/dia • Ritmo suave',
    days: plan1Year,
  },
];

// Helper: chunk days into months (30 days each)
export function getMonths(days: string[]): string[][] {
  const months: string[][] = [];
  for (let i = 0; i < days.length; i += 30) {
    months.push(days.slice(i, i + 30));
  }
  return months;
}

// Keep backward compat for old imports
export const planData = getMonths(plan6Months);
