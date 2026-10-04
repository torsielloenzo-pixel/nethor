(function(){
'use strict';
function header(){
 const chrome=window.NethorDesktopShell?.buildDesktopChrome?.('stock')||'';
 return chrome+`<div class="stockDesktopPageBar">
  <div class="stockDesktopIdentity"><div id="who" class="small">Chargement…</div></div>
  <div class="stockDesktopHeaderActions">
   <button id="suggestBtn" class="suggestTop" onclick="openSuggestions()"><span class="suggestTopIcon">✦</span><span>Suggérer</span></button>
   <button id="cartBtn" class="suggestTop cartTop" onclick="openOrderCart()"><span class="suggestTopIcon">🛒</span><span>Panier</span><b id="cartCount" class="cartCount hidden">0</b></button>
   <button id="manageBtn" class="manage" onclick="openManage()">⚙︎ Gérer</button>
   <button class="logout" onclick="location.href='home.html'" title="Retour">←</button>
  </div>
 </div>`
}
function modeNav(){
 return `<nav class="stockModeNav stockDesktopModeNav" aria-label="Espaces Stock F&amp;L" data-nethor-stock-nav="desktop">
  <button class="stockModeBtn stock active" data-mode="stock" onclick="setStockMode('stock')"><span>▦</span>Stock</button>
  <button class="stockModeBtn" data-mode="consult" onclick="setStockMode('consult')"><span>⌕</span>Consulter</button>
  <button class="stockModeBtn adminWorkspace" data-mode="order" onclick="setStockMode('order')"><span>🛒</span>Commande</button>
  <button class="stockModeBtn adminWorkspace" data-mode="manage" onclick="setStockMode('manage')"><span>⚙</span>Gestion</button>
 </nav>`
}
function build(){return{platform:'desktop',header:header(),modeNav:modeNav()}}
window.NethorDesktopStockLayout=Object.freeze({build});
})();