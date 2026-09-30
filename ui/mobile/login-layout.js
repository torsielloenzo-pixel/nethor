(function(){
'use strict';
function build(){
 return{
  platform:'mobile',
  html:`<div id="login" class="authMobileRoot hidden" data-nethor-login-platform="mobile">
   <div class="authMobileShell">
    <section class="authMobileBrand" aria-label="Nethor">
     <img class="authMobileLogo" src="assets/app-icon-mobile-v71.svg?v=72" alt="">
     <div class="authMobileBrandCopy"><strong>Nethor</strong><span>Portail opérationnel interne</span></div>
    </section>
    <div class="authMobileIntro"><span>Accès interne</span><strong>Bienvenue</strong><p>Connecte-toi pour accéder aux outils opérationnels du magasin.</p></div>
    <form class="loginCard authMobileForm" onsubmit="login(event)">
     <div class="field"><label for="email">Identifiant</label><input id="email" type="text" autocomplete="username" placeholder="Votre identifiant" autocapitalize="none" spellcheck="false" required></div>
     <div class="field"><label for="password">Mot de passe</label><div class="passwordWrap"><input id="password" type="password" autocomplete="current-password" placeholder="Votre mot de passe" required><button type="button" class="eyeBtn" onclick="togglePassword()" aria-label="Afficher le mot de passe">◉</button></div></div>
     <div class="loginHelp"><button type="button" class="forgotBtn" onclick="openForgotPassword()">Mot de passe oublié ?</button></div>
     <button class="primary loginSubmit authMobileSubmit">Se connecter <span>→</span></button>
     <div id="loginError" class="error" aria-live="polite"></div>
     <div class="loginFoot">Accès réservé aux utilisateurs autorisés</div>
    </form>
   </div>
  </div>`
 }
}
window.NethorMobileLoginLayout=Object.freeze({build});
})();