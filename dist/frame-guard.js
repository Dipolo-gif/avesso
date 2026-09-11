// Anti-clickjacking para GitHub Pages, que não permite cabeçalho X-Frame-Options nem
// frame-ancestors (ignorado em <meta>). Se a página for aberta dentro de um iframe de
// outra origem, tira do frame; se não conseguir (cross-origin), esconde o conteúdo.
(function () {
  try {
    if (window.top !== window.self) { window.top.location = window.location.href; }
  } catch (e) {
    document.documentElement.style.display = 'none';
  }
})();
