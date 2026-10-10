(function(){
'use strict';
function build(){
 return{
  platform:'desktop',
  html:`<div id="login" class="authDesktopRoot hidden" data-nethor-login-platform="desktop">
   <aside class="authDesktopHours" aria-label="Horaires habituels du magasin">
    <div class="authDesktopHoursLeft">
     <span class="authDesktopHoursIcon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></span>
     <div>
      <span class="authDesktopHoursLabel">Horaires d'ouverture aujourd'hui</span>
      <strong class="authDesktopHoursTime" data-auth-hours>08:00 – 20:00</strong>
      <small class="authDesktopHoursSunday">Dimanche : 09:00 – 12:30</small>
     </div>
    </div>
    <div class="authDesktopHoursRight">
     <strong class="authDesktopHoursStatus" data-auth-open>—</strong>
     <span class="authDesktopHoursNowLabel">Il est actuellement</span>
     <time class="authDesktopHoursClock" data-auth-clock>--:--</time>
    </div>
   </aside>
   <div class="authDesktopShell">
    <form class="loginCard authDesktopForm" onsubmit="login(event)">
     <section class="authDesktopBrand" aria-label="Nethor">
      <img class="authDesktopLogo" src="assets/nethor-login-mark.svg" alt="">
      <div class="authDesktopName">Nethor</div>
      <div class="authDesktopSub">Portail opérationnel interne</div>
     </section>

     <div class="authLoginFields">
      <div class="field authField">
       <label class="authFieldLabel" for="email">Identifiant</label>
       <span class="authFieldIcon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg></span>
       <input id="email" type="text" autocomplete="username" placeholder="Identifiant" required>
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

     <button class="primary loginSubmit authDesktopSubmit">Se connecter <span>→</span></button>
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
window.NethorDesktopLoginLayout=Object.freeze({build});
// Widget informatif : statut calculé d'après les horaires habituels, et non un état Google en direct.
function updateDesktopStoreHours(){
 const root=document.querySelector('.authDesktopRoot');
 if(!root)return;
 try{
  const parts=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',weekday:'long',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  const value=t=>parts.find(p=>p.type===t)?.value||'';
  const sunday=value('weekday').toLowerCase()==='dimanche';
  const mins=(Number(value('hour'))*60)+Number(value('minute'));
  const open=sunday?(mins>=540&&mins<750):(mins>=480&&mins<1200);
  const h=root.querySelector('[data-auth-hours]'),st=root.querySelector('[data-auth-open]'),clock=root.querySelector('[data-auth-clock]');
  if(h)h.textContent=sunday?'09:00 – 12:30':'08:00 – 20:00';
  if(st){st.textContent=open?'Ouvert':'Fermé';st.classList.toggle('isClosed',!open);st.title='Statut estimé selon les horaires habituels, hors fermetures exceptionnelles';}
  if(clock){clock.textContent=value('hour')+':'+value('minute');clock.dateTime=new Date().toISOString();}
 }catch(e){console.warn('Widget horaires desktop :',e)}
}
document.addEventListener('nethor:login-layout-ready',updateDesktopStoreHours);
setInterval(updateDesktopStoreHours,30000);

})();
