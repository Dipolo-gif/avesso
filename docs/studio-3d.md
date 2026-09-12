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

A estampa usa uma superfície frontal fixa que acompanha as dobras. Mover, rotacionar e escalar altera sua matriz UV, sem recriar a geometria durante o arraste. A seleção usa o primeiro ponto visível da camiseta e a transparência da arte: não seleciona a estampa através das costas. O ponto de contato é preservado ao arrastar; não salta para o centro. Shift + setas ajusta a posição, e as setas giram a peça.

A imagem e o texto compõem uma estampa frontal única. Os controles de posição acessíveis continuam disponíveis. A roda do mouse sobre a arte ajusta o tamanho. A prévia para baixar e para a sacola é renderizada de frente, preservando cor, texto, imagem e posição, independentemente do giro atual. O formato do pedido conserva `garment`, `x`, `y`, `scale` e `rotation`.

## Limites da representação

É uma prévia de produto, não um molde de confecção nem uma simulação do tamanho P/M/G/GG no corpo. Não há simulação física de tecido em tempo real. Não afirma reproduzir exatamente uma peça fabricada: isso exige medidas, modelagem e amostra do fornecedor. Cores variam com iluminação e tela. A posição é limitada à área frontal personalizável.

## Verificação

Testes automatizados cobrem projeção/rotação, arraste sem salto, limites, persistência e integridade do GLB. A verificação em Chrome inclui giro, arraste, seleção frontal, envio de imagem, cor personalizada, exportação PNG, sacola após recarga, ausência de renderização contínua em repouso, layout móvel e nova tentativa após falha de carregamento. Não são criados pedidos reais por esses testes de interface.
