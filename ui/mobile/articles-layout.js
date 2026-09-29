(function(){
'use strict';
function build(){
 return {
  platform:'mobile',
  html:'<main class="articlesMobileLayout" data-nethor-articles-platform="mobile"><div class="articlesMobileTop"><button class="articlesMobileBack" type="button" onclick="window.NethorNavigation?.navigateBack?window.NethorNavigation.navigateBack():location.href=\'home.html\'" aria-label="Retour">‹</button><div class="articlesMobileTitle"><h1>Fiches articles</h1><p>Référentiel produit interne</p></div>'+"<div class=\"countBox\"><strong id=\"count\">0</strong> fiches</div>"+'</div>'+"</div><div id=\"adminHub\" class=\"adminHub hidden\"><button class=\"primary\" onclick=\"openCreate()\">＋ Créer une fiche</button><button onclick=\"openOptions('family')\">Familles</button><button onclick=\"openOptions('category')\">Catégories</button><button onclick=\"openOptions('packaging')\">Conditionnements</button></div><div class=\"controls\"><input id=\"search\" class=\"search\" type=\"search\" placeholder=\"Rechercher nom, EAN13 ou code article…\" oninput=\"render()\"><div class=\"filters\"><button class=\"filter active\" data-filter=\"all\" onclick=\"setFilter('all')\">Toutes</button><button class=\"filter\" data-filter=\"on\" onclick=\"setFilter('on')\">Actif</button><button class=\"filter\" data-filter=\"off\" onclick=\"setFilter('off')\">Inactif</button></div></div><div id=\"grid\" class=\"grid\"><div class=\"empty\">Chargement…</div></div>"+'</main>'
 }
}
window.NethorMobileArticlesLayout=Object.freeze({build});
})();