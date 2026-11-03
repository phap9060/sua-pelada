# Sua Pelada

Aplicativo web para gerenciar um grupo de pelada entre amigos: lista de presença, sorteio equilibrado de times, avaliações, campeonatos e estatísticas em um só lugar.

O organizador cria a pelada, define dia/horário e vagas, compartilha o link de convite e o app cuida do resto: abre e fecha a lista, sorteia os times e cobra as avaliações da rodada.

## Funcionalidades

### Conta e perfil
- Cadastro e login com e-mail e senha (JWT em cookie `httpOnly`, validade de 7 dias).
- Perfil com posição (linha ou goleiro), posição em campo (zagueiro/meia/atacante) e autoavaliação.
- Fluxo de "senha pelada": o manager/auxiliar reseta a senha e a pessoa cria uma nova no próximo login.

### Pelada
- Cada manager gerencia uma pelada e convida amigos por link público.
- Até 3 auxiliares com poderes de gestão.
- Configuração de dia/horário do jogo, duração, vagas de linha e de goleiro, jogadores por time e janela de confirmação.
- Modo "lista externa": o organizador digita quem vai jogar e faz o sorteio manualmente, sem confirmação pelo app.

### Jogo semanal
- O servidor cria automaticamente a próxima partida e abre/fecha a confirmação conforme a configuração da pelada.
- Titulares e suplentes separados por posição (linha/goleiro), por ordem de confirmação.
- Sorteio equilibrado por nota (zigue-zague), com goleiros distribuídos para compensar a força dos times.
- Compartilhamento dos times pelo WhatsApp.

### Avaliações
- Notas de 1 a 5 em passos de 0,5 ("bolas" para linha, "luvas" para goleiros).
- Rodadas de avaliação com pendências por membro.
- Nota pessoal (autoavaliação) usada como base no sorteio.

### Campeonato
- Dois modos: draft com capitães ou sorteio.
- Fase de grupos e mata-mata com geração automática de confrontos.
- Registro de gols, assistências, cartões e melhor em campo (MOTM).
- Classificação, estatísticas e histórico de títulos.

### Estatísticas e notificações
- Artilharia, títulos, duplas mais frequentes, melhor goleiro e outras métricas.
- Notificações in-app (lista aberta, times sorteados, avaliações pendentes etc.).

## Stack

| Camada | Tecnologias |
| --- | --- |
| Back-end | Bun, Elysia, Drizzle ORM, PostgreSQL/PGlite, JWT |
| Front-end | React 19, Vite, TypeScript, Mantine, TanStack Query, React Router, Eden Treaty |
| Infra | Docker Compose (Postgres 16), Railway (API), Vercel (front) |

