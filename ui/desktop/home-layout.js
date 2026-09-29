(function(){
'use strict';
function build(){
 return {
  platform:'desktop',
  html:'<div class="homeDesktopLayout" data-nethor-home-platform="desktop"><div class="hello"><div class="eyebrow">PORTAIL OPÉRATIONNEL INTERNE</div><h1 id="helloTitle">Bonjour 👋</h1><p id="homeTodayMessage" class="homeTodayMessage">Chargement de ton planning d’aujourd’hui…</p><div class="helloMeta"><span>Accès authentifié</span><span>Outils magasin</span><span>Mobile &amp; bureau</span></div></div><section id="homeDashboard" class="homeDashboard homeDesktopDashboard" aria-live="polite"></section><div id="homePages" class="pages"></div><div id="status" class="status">Vérification de la session…</div><dialog id="pageViewsDialog" class="pageViewsDialog"><div class="pageViewsCard"><div class="pageViewsHead"><div><h2 id="pageViewsTitle">Consultations</h2><p>Statistiques depuis la dernière réinitialisation. Les administrateurs sont exclus.</p></div><button class="pageViewsClose" onclick="$(\'pageViewsDialog\').close()" aria-label="Fermer">×</button></div><div class="pageViewsTotal"><span>Total des consultations</span><strong id="pageViewsTotal">0</strong></div><div id="pageViewsList" class="pageViewsList"></div><div class="pageViewsActions"><button class="pageViewsReset" onclick="resetCurrentPageViews()">Réinitialiser le compteur</button><button class="pageViewsDone" onclick="$(\'pageViewsDialog\').close()">Fermer</button></div></div></dialog></div>'
 }
}
window.NethorDesktopHomeLayout=Object.freeze({build});
})();