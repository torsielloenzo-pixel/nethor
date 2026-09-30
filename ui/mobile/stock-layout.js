(function(){
'use strict';
function header(){
 return `<header class="stockMobileChrome" data-nethor-stock-chrome="mobile">
  <div class="stockMobileTop">
   <button class="stockMobileBack" type="button" onclick="window.NettoProfileUI?.goBack?window.NettoProfileUI.goBack():location.href='home.html'" aria-label="Retour">‹</button>
   <div class="stockMobileTitle"><div class="title">Fruits &amp; Légumes</div><div class="subtitle">Stock, consultation et commandes</div></div>
  </div>
  <div id="who" class="stockMobileWho">Chargement…</div>
  <div class="stockMobileFunctionalBridge" aria-hidden="true">
   <button id="suggestBtn" class="hidden" tabindex="-1" onclick="openSuggestions()">Suggérer</button>
   <button id="cartBtn" class="hidden" tabindex="-1" onclick="openOrderCart()">Panier<b id="cartCount" class="hidden">0</b></button>
   <button id="manageBtn" class="hidden" tabindex="-1" onclick="openManage()">Gérer</button>
  </div>
 </header>`
}
function modeNav(){
 return `<nav class="stockModeNav stockMobileModeNav" aria-label="Espaces Stock F&amp;L" data-nethor-stock-nav="mobile">
  <button class="stockModeBtn stock active" data-mode="stock" onclick="setStockMode('stock')"><span>▦</span><b>Stock</b></button>
  <button class="stockModeBtn" data-mode="consult" onclick="setStockMode('consult')"><span>⌕</span><b>Consulter</b></button>
  <button class="stockModeBtn adminWorkspace" data-mode="order" onclick="setStockMode('order')"><span>🛒</span><b>Commande</b></button>
  <button class="stockModeBtn adminWorkspace" data-mode="manage" onclick="setStockMode('manage')"><span>⚙</span><b>Gestion</b></button>
 </nav>`
}
function build(){return{platform:'mobile',header:header(),modeNav:modeNav()}}
window.NethorMobileStockLayout=Object.freeze({build});
})();