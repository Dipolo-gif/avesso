# Verificação

- Sintaxe de app.js, commerce.js e server.mjs validada pelo Node.
- Referências estáticas locais existentes, IDs sem duplicação e rotas principais verificadas.
- 10 testes passaram: cálculos em centavos; frete no limite de gratuidade; quantidades e tamanhos; restauração de itens e preços; URLs de imagens e escape; filtro e seleção de produto; sacola; checkout simulado sem persistência de contato; arte personalizada e restauração; contrato das ferramentas opcionais.
- Fluxos de interface testados em DOM emulado (jsdom). Canvas, carregamento de imagem e diálogos têm substitutos nesse teste: isto não é QA visual em navegador real.
- Três imagens geradas inspecionadas visualmente antes da integração.
- CSS inclui layouts móvel/desktop, foco visível, diálogo nativo e prefers-reduced-motion.
- WebMCP validado apenas com registro emulado. Contexto de navegador WebMCP nativo indisponível nesta verificação; não foi afirmada compatibilidade em navegador real.
- HTTP do servidor local respondeu 200. Prévia encaminhada ao painel do Codex.

Limites deliberados: checkout e envio simulados, dados locais sujeitos à cota do navegador, prévia de impressão ilustrativa, nenhuma integração de pagamento real.
