# Camiseta 3D — duavesso

## Modelo e origem

A versão atual adapta a camiseta do [exemplo t-shirt-configurator da Poimandres](https://github.com/pmndrs/examples/tree/6ea1379e3163aa413970fea2e6b7b3e59b63d2c4/examples/t-shirt-configurator), sob MIT, em vez da simulação experimental de `scripts/blender/tee-cloth-sim.py`.

- Revisão de origem: `6ea1379e3163aa413970fea2e6b7b3e59b63d2c4`.
- Arquivo original: `examples/t-shirt-configurator/src/shirt_baked_collapsed.glb`.
- SHA-256 original: `4c020995f86593348909fc6da64c390d60ef2a22f8a4d421f70aced70acc3725`.
- Saída: `dist/assets/tee.glb`, 454.712 bytes, 19.517 triângulos, 10.513 vértices.
- Licença distribuída: `dist/assets/tee-LICENSE.txt`. Three.js: `dist/vendor/three-LICENSE.txt`.

O modelo conserva gola, mangas abertas, barra, costuras e dobras da malha original. A adaptação amplia as proporções, reduz a profundidade e solta a cintura. O material usa superfície fosca, microtextura sutil e oclusão ambiente em `tee-ao.webp`. Não inclui corpo, câmeras ou luzes no arquivo.

Para reproduzir, obtenha o arquivo original na revisão acima e execute:

```sh
node scripts/prepare-shirt.mjs caminho/shirt_baked_collapsed.glb
npm run vendor
npm test
npm run validate
```

## Interação e desempenho

Three.js e o modelo só carregam ao abrir a prévia 3D. Giro com inércia; sem giro automático durante a edição. Controles de frente, costas e detalhe; zoom por pinça ou roda do mouse. O renderizador pausa quando a câmera está parada, o estúdio está fora da tela ou a aba está oculta.

Cada estampa é um projetor (`dist/studio-placement.js`): a malha inteira da camiseta é desenhada de novo com um material cujo shader projeta a arte a partir de um ponto e uma normal da superfície (`printFrame` → `projectorMatrix`), descartando fragmentos fora da caixa, atrás do plano, virados para o outro lado ou de outro grupo de superfície (corpo, manga esquerda, manga direita — assim a arte da manga não vaza para o corpo escondido embaixo). Mover, rotacionar e escalar só troca uma matriz; nada é remalhado durante o arraste. A seleção usa o primeiro ponto visível da camiseta e a transparência da arte (com tolerância de ~14 px para letras finas). O ponto de contato é preservado ao arrastar (`dragPlace`). Na frente e dentro da faixa dos sliders o lugar é gravado como `x`/`y` (compatível com a prévia 2D); em qualquer outro lugar vira `place = {p, n, zone}` em metros. Os botões “Estampa em” levam a estampa selecionada para o centro de cada zona e viram a câmera. Shift + setas ajusta a posição, e as setas giram a peça.

Uma peça aceita até 4 estampas (abas “Estampa 1…4”); cada uma tem texto e/ou imagem, fonte, cor, tamanho, rotação e lugar. Uma nova estampa nasce na primeira zona livre (costas, manga esquerda, manga direita) e, se todas estiverem ocupadas, na frente mais abaixo. A roda do mouse sobre uma arte ajusta o tamanho dela. A prévia para baixar e para a sacola é renderizada de frente e, quando há estampa fora da frente, compõe também costas e mangas com rótulo. O formato do pedido conserva `garment` e `prints[]` (`text`, `font`, `ink`, `scale`, `rotation`, `x`, `y`, `place`, `image_path`); sacolas antigas com uma estampa nos campos de cima continuam válidas (viram `prints` de 1). No checkout cada imagem sobe para uma pasta uuid própria (`<uuid>/art.webp`, única forma aceita pela política do bucket) e `image_path` do item aponta para a primeira.

## Limites da representação

É uma prévia de produto, não um molde de confecção nem uma simulação do tamanho P/M/G/GG no corpo. Não há simulação física de tecido em tempo real. Não afirma reproduzir exatamente uma peça fabricada: isso exige medidas, modelagem e amostra do fornecedor. Cores variam com iluminação e tela. A classificação de zona (frente/costas/lateral/mangas) é geométrica e aproximada perto das cavas.

## Verificação

Testes automatizados cobrem projeção/rotação, arraste sem salto, limites, persistência e integridade do GLB. A verificação em Chrome inclui giro, arraste, seleção frontal, envio de imagem, cor personalizada, exportação PNG, sacola após recarga, ausência de renderização contínua em repouso, layout móvel e nova tentativa após falha de carregamento. Não são criados pedidos reais por esses testes de interface.
