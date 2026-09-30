(function(){
'use strict';
function build(){
 return{
  platform:'desktop',
  html:`<div id="login" class="authDesktopRoot hidden" data-nethor-login-platform="desktop">
   <div class="authDesktopShell">
    <section class="authDesktopVisual" aria-label="Nethor">
     <div class="authDesktopBrand">
      <img class="authDesktopLogo" src="assets/app-icon-v63.svg" alt="">
      <div><div class="authDesktopName">Nethor</div><div class="authDesktopSub">Portail opérationnel interne</div></div>
     </div>
     <div class="authDesktopArt" aria-hidden="true"><span>▦</span><span>✓</span><span>☷</span><span>🛒</span><span>⌁</span><span>⚙</span></div>
     <div class="authDesktopIntro"><strong>Les opérations du magasin, dans un seul espace.</strong><span>Stock, planning, communication d’équipe et référentiels internes accessibles depuis une interface sécurisée.</span></div>
    </section>
    <form class="loginCard authDesktopForm" onsubmit="login(event)">
     <div class="loginHello authDesktopEyebrow">Accès interne</div>
     <h1>Bienvenue</h1>
     <p class="loginHint authDesktopHint">Connectez-vous pour accéder aux outils opérationnels du magasin.</p>
     <div class="field"><label for="email">Identifiant</label><input id="email" type="text" autocomplete="username" placeholder="Votre identifiant" required></div>
     <div class="field"><label for="password">Mot de passe</label><div class="passwordWrap"><input id="password" type="password" autocomplete="current-password" placeholder="Votre mot de passe" required><button type="button" class="eyeBtn" onclick="togglePassword()" aria-label="Afficher le mot de passe">◉</button></div></div>
     <div class="loginHelp"><button type="button" class="forgotBtn" onclick="openForgotPassword()">Mot de passe oublié ?</button></div>
     <button class="primary loginSubmit authDesktopSubmit">Se connecter <span>→</span></button>
     <div id="loginError" class="error" aria-live="polite"></div>
     <div class="loginFoot">Accès réservé aux utilisateurs autorisés</div>
    </form>
   </div>
  </div>`
 }
}
window.NethorDesktopLoginLayout=Object.freeze({build});
})();