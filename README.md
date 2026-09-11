# DOAVESSO — loja de camisetas

Loja em português com catálogo, filtro, busca, ordenação, tamanhos, sacola, checkout, histórico de pedidos e estúdio de estampas (criar na hora ou descrever a ideia). Site estático publicado no GitHub Pages; catálogo, pedidos, artes e newsletter no Supabase.

- Site: https://dipolo-gif.github.io/doavesso/
- Publicação: a cada push na `main`, o workflow roda `npm audit`, `npm test` e `npm run validate` e publica `dist/`.

## Executar

Node.js 22 ou mais recente. `npm start` abre o servidor local em http://127.0.0.1:5174 (com cabeçalhos de segurança). O site de produção é estático; não precisa de dependências de execução.

`npm test` executa verificações de compra e interação com DOM emulado (inclui o modo online com `fetch` simulado). `npm run validate` verifica referências, sintaxe e estrutura estática. `npm run images` regenera as imagens de `dist/assets/` a partir dos originais em `assets-src/`.

## Backend (Supabase)

Projeto `doavesso` (região São Paulo). O navegador usa a chave pública de `dist/api.js`; o que ela pode fazer é definido pelas migrações em `supabase/migrations/`:

- `products` e `store_settings`: leitura pública (catálogo, frete, preços do estúdio).
- `orders` e `order_items`: sem acesso direto; gravados só por `place_order()`, que recalcula preços e frete no servidor, valida tudo e limita 10 pedidos/hora por e-mail. Status inicial `aguardando_pagamento`.
- `newsletter_subscribers`: só por `subscribe_newsletter()`.
- `get_order(código, e-mail)`: consulta de status sem login.
- Contas (Supabase Auth): e-mail + senha com confirmação obrigatória, senha mínima de 8 caracteres com letras e números, redefinição por e-mail, e botão “Continuar com Google” (PKCE) — ativo assim que o provedor for configurado no painel. `profiles` guarda nome e endereço de entrega (RLS: só o dono). Pedidos feitos logado recebem `user_id`; o cliente vê os próprios pedidos em “Minha conta” via RLS. Compra como visitante continua possível.
- Storage `designs` (privado): prévia e arte de cada item do estúdio, em `uuid/preview.jpg` e `uuid/art.webp`.

Pedidos e artes são vistos no painel do Supabase (Table Editor → `orders`/`order_items`; Storage → `designs`). Para aplicar as migrações em um projeto novo, execute os arquivos de `supabase/migrations/` em ordem no SQL Editor e faça o seed dos produtos.

Se a API estiver fora do ar ou a chave não estiver configurada, o site cai no modo demonstrativo (catálogo embutido, pedido só local).

## Arquivos

- `dist/index.html`: estrutura, conteúdo e CSP.
- `dist/styles.css`: identidade, responsividade, animações e redução de movimento.
- `dist/app.js`: interações, editor canvas, checkout, histórico e consulta de pedidos.
- `dist/commerce.js`: catálogo embutido (fallback), preços em centavos, totais, saneamento da sacola.
- `dist/api.js`: acesso ao Supabase (catálogo, funções, upload de artes) e cliente de autenticação (sessão, login, cadastro, Google/PKCE, redefinição de senha) sem biblioteca externa.
- `dist/assets/`: versões WebP responsivas (com JPEG de fallback) das três fotografias, geradas por `scripts/optimize-images.mjs`.
- `assets-src/`: originais em PNG, fora do site publicado.
- `supabase/migrations/`: esquema, RLS, funções e políticas do Storage.
- `docs/seguranca.md`: os 20 pontos de segurança, item a item, e o que ainda falta.

## Escopo atual

Pré-lançamento: os pedidos são registrados de verdade, mas **não há cobrança** — o pagamento (Pix/cartão com webhook) ainda não está integrado, e não há e-mail automático. Preços, medidas, especificações de tecido e políticas de troca/entrega são texto de exemplo; substitua pelos dados reais antes de vender.

O editor oferece bases branca/preta, tamanho P–GG, texto, três fontes, cores prontas ou livre, upload PNG/JPG/WebP de até 5 MB, escala, posição vertical, rotação e exportação PNG. O modo “Descrever a ideia” troca texto/imagem por um briefing de até 400 caracteres (estampa sob medida, R$ 149,90). A prévia é ilustrativa; não é arquivo técnico de impressão nem prova de cor.

WebMCP opcional: leitura de catálogo/sacola e adição de produto usam as mesmas ações da interface. O navegador precisa suportar `document.modelContext`; suporte não obrigatório para utilizar a loja.
