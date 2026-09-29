(function(){
'use strict';
function notifications(){
 return {platform:'desktop',html:'<div class="notificationsDesktopLayout" data-nethor-tool-page="notifications">'+"<main class=\"notificationsPageMain\">\n  <div class=\"npFilterLine\">\n    <strong id=\"npSectionTitle\">Nouveau</strong>\n    <div class=\"npFilterTools\">\n      <button id=\"npFilterState\" class=\"npFilterState\" type=\"button\">Toutes</button>\n      <button id=\"npSearchBtn\" class=\"npCircleBtn\" type=\"button\" aria-label=\"Rechercher dans les notifications\" title=\"Rechercher\">\n        <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"10.5\" cy=\"10.5\" r=\"6.5\"/><path d=\"m15.4 15.4 4.3 4.3\"/></svg>\n      </button>\n      <button id=\"npMoreBtn\" class=\"npCircleBtn more\" type=\"button\" aria-label=\"Options des notifications\" aria-expanded=\"false\" title=\"Options\">⋯</button>\n      <div id=\"npTopMenu\" class=\"npTopMenu hidden\">\n        <button id=\"npUnreadOnly\" type=\"button\">Afficher uniquement les non lues</button>\n        <button id=\"npMarkAll\" type=\"button\">✓ Tout marquer comme lu</button>\n        <button id=\"npDeleteAll\" class=\"danger\" type=\"button\">Supprimer toutes les notifications</button>\n      </div>\n    </div>\n  </div>\n  <div id=\"npSearchWrap\" class=\"npSearchWrap\"><input id=\"npSearch\" class=\"npSearch\" type=\"search\" placeholder=\"Rechercher une notification…\" autocomplete=\"off\"></div>\n  <section id=\"npList\" class=\"npList\" aria-live=\"polite\"><div class=\"npEmpty\"><div><div class=\"npEmptyIcon\">🔔</div><strong>Chargement…</strong><span>Récupération de tes notifications.</span></div></div></section>\n</main>"+'</div>'}
}
function scanner(){
 return {platform:'desktop',html:'<main class="scannerDesktopLayout page" data-nethor-tool-page="scanner"><div class="scannerDesktopIntro"><div><span class="scannerEyebrow">OUTIL MOBILE</span><h1>Scanner <small>bêta</small></h1><p>La lecture caméra est disponible uniquement depuis l’interface Mobile Nethor.</p></div><button class="scannerDesktopBack" type="button" onclick="window.NethorNavigation?.navigateBack?window.NethorNavigation.navigateBack():location.href=\'home.html\'">← Retour</button></div>'+"<section class=\"desktopOnly\"><strong>Scanner est réservé au mobile</strong><p>Ouvre Nethor sur ton téléphone pour utiliser l’appareil photo.</p></section>"+'</main>'}
}
function build(page){
 if(page==='notifications')return notifications();
 if(page==='scanner')return scanner();
 return null
}
window.NethorDesktopToolPagesLayout=Object.freeze({build});
})();