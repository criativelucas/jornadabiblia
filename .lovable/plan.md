# Revisão e otimização da Jornada Bíblica

## Resultado da revisão

O app compila atualmente. O teste existente passou, mas apenas verifica `true`: não protege leitura, sequência de dias, lembretes ou funcionamento offline. Nenhum código ou pacote foi alterado nesta revisão.

### Problemas confirmados

1. **A abertura espera trabalho pesado do Léxico.** A tela inicial aguarda seis capítulos, suas definições e traduções, com pausas entre lotes; em conexões lentas pode chegar ao limite de seis segundos. Isso atrasa a entrada mesmo quando a Bíblia já está disponível.
2. **Falhas de salvamento podem parecer sucesso.** A conclusão de dias e meses e os lembretes ignoram erros retornados pelo serviço. O app pode mostrar progresso, sequência ou horário salvos que desaparecem ao recarregar.
3. **O Léxico não se recupera corretamente de algumas falhas.** Uma definição que falha na rede fica guardada como inexistente até encerrar a sessão. Um capítulo não baixado, quando aberto offline, aparece como resultado vazio em vez de indisponível. As gravações locais também não são aguardadas antes de declarar o carregamento concluído.
4. **Histórico e galeria não percorrem todas as páginas de resultados.** As consultas do histórico, da contagem de fotos e das fotos por livro não têm paginação. Ao ultrapassar o limite de resposta, podem omitir registros. A contagem da galeria também transfere registros individuais apenas para contá-los.
5. **A tela principal concentra responsabilidades demais.** São aproximadamente 1.474 linhas reunindo navegação, plano, salvamento, sequência e conquistas. Isso aumenta o risco de uma correção afetar outra função. Há também caminhos repetidos de cache de capítulos e definições, e a proteção de requisições simultâneas não cobre a consulta ao armazenamento local.

### Segurança: limites desta revisão

O resultado disponível registra um alerta antigo de gravidade alta em `vite-plugin-pwa`, datado de março de 2026 e marcado como desatualizado. Ele não confirma a situação atual. Não há resultado recente de análise profunda; execute uma nova análise pela aba **Security**. Não será feita atualização de dependências sem aprovação e confirmação do alerta atual.

## Plano proposto, em etapas

### 1. Proteger o comportamento atual
- Criar testes de salvamento de dia/mês, recuperação de falhas, lembretes e cache do Léxico.
- Cobrir requisições simultâneas e tentativas após erro de rede.
- Usar datas locais, manter as regras atuais de planos, sequência e conquistas.
- **Validação:** executar os testes específicos e conferir leitura, conclusão e lembretes na prévia com uma sessão autenticada. Não declarar validado o que não puder ser exercitado.

### 2. Corrigir salvamentos e recuperação de erros
- Verificar os erros retornados em todos os caminhos de progresso e lembretes identificados.
- Manter atualização imediata da tela com reversão quando o salvamento falhar; não anunciar sucesso antes da confirmação.
- Tratar separadamente progresso salvo e atualização de sequência malsucedida, sem esconder salvamentos parciais ou conceder conquistas indevidas.
- Não guardar falhas temporárias como definições inexistentes; permitir tentar novamente.
- Mostrar claramente quando um capítulo não foi baixado para uso offline.
- **Validação:** simular falhas em cada operação, testar nova tentativa e recarregar a prévia para confirmar os dados efetivamente salvos.

### 3. Tornar a abertura mais leve e o offline previsível
- Tirar a busca pesada de definições e traduções do caminho que impede entrar no app, mantendo o pré-carregamento após a entrada.
- Coordenar buscas do Léxico com concorrência limitada, preservando seu módulo separado e as traduções em português.
- Unificar requisições simultâneas desde a leitura do cache até a rede, por versão/capítulo/definição.
- Aguardar gravações locais nos caminhos que prometem disponibilidade offline.
- Preservar o IndexedDB como fonte local dos textos e do Léxico; conteúdo nunca baixado não será apresentado como disponível offline.
- **Validação:** comparar o tempo até entrar antes/depois, com cache vazio e preenchido; abrir capítulos AT/NT já baixados offline, testar um capítulo não baixado e reconectar.

### 4. Corrigir consultas crescentes
- Paginar histórico e fotos por livro com ordenação estável.
- Obter contagens sem baixar todas as fotos apenas para contá-las.
- Preservar a apresentação e conferir o significado do total do perfil antes de alterar sua fórmula.
- **Validação:** testar volumes acima do limite de uma página, conferir totais e acesso aos registros mais antigos.

### 5. Reduzir o risco de manutenção
- Consolidar os caminhos de acesso a dados e cache corrigidos nas etapas anteriores.
- Extrair da tela principal responsabilidades de progresso e plano em módulos pequenos, sem redesenhar telas ou reescrever o app.
- Remover somente código comprovadamente não utilizado; não apagar arquivos por nome nem atualizar pacotes indiscriminadamente.
- Registrar as decisões de organização e manter testes próximos às regras.
- **Validação:** executar os testes relevantes e conferir a prévia após cada extração, antes da próxima etapa.

## Detalhes técnicos e escopo

- Evidências: `SplashScreen.tsx:80–95`, `StrongsLexicon.tsx:241–268`, `StrongsService.ts:245–397`, `Index.tsx:357–453`, `Profile.tsx:218–226,296–310`, `GalleryTab.tsx:96–108,139–159` e `src/test/example.test.ts`.
- Não trocar os provedores de texto ou dicionário, a autenticação, as rotas, os valores de pontos, os planos ou o estilo visual.
- O carregamento bíblico atual já usa IndexedDB por versão; não prometer carregamento real por capítulo sem uma fonte que o suporte.
- Se uma contagem agregada exigir uma alteração no banco, usar uma mudança pequena com as permissões existentes preservadas; não alterar regras de acesso como parte da otimização.
- Verificar testes, erros de compilação e os fluxos na prévia em cada etapa. O funcionamento instalado/offline em produção precisa de verificação própria, pois o serviço offline não opera da mesma forma na prévia de desenvolvimento.
- Atualizações de pacotes ficam fora destas etapas até uma nova análise confirmar quais são necessárias.