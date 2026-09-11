# AVESSO — loja demonstrativa

Loja de camisetas em português, com catálogo, filtro, busca, ordenação, tamanhos, sacola, checkout de demonstração, histórico local e editor de estampas com exportação PNG.

## Executar

Node.js 22 ou mais recente. `npm start` abre o servidor em http://127.0.0.1:5174. O site de produção é estático; não precisa de dependências de execução.

`npm test` executa verificações de compra e interação com DOM emulado. `npm run validate` verifica referências, sintaxe e estrutura estática. `npm run images` regenera as imagens de `dist/assets/` a partir dos originais em `assets-src/`.

## Arquivos

- `dist/index.html`: estrutura e conteúdo em português.
- `dist/styles.css`: identidade, responsividade, animações e redução de movimento.
- `dist/app.js`: interações, editor canvas, checkout e armazenamento local.
- `dist/commerce.js`: catálogo, preços em centavos, totais e validação de sacola.
- `dist/assets/`: versões WebP responsivas (com JPEG de fallback) das três fotografias, geradas por `scripts/optimize-images.mjs`.
- `assets-src/`: originais em PNG, fora do site publicado.

## Escopo demonstrativo

Não processa pagamentos, emite pedidos comerciais, envia e-mails ou transmite endereços. Preços, produtos, frete, medidas, especificações de tecido, políticas de troca/entrega e o cadastro de newsletter são exemplos — substitua pelos dados reais antes de vender. No checkout, use “Preencher exemplo”. Dados de entrega não são persistidos. Sacola, miniatura personalizada e pedidos demonstrativos ficam no localStorage deste navegador, sujeito à cota e permissão do navegador.

O editor oferece bases branca/preta, tamanho P–GG, texto, três fontes, cor, upload PNG/JPG/WebP de até 5 MB, escala, posição vertical, rotação e exportação PNG. O modo “Descrever a ideia” troca texto/imagem por um briefing de até 400 caracteres (estampa sob medida, R$ 149,90 demonstrativos); a prévia mostra apenas a área reservada, e o briefing acompanha o item na sacola e no histórico local. A prévia exportada usa o mesmo renderizador da tela. Não é arquivo técnico de impressão ou prova física de cor.

Para vender de verdade: adicionar backend com preço/estoque autoritativos, armazenamento de artes, provedor de pagamento com webhook verificado, frete real, gerenciamento de pedidos e políticas comerciais. Não usar o localStorage como registro comercial.

WebMCP opcional: leitura de catálogo/sacola e adição de produto usam as mesmas ações da interface. O navegador precisa suportar `document.modelContext`; suporte não obrigatório para utilizar a loja.
