(function(){
'use strict';
function build(){
 return {
  platform:'desktop',
  html:'<div class="homeDesktopLayout" data-nethor-home-platform="desktop"><section id="homeDashboard" class="homeDashboard homeDesktopDashboard" aria-live="polite"></section><div id="homePages" class="pages"></div><div id="status" class="status">Vérification de la session…</div><dialog id="pageViewsDialog" class="pageViewsDialog"><div class="pageViewsCard"><div class="pageViewsHead"><div><h2 id="pageViewsTitle">Consultations</h2><p>Statistiques depuis la dernière réinitialisation. Les administrateurs sont exclus.</p></div><button class="pageViewsClose" onclick="$(\'pageViewsDialog\').close()" aria-label="Fermer">×</button></div><div class="pageViewsTotal"><span>Total des consultations</span><strong id="pageViewsTotal">0</strong></div><div id="pageViewsList" class="pageViewsList"></div><div class="pageViewsActions"><button class="pageViewsReset" onclick="resetCurrentPageViews()">Réinitialiser le compteur</button><button class="pageViewsDone" onclick="$(\'pageViewsDialog\').close()">Fermer</button></div></div></dialog></div>'
 }
}
window.NethorDesktopHomeLayout=Object.freeze({build});
})();