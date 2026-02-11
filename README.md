# PulseCRM

CRM completo estilo Pipedrive, com pipeline visual, contatos, deals, tarefas, emails, automacoes e dashboard.

## Tech Stack

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4 + Vite
- **Backend:** Express 5 + SQLite (better-sqlite3) + JWT
- **Drag & Drop:** @hello-pangea/dnd
- **Graficos:** Recharts

## Como rodar

### Pre-requisitos

- Node.js >= 18
- npm

### Instalacao

```bash
git clone https://github.com/agas1/pulse-crm.git
cd pulse-crm
npm install
```

### Rodar em desenvolvimento

```bash
npm run dev
```

Isso inicia simultaneamente:
- **API** em http://localhost:3001
- **Frontend** em http://localhost:5173

O banco de dados SQLite e criado automaticamente na primeira execucao com dados de exemplo (seed).

### Build para producao

```bash
npm run build
```

## Credenciais de acesso (seed)

| Email | Senha | Cargo |
|-------|-------|-------|
| admin@pulsecrm.com | 123456 | Admin |
| carlos@pulsecrm.com | 123456 | Manager |
| ana@pulsecrm.com | 123456 | Seller |
| pedro@pulsecrm.com | 123456 | Seller |
| julia@pulsecrm.com | 123456 | Seller |

## Estrutura do projeto

```
pulse-crm/
├── server/            # Backend Express + SQLite
│   ├── db.ts          # Schema + seed do banco
│   ├── index.ts       # Entry point do servidor
│   ├── middleware/     # Auth JWT
│   └── routes/        # Rotas API (contacts, deals, tasks, etc.)
├── src/               # Frontend React
│   ├── components/    # Componentes reutilizaveis
│   ├── contexts/      # AuthContext, DataContext, ThemeContext
│   ├── pages/         # Paginas (Dashboard, Pipeline, Contacts, etc.)
│   ├── services/      # api.ts (HTTP client)
│   └── config/        # Permissoes por role
└── public/            # Assets estaticos
```

## Funcionalidades

- Dashboard com metricas e graficos em tempo real
- Pipeline visual com drag & drop (estagios em portugues)
- Gestao de contatos com timeline 360
- Deals com probabilidade e previsao de fechamento
- Tarefas com prioridade e status
- Caixa de emails integrada
- Automacoes configuraveis
- Sistema de permissoes (Admin > Manager > Seller)
- Tema claro/escuro
- Landing page publica
