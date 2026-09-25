# Wiwap Parceiros — Gestão de Representantes

Protótipo funcional (dados em memória, sem backend) da plataforma de gestão
comercial e comissionamento de representantes da Wiwap. Construído em React
+ Vite + Tailwind.

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## Publicar (gerar um link público)

### Opção A — Vercel (mais simples)
1. Crie uma conta em https://vercel.com (dá para entrar com GitHub).
2. Suba esta pasta para um repositório no GitHub (ou use `vercel` via CLI: `npx vercel`).
3. Em vercel.com, clique em **Add New → Project**, selecione o repositório.
4. O Vercel detecta o Vite automaticamente (build command `npm run build`,
   output `dist`) — clique em **Deploy**.
5. Em poucos minutos você recebe uma URL pública (`algo.vercel.app`).

### Opção B — Netlify
1. Crie uma conta em https://netlify.com.
2. **Add new site → Import an existing project**, conecte o repositório.
3. Build command: `npm run build` · Publish directory: `dist` (já
   configurado em `netlify.toml`).
4. Deploy — você recebe uma URL pública (`algo.netlify.app`).

### Opção C — sem GitHub, upload manual
1. Rode `npm install && npm run build` no seu computador.
2. Isso gera uma pasta `dist/` com o site já pronto.
3. Em vercel.com ou app.netlify.com, arraste essa pasta `dist/` direto na
   tela de deploy (ambos aceitam "drag and drop" de uma pasta já buildada).

## O que é real e o que é simulado

- **Real**: todo o motor de cálculo de comissão, as regras de negócio, os
  formulários de cadastro, o workflow de fechamento mensal, a importação de
  CSV e a exportação de relatórios em CSV.
- **Simulado (dados em memória)**: não há banco de dados nem backend — ao
  recarregar a página, os dados voltam ao estado inicial de demonstração.
  Não há autenticação real (login é só uma seleção de perfil). Para virar
  uma ferramenta de produção com múltiplos usuários e dados persistentes,
  veja o roteiro de próximos passos discutido na conversa que gerou este
  projeto (schema PostgreSQL, API, autenticação real etc.).

## Estrutura

```
src/
  App.jsx       → toda a aplicação (telas, motor de cálculo, dados de demo)
  main.jsx      → ponto de entrada do React
  index.css     → Tailwind
index.html
vite.config.js
tailwind.config.js
```
