(function(){
'use strict';
function build(){
 return {
  platform:'desktop',
  html:'<main class="articlesDesktopLayout" data-nethor-articles-platform="desktop">'+"<div class=\"hero\"><div><h1>Référentiel articles</h1><p>Centre de gestion de toutes les fiches produits, familles, catégories et conditionnements.</p></div><div class=\"countBox\"><strong id=\"count\">0</strong> fiches</div>"+"</div><div id=\"adminHub\" class=\"adminHub hidden\"><button class=\"primary\" onclick=\"openCreate()\">＋ Créer une fiche</button><button onclick=\"openOptions('family')\">Familles</button><button onclick=\"openOptions('category')\">Catégories</button><button onclick=\"openOptions('packaging')\">Conditionnements</button></div><div class=\"controls\"><input id=\"search\" class=\"search\" type=\"search\" placeholder=\"Rechercher nom, EAN13 ou code article…\" oninput=\"render()\"><div class=\"filters\"><button class=\"filter active\" data-filter=\"all\" onclick=\"setFilter('all')\">Toutes</button><button class=\"filter\" data-filter=\"on\" onclick=\"setFilter('on')\">Actif</button><button class=\"filter\" data-filter=\"off\" onclick=\"setFilter('off')\">Inactif</button></div></div><div id=\"grid\" class=\"grid\"><div class=\"empty\">Chargement…</div></div>"+'</main>'
 }
}
window.NethorDesktopArticlesLayout=Object.freeze({build});
})();