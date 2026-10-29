# SEMEST Quiz

Plataforma de quiz multiplayer para a Semana da Estatística (SEMEST), com identidade visual roxa e branca e avatares do mascote Semestinho.

**Demonstração:** https://semest-quiz.caue-lam.chatgpt.site

## Funcionalidades
- Entrada em salas por código e apelido, sem conta de participante.
- Perguntas com tempo, registro de respostas e pontuação por acerto e rapidez.
- Classificação e resultado final com nomes, avatares e pontos.
- Área de gestão protegida por senha validada no servidor e cookie de sessão assinado.
- Editor com salvamento persistente e controle de conflitos de edição.
- Semestinho personalizável: 3 opções de chapéu e 4 de óculos.
- Interface adaptada a celular e computador.

## Tecnologias
TypeScript, React, Vinext (compatibilidade com APIs do Next.js), CSS/Tailwind, Cloudflare Workers, D1 (SQLite), Drizzle ORM, componentes Radix UI e Lucide.

## Estrutura principal
- `app/page.tsx`: interface e fluxo das partidas.
- `app/avatars.tsx`: seleção e exibição dos avatares.
- `app/api/game/route.ts`: regras, salas, respostas, ranking e rascunhos.
- `app/management.ts`: senha e sessão da gestão.
- `db/schema.ts`: estrutura das tabelas.
- `db/default-quiz.ts`: perguntas de exemplo.
- `drizzle/`: migrações do banco.
- `public/`: marca, fontes e avatares.
- `tests/`: verificações de acesso, persistência, partidas e renderização.

## Uso local e publicação
Este é um projeto completo com servidor e banco: não funciona simplesmente abrindo um HTML.
Requer Node.js >=22.13.0 e pnpm compatível com `package.json`. Instale as dependências com `pnpm install --frozen-lockfile`. Os comandos `pnpm dev`, `pnpm build` e `pnpm start` estão no projeto.

Consulte `README-BASE.md` para o funcionamento do ambiente original, configuração dos bindings e aplicação das migrações locais. Configure `MANAGEMENT_PASSWORD` e `MANAGEMENT_SESSION_SECRET` como variáveis secretas no ambiente do servidor. Use valores próprios e nunca os publique no GitHub. O arquivo `.env.example` contém apenas os nomes das variáveis; a disponibilização delas ao Worker deve ser configurada no ambiente de desenvolvimento/hospedagem.

A identificação do projeto hospedado foi retirada desta cópia. Publicar em outra conta requer configurar recursos e credenciais próprios. Este pacote não transfere a hospedagem nem o banco online. Não inclui histórico Git, dependências instaladas, senhas, sessões, dados dos participantes ou perguntas privadas salvas no banco; inclui perguntas de exemplo e migrações.

## Validação e limites
O projeto contém testes automatizados de gestão, persistência, respostas e avatares. Esta exportação foi conferida quanto à integridade dos arquivos e à exclusão das senhas conhecidas; não foi executado um novo teste de carga ou uma nova instalação de dependências para esta entrega. O objetivo de aproximadamente 180 participantes precisa ser validado no ambiente e na rede do evento, sem garantia de capacidade nesta cópia.

## Contexto do projeto
Projeto desenvolvido para a SEMEST com apoio de IA na implementação. A definição das necessidades, personalização visual e validação do uso no evento fazem parte do trabalho de organização do quiz. Ao apresentar no currículo, descreva sua participação real.

Os símbolos, mascote e demais materiais visuais foram utilizados no contexto da SEMEST. Sua inclusão neste pacote não concede licença de uso dessas marcas a terceiros. Consulte também os termos das dependências.
