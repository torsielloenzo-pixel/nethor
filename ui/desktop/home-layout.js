(function(){
'use strict';
function build(){
 return {
  platform:'desktop',
  html:'<div class="homeDesktopLayout" data-nethor-home-platform="desktop"><div class="hello"><div class="eyebrow">PORTAIL OPÉRATIONNEL INTERNE</div><h1 id="helloTitle">Bonjour 👋</h1><p id="homeTodayMessage" class="homeTodayMessage">Chargement de ton planning d’aujourd’hui…</p><div class="helloMeta"><span>Accès authentifié</span><span>Outils magasin</span><span>Mobile &amp; bureau</span></div></div><section id="homeDashboard" class="homeDashboard homeDesktopDashboard" aria-live="polite"></section><div id="homePages" class="pages"></div><div id="status" class="status">Vérification de la session…</div></div>'
 }
}
window.NethorDesktopHomeLayout=Object.freeze({build});
})();