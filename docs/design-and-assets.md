# Direção e imagens

Para a camiseta interativa, origem da malha, licença, ajustes e reprodução do modelo, veja [Estúdio 3D](studio-3d.md).

DOAVESSO: marca provisória de camisetas independentes. Fotografia editorial de concreto e algodão, tipografia Barlow Condensed para campanha e Manrope para interface. Paleta: azul #1737bc, tinta #161719, papel frio #f7f8f9, cinza #e9eaec e texto secundário #64666e. A página combina campanha fotográfica com catálogo acessível logo abaixo, cartões sem molduras e estúdio com prévia grande. Movimento: entrada suave da campanha, faixa tipográfica contínua, aproximação das peças no hover e abertura lateral da sacola. `prefers-reduced-motion` desliga movimento.

Imagens geradas usando a ferramenta integrada image_gen. Originais em `assets-src/`:

- `assets-src/editorial.png` — 1536 × 1024.
- `assets-src/tee-black.png` — 1254 × 1254.
- `assets-src/tee-white.png` — 1254 × 1254.

`npm run images` gera em `dist/assets/` as versões servidas: WebP em 768/1200/1536 (editorial) e 400/800/1000/1254 (camisetas), mais um JPEG no tamanho máximo como fallback. O HTML usa `<picture>` com `srcset`/`sizes`; o canvas do estúdio usa as versões de 1000 px.

## Prompt editorial

Use case: photorealistic-natural
Asset type: streetwear e-commerce editorial hero photograph for DOAVESSO, 1536x1024 landscape.
Scene/backdrop: modern raw concrete courtyard with a subtle stainless steel architectural detail, Mediterranean late afternoon daylight.
Subject: an adult woman in an oversized mineral cobalt blue blank heavyweight cotton tee and washed jeans, alongside an adult man in a washed charcoal blank tee.
Style: authentic candid analogue fashion photography, natural skin and tactile cotton, restrained film grain, effortless real moment.
Composition: both people within the right 55 percent of the frame; generous quiet architectural negative space on the left for a website heading. Medium-wide editorial framing.
Constraints: no text, no logos, no graphics, no watermark. Avoid overly glossy, airbrushed or synthetic AI look.

## Prompt base preta

Use case: product-mockup
Asset type: customizable streetwear product canvas, square 1024x1024 photograph.
Primary request: a front-facing blank washed black/charcoal oversized heavyweight cotton t-shirt, flat lay viewed directly from above, centered and fully visible including both sleeves and hem, on a smooth very light cool gray backdrop.
Composition: symmetrical front of shirt, neckline near top, hem near bottom, generous clean margin on all sides; blank unobstructed central chest area usable for custom graphics.
Style: realistic premium catalog photography, tactile heavyweight cotton, subtle natural folds and soft studio shadows. Muted charcoal washed fabric.
Constraints: no text, no logos, no graphics, no tags with visible writing, no watermark, no props. Avoid glossy synthetic fabric and AI look.

## Prompt base branca

Use case: product-mockup
Asset type: customizable streetwear product canvas, square 1024x1024 photograph.
Primary request: a front-facing blank chalk white oversized heavyweight cotton t-shirt, flat lay viewed directly from above, centered and fully visible including both sleeves and hem, on a smooth very light cool gray backdrop.
Composition: symmetrical front of shirt, neckline near top, hem near bottom, generous clean margin on all sides; blank unobstructed central chest area usable for custom graphics.
Style: realistic premium catalog photography, tactile heavyweight cotton, subtle natural folds and soft studio shadows. Matte chalk white fabric.
Constraints: no text, no logos, no graphics, no tags with visible writing, no watermark, no props. Avoid glossy synthetic fabric and AI look.
