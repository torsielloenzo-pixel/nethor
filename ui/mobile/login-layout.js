(function(){
'use strict';
function build(){
 return{
  platform:'mobile',
  html:`<div id="login" class="authMobileRoot hidden" data-nethor-login-platform="mobile">
   <div class="authMobileShell">
    <form class="loginCard authMobileForm" onsubmit="login(event)">
     <section class="authMobileBrand" aria-label="Nethor">
      <img class="authMobileLogo" src="assets/app-icon-mobile-v71.svg?v=72" alt="">
      <div class="authMobileBrandCopy">
       <strong>Nethor</strong>
       <span>Portail opérationnel interne</span>
      </div>
     </section>

     <div class="authLoginFields">
      <div class="field authField">
       <label class="authFieldLabel" for="email">Identifiant</label>
       <span class="authFieldIcon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg></span>
       <input id="email" type="text" autocomplete="username" placeholder="Identifiant" autocapitalize="none" spellcheck="false" required>
      </div>
      <div class="field authField">
       <label class="authFieldLabel" for="password">Mot de passe</label>
       <span class="authFieldIcon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span>
       <div class="passwordWrap">
        <input id="password" type="password" autocomplete="current-password" placeholder="Mot de passe" required>
        <button type="button" class="eyeBtn" onclick="togglePassword()" aria-label="Afficher le mot de passe"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-5.5 9.5-5.5S21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.6"/></svg></button>
       </div>
      </div>
     </div>

     <button class="primary loginSubmit authMobileSubmit">Se connecter <span>→</span></button>
     <div class="loginHelp"><button type="button" class="forgotBtn" onclick="openForgotPassword()">Mot de passe oublié ?</button></div>
     <div id="loginError" class="error" aria-live="polite"></div>

     <div class="authFeatureDivider" aria-hidden="true"></div>
     <div class="authFeatureGrid" aria-label="Fonctions Nethor">
      <div class="authFeature"><span><svg viewBox="0 0 24 24"><path d="M4 19V10"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19V2"/></svg></span><small>Gestion</small></div>
      <div class="authFeature"><span><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg></span><small>Planning</small></div>
      <div class="authFeature"><span><svg viewBox="0 0 24 24"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg></span><small>Stock</small></div>
      <div class="authFeature"><span><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14 14.5a5 5 0 0 1 7 4.5"/></svg></span><small>Équipe</small></div>
     </div>
     <div class="loginFoot">Accès réservé aux utilisateurs autorisés</div>
    </form>
   </div>
  </div>`
 }
}
window.NethorMobileLoginLayout=Object.freeze({build});
})();