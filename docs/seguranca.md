# Segurança — os 20 pontos, um a um

Arquitetura: site estático no GitHub Pages + Supabase (Postgres, Storage) acessado direto do navegador com a chave pública, sob RLS. Não há servidor próprio; a lógica sensível (preços, validação, gravação) vive em funções `SECURITY DEFINER` no banco.

| # | Item | Situação | Onde |
|---|------|----------|------|
| 1 | Esconder API keys | Só a chave **publishable** vai ao navegador (feita para isso). A chave `service_role`/secret nunca sai do painel do Supabase e não está no repositório. | `dist/api.js` |
| 2 | Limpar secrets do git | Histórico varrido: nenhum segredo. Secret scanning + push protection ativos no GitHub. | repositório |
| 3 | Public key DB | Chave pública com privilégios mínimos: leitura de `products` e `store_settings`; execução das 3 funções. Nada mais é exposto. | `supabase/migrations/0001` |
| 4 | Ativar RLS | RLS em todas as tabelas. `orders`, `order_items` e `newsletter_subscribers` não têm política nenhuma para a API: só as funções gravam. Bucket `designs` privado, com política de upload restrita a pastas UUID e nomes fixos. | migração 0001 |
| 5 | Criptografia de dados | TLS em tudo (Pages força HTTPS; Supabase só HTTPS); dados em repouso criptografados pelo Supabase. Nenhum dado bancário é coletado. | plataforma |
| 6 | Auth server side | Sem login de cliente (checkout como visitante). Consulta de pedido exige código + e-mail conferidos no servidor (`get_order`). | `get_order` |
| 7 | Restringir acessos | Exposição automática de tabelas desligada no projeto; grants explícitos; `authenticated` e `rls_auto_enable()` sem execução. | migrações 0001/0002 |
| 8 | Bloquear mass assignment | `place_order` só lê campos conhecidos do JSON; preço, nome e status são definidos pelo servidor, nunca pelo cliente. Colunas com `check`. | `place_order` |
| 9 | Proteger cookies | Não há cookies nem sessão. A sacola fica em `localStorage`, sem dados pessoais, e é saneada ao carregar (`sanitizeDesign`, `normalizeCart`). | `dist/commerce.js` |
| 10 | Hash nas senhas | Não há senhas de cliente. Se houver login no futuro, usar Supabase Auth (bcrypt/argon gerenciado). | — |
| 11 | Rate limit | Parcial: `place_order` limita 10 pedidos/hora por e-mail; limites de tamanho na sacola (30 itens, 10 un.). Falta limite por IP — exigiria Edge Function ou Cloudflare na frente. | `place_order` |
| 12 | Bot protection | Parcial: honeypot na newsletter, validação estrita no servidor, sem envio de e-mail automático (nada a abusar). Sem CAPTCHA — recomendado Cloudflare Turnstile antes de integrar pagamento. | `index.html`, `app.js` |
| 13 | Queries parametrizadas | Nenhum SQL montado no cliente. PostgREST e funções PL/pgSQL com parâmetros tipados. | — |
| 14 | Validação dos inputs | Cliente: `required`, `pattern`, `maxlength`, limites de upload (tipo, 5 MB, 40 MP, reencode). Servidor: `check` em todas as colunas, validação de tamanhos/quantidades/e-mail/CEP, briefing ≥ 10 caracteres, JSON de design ≤ 4 KB. | migração 0001 |
| 15 | Vazar conteúdo | Pedidos e artes não são legíveis pela API pública (401/400). Erros do servidor mostrados ao usuário só quando são mensagens de validação (códigos 22023/53400); o resto vira mensagem genérica. | `dist/api.js` |
| 16 | Restringir uploads | Bucket privado, 5 MB, apenas `image/webp` e `image/jpeg`, nomes `uuid/preview.jpg` ou `uuid/art.webp`; imagens reencodadas no navegador antes de subir (remove metadados). Sem leitura pública. | migração 0001 |
| 17 | Trim respostas de API | `select` explícito de colunas no catálogo; funções devolvem só o necessário (`get_order` não devolve endereço). | `dist/api.js`, `get_order` |
| 18 | Security headers | CSP (scripts só do próprio site, conexões só ao Supabase), referrer policy, `X-Frame-Options`, `Permissions-Policy`, COOP/CORP, `nosniff`. No GitHub Pages os cabeçalhos HTTP não são configuráveis, então a CSP vai via `<meta>`; o servidor local envia todos. | `index.html`, `server.mjs` |
| 19 | Forçar HTTPS | GitHub Pages com "Enforce HTTPS" e `upgrade-insecure-requests` na CSP. | Pages |
| 20 | Scan de dependências | `npm audit --audit-level=high` no CI antes de publicar; Dependabot semanal (npm e Actions); alertas e correções automáticas ativos. O site não tem dependência em runtime. | `.github/` |

## Pendências antes de vender de verdade

- Integrar pagamento (Pix/cartão) com webhook verificado que mude `orders.status` — hoje o pedido nasce como `aguardando_pagamento` e ninguém cobra nada.
- Notificação por e-mail (confirmação de pedido e mudança de status).
- CAPTCHA (Turnstile) e limite por IP se houver abuso.
- Painel de atendimento: hoje os pedidos e as artes são vistos no painel do Supabase (Table Editor e Storage → `designs`).
