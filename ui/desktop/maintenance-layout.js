(function(){
'use strict';
function build(){
 return{
  platform:'desktop',
  html:`<div class="maintenanceDesktopLayout" data-nethor-maintenance-platform="desktop">
   <div class="glow" aria-hidden="true"></div>
   <main class="maintenance" aria-live="polite">
    <img class="logo" src="assets/app-icon-v63.svg?v=56" alt="Nethor">
    <h1>Nethor</h1>
    <p class="subtitle">Portail interne</p>
    <div class="status"><span class="gear" aria-hidden="true">⚙</span><span>Maintenance en cours</span></div>
   </main>
   <a id="maintenanceLogout" class="maintenanceLogout" href="https://nethor.fr/index.html?logout=1&v=115" aria-label="Se déconnecter et revenir à la connexion">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>
    <span>Retour à la connexion</span>
   </a>
  </div>`
 }
}
window.NethorDesktopMaintenanceLayout=Object.freeze({build});
})();