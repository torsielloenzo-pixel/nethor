(function(){
'use strict';
function header(){
 return `<header class="stockDesktopChrome" data-nethor-stock-chrome="desktop">
  <div class="top stockDesktopTop">
   <div class="stockDesktopIdentity">
    <div class="brand">
     <div class="brandMenuWrap">
      <button id="brandMenuBtn" class="brandMenuBtn nethorDesktopBrandButton" type="button" onclick="location.href='home.html'" aria-label="Accueil Nethor"><span class="nethorDesktopWordmark" aria-hidden="true"><span class="nethorDesktopWordmarkNe">ne</span><span class="nethorDesktopWordmarkThor">thor</span></span></button>
      <div id="brandMenu" class="brandMenu hidden">
       <div class="brandMenuTitle">Navigation</div>
       <button onclick="goBrand('home.html')"><span>⌂</span><div><strong>Accueil</strong><small>Choisir un outil</small></div></button>
       <button onclick="goBrand('profile.html')"><span>☺</span><div><strong>Mon profil</strong><small>Photo et compte</small></div></button>
       <button onclick="goBrand('index.html')"><span class="navToolLogo stock"></span><div><strong>Stock F&amp;L</strong><small>Gestion du stock</small></div></button>
       <button onclick="goBrand('planning.html')"><span class="navToolLogo planning"></span><div><strong>Planning</strong><small>Horaires de l'équipe</small></div></button>
       <button onclick="goBrand('chat.html')"><span class="navToolLogo equipe"></span><div><strong>Chat</strong><small>Messagerie interne</small></div></button>
       <button onclick="goBrand('articles.html')"><span>▤</span><div><strong>Fiches articles</strong><small>Référentiel EAN13</small></div></button>
       <button class="adminOnlyMenu hidden" onclick="openUsersFromBrand()"><span>♙</span><div><strong>Comptes</strong><small>Utilisateurs et rôles</small></div></button>
       <button class="adminOnlyMenu hidden settingsLink" onclick="goBrand('settings.html')"><span>⚙</span><div><strong>Personnalisation</strong><small>Réglages du portail</small></div></button>
       <button class="themeToggle" onclick="toggleTheme(event)"><span class="themeIcon">☾</span><div><strong class="themeLabel">Mode sombre</strong><small class="themeSub">Passer au thème sombre</small></div></button>
       <button class="brandLogout" onclick="logoutFromBrand()"><span>↪</span><div><strong>Déconnexion</strong><small>Quitter la session</small></div></button>
      </div>
     </div>
    </div>
    <div id="who" class="small">Chargement…</div>
   </div>
   <div class="stockDesktopHeaderActions">
    <button id="suggestBtn" class="suggestTop" onclick="openSuggestions()"><span class="suggestTopIcon">✦</span><span>Suggérer</span></button>
    <button id="cartBtn" class="suggestTop cartTop" onclick="openOrderCart()"><span class="suggestTopIcon">🛒</span><span>Panier</span><b id="cartCount" class="cartCount hidden">0</b></button>
    <button id="manageBtn" class="manage" onclick="openManage()">⚙︎ Gérer</button>
    <button class="logout" onclick="location.href='home.html'" title="Retour">←</button>
   </div>
  </div>
 </header>`
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