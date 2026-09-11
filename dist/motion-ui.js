// Animações de entrada com Motion (vendor/motion.js: animate, inView, stagger).
// Só decora: sem JS ou com "reduzir movimento" ativo, tudo aparece normalmente.
import {animate, inView, stagger} from './vendor/motion.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
if (!reduced.matches) start();

function start() {
  const EASE = [0.22, 1, 0.36, 1];
  const seen = new WeakSet();

  // Grupos: seletor do contêiner → filhos revelados em sequência.
  const groups = [
    ['.trust-strip', ':scope > li', {y: 14, gap: 0.06}],
    ['.collection .section-heading', ':scope > *', {y: 18, gap: 0.08}],
    ['#product-grid', '.product-card', {y: 26, gap: 0.07}],
    ['.studio-teaser', '.studio-teaser-copy > *', {y: 18, gap: 0.07}],
    ['.about', ':scope > *', {y: 18, gap: 0.09}],
    ['.pillars', ':scope > li', {y: 22, gap: 0.1}],
    ['.footer-top', ':scope > *', {y: 14, gap: 0.08}],
    ['#studio-view', '.editor-heading, .section-heading, .editor-visual, .editor-controls > fieldset', {y: 16, gap: 0.07}]
  ];

  const hidden = new Map(); // contêiner → elementos ainda escondidos
  const show = el => { el.style.opacity = ''; el.style.transform = ''; };
  const take = container => { const list = (hidden.get(container) || []).filter(el => el.style.opacity === '0'); hidden.delete(container); return list; };

  function reveal(container, childSel, {y, gap}) {
    const items = [...container.querySelectorAll(childSel)].filter(el => !seen.has(el));
    if (!items.length) return;
    items.forEach(el => seen.add(el));
    // Conteúdo que chegou depois (catálogo do servidor) em um bloco já rolado: aparece direto.
    if (container.getBoundingClientRect().bottom < 0) return;
    items.forEach(el => { el.style.opacity = '0'; });
    hidden.set(container, [...(hidden.get(container) || []), ...items]);
    inView(container, () => {
      const pending = take(container);
      if (pending.length) animate(pending, {opacity: [0, 1], y: [y, 0]}, {duration: 0.7, ease: EASE, delay: stagger(gap)}).then(() => pending.forEach(show));
    }, {margin: '0px 0px -10% 0px', amount: 0.05});
  }

  // Quem pula a página (tecla End, flick rápido) pode passar por cima de um bloco sem ele
  // intersectar: tudo que já ficou acima da tela aparece na hora, sem animação.
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      for (const container of [...hidden.keys()]) if (container.getBoundingClientRect().bottom < 0) take(container).forEach(show);
    });
  }, {passive: true});

  function run() {
    for (const [containerSel, childSel, opts] of groups) {
      document.querySelectorAll(containerSel).forEach(c => reveal(c, childSel, opts));
    }
  }
  run();

  // A prévia do estúdio entra com um leve zoom; a sacola já tem transição própria em CSS.
  const preview = document.querySelector('.studio-preview');
  if (preview) {
    preview.style.opacity = '0';
    inView(preview, () => {
      animate(preview, {opacity: [0, 1], scale: [0.96, 1]}, {duration: 0.9, ease: EASE})
        .then(() => { preview.style.opacity = ''; preview.style.transform = ''; });
    }, {amount: 0.15});
  }

  // Cards re-renderizados por filtro/busca e o estúdio ao abrir: observar mudanças e revelar de novo.
  const grid = document.getElementById('product-grid');
  if (grid) new MutationObserver(() => reveal(grid, '.product-card', {y: 26, gap: 0.07})).observe(grid, {childList: true});

  // Se o usuário ligar "reduzir movimento" no meio da navegação, para de esconder elementos.
  reduced.addEventListener('change', () => { if (reduced.matches) document.querySelectorAll('[style*="opacity: 0"]').forEach(el => { el.style.opacity = ''; }); });
}