O front consome a API com o [Eden Treaty](https://elysiajs.com/eden/overview.html), reaproveitando os tipos exportados pelo back (`back/src/index.ts`). Por isso o comando de instalação da Vercel também instala as dependências do back.

## Estrutura

```
sua-pelada/
├── back/                     # API (Bun + Elysia)
│   ├── src/
│   │   ├── modules/          # auth, peladas, games, championships, ratings, notifications, stats
│   │   ├── db/               # conexão e schema Drizzle
│   │   ├── jobs/             # scheduler (a cada 20s)
│   │   ├── lib/              # sorteio, notas, notificações, fuso de São Paulo
│   │   └── scripts/          # utilitários de manutenção
│   └── drizzle.config.ts
├── front/                    # SPA (React + Vite)
│   └── src/
│       ├── pages/            # login, home, pelada (abas), avaliações, notificações, perfil
│       ├── components/
│       ├── hooks/            # React Query por domínio
│       └── services/         # chamadas à API
├── docker-compose.yml        # Postgres local
└── package.json              # scripts que orquestram back e front
```

## Pré-requisitos

- [Bun](https://bun.sh) 1.2+
- Docker (opcional, para usar Postgres local; sem ele o back usa PGlite)

## Rodando o projeto

### 1. Instale as dependências

```bash
bun install --cwd back
bun install --cwd front
```

### 2. Configure o banco

**Opção A — Postgres via Docker (recomendado):**

```bash
docker compose up -d
```

Crie o `back/.env` (o Bun carrega esse arquivo automaticamente):

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/sua_pelada
JWT_SECRET=troque-este-segredo-em-producao
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

**Opção B — PGlite (sem Docker):**

Não defina `DATABASE_URL`. O back cria um Postgres em WASM no diretório `back/.pglite`.

Em qualquer uma das opções, aplique o schema:

```bash
cd back
bun run db:push
```

### 3. Suba a API e o front

Na raiz do repositório:

```bash
bun run dev:back
bun run dev:front
```

- Front: http://localhost:5173
- API: http://localhost:3000 (health check em `/health`)

Se necessário, crie o `front/.env`:

```env
# URL absoluta da API (padrão: http://localhost:3000)
VITE_API_URL=http://localhost:3000
```

Também é possível usar o caminho relativo `api` para consumir a API na mesma origem (útil atrás de proxy/rewrite).

### 4. Libere um manager

Criar pelada exige a flag `canManage`. Novos usuários nascem sem ela. Para liberar:

```bash
cd back
bun run grant-manager email@exemplo.com
```

Cada manager pode criar uma pelada e adicionar até 3 auxiliares.

## Variáveis de ambiente

### Back-end

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `DATABASE_URL` | Em produção | — | String de conexão do Postgres. Sem ela, usa PGlite em dev (e falha em produção). |
| `JWT_SECRET` | Recomendada | `dev-secret-troque-em-producao` | Segredo usado para assinar os tokens JWT. |
| `PORT` | Não | `3000` | Porta da API. |
| `CORS_ORIGIN` | Em produção | reflete qualquer origem | Origens permitidas, separadas por vírgula. |
| `PGLITE_DIR` | Não | `./.pglite` | Diretório do banco PGlite em dev. |

### Front-end

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:3000` | URL da API. Aceita URL absoluta, caminho iniciado por `/` ou um prefixo como `api`. |

## Scripts

### Raiz

| Script | Descrição |
| --- | --- |
| `bun run dev:back` | API em modo watch |
| `bun run dev:front` | Front com Vite |
| `bun run build:front` | Typecheck + build de produção do front |
| `bun run typecheck` | Typecheck do back + build do front |

### Back

| Script | Descrição |
| --- | --- |
| `bun run dev` | Servidor em modo watch |
| `bun run start` | Aplica o schema (`db:push`) e inicia o servidor |
| `bun run db:push` | Sincroniza o schema com o banco |
| `bun run db:generate` | Gera migrations do Drizzle |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run grant-manager <email>` | Libera um usuário para gerenciar pelada |
| `bun run fix:game-tz` | Corrige horários de jogos criados com fuso errado (idempotente) |
| `bun run fix:rating-requests` | Recria pendências de avaliação faltantes (idempotente) |

### Front

| Script | Descrição |
| --- | --- |
| `bun run dev` | Vite em http://localhost:5173 |
| `bun run build` | Typecheck + build de produção |
| `bun run preview` | Pré-visualiza o build |

## API

Todas as rotas (exceto login, cadastro, convite público e `/health`) exigem autenticação via cookie.

| Módulo | Principais rotas |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/profile`, `POST /auth/password` |
| Peladas | `POST /peladas`, `GET /peladas/mine`, `GET /peladas/:id`, `PATCH /peladas/:id`, `POST /peladas/:id/assistants`, `POST /invites/:token/join` |
| Jogos | `GET /peladas/:id/game`, `POST /games/:id/confirm`, `POST /games/:id/entries`, `POST /games/:id/draw`, `POST /games/:id/champion` |
| Avaliações | `GET /ratings/pending`, `POST /ratings/complete`, `POST /peladas/:id/rating-round` |
| Campeonatos | `POST /peladas/:id/championship`, `GET /championships/:id`, `POST /championships/:id/draft/pick`, `POST /championships/:id/knockout/generate` |
| Notificações | `GET /notifications`, `POST /notifications/read-all` |
| Estatísticas | `GET /peladas/:id/stats` |

## Detalhes de funcionamento

- **Scheduler:** a cada 20 segundos o back garante a existência do próximo jogo, abre a lista quando a janela começa e realiza o sorteio automaticamente quando ela fecha.
- **Fuso horário:** os horários são calculados no relógio de São Paulo (UTC-3), independentemente do fuso do servidor.
- **Banco:** em produção o PGlite é bloqueado; `DATABASE_URL` é obrigatória para evitar banco efêmero.
- **Convite:** o link `/invite/:token` pode ser aberto sem login; o usuário entra ou cria conta em seguida.

## Deploy

### API (Railway)

1. Conecte o plugin PostgreSQL ao serviço para obter `DATABASE_URL`.
2. Configure `JWT_SECRET` e `CORS_ORIGIN` (URL do front, separando múltiplas origens por vírgula).
3. O comando de start pode aplicar o schema antes de subir: `bun run start`.

### Front (Vercel)

- `installCommand`: `bun install && cd ../back && bun install`
- `buildCommand`: `bun run build`
- `outputDirectory`: `dist`

O `front/vercel.json` redireciona `/api/*` para a API no Railway. Ajuste a URL de destino para o endereço do seu serviço antes de publicar.
