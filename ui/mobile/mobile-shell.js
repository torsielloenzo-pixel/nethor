(function(){
'use strict';
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function row(module,iconFor,urlOverride=''){
 if(!module)return'';
 const url=urlOverride||module.url||'';
 return '<button class="nettoMobileMenuRow nettoMobileMenuLink" type="button" data-url="'+esc(url)+'">'+
  '<span class="nettoMobileMenuIcon" aria-hidden="true">'+iconFor(module.id)+'</span>'+
  '<span class="nettoMobileMenuCopy"><strong>'+esc(module.label||'Menu')+'</strong>'+
  (module.subtitle?'<small>'+esc(module.subtitle)+'</small>':'')+
  '</span><span class="nettoMobileMenuChevron" aria-hidden="true">›</span></button>'
}
function buildQuickBar(items,iconFor){
 return items.map(({item,module})=>{
  const isUserMenu=module.id==='profile';
  const label=isUserMenu?'Menu utilisateur':(item.label||module.label||'Menu');
  const badge=module.id==='notifications'?'<b class="nettoMobileNotifBadge hidden" aria-label="Notifications non lues">0</b>':'';
  if(isUserMenu)return '<a class="nettoMobileQuickItem" data-mobile-id="profile" href="user-menu.html" aria-label="Menu utilisateur" title="Menu utilisateur"><span class="nettoMobileQuickIcon" aria-hidden="true">'+iconFor(module.id)+'</span></a>';
  return '<a class="nettoMobileQuickItem" data-mobile-id="'+esc(module.id)+'" href="'+esc(module.url||'home.html')+'" aria-label="'+esc(label)+'" title="'+esc(label)+'"><span class="nettoMobileQuickIcon" aria-hidden="true">'+iconFor(module.id)+'</span>'+badge+'</a>'
 }).join('')
}
function buildUserMenu(ctx){
 const {
  name='Utilisateur',role='',settingsModule,
  primary=[],admin=[],extra=[],notificationSettings=null,problemReport=null,problemUrl='',
  profileVisible=true,settingsVisible=true,themeVisible=true,updateVisible=true,
  controls={},iconFor
 }=ctx||{};
 const primaryRows=primary.map(m=>row(m,iconFor)).join('');
 const adminRows=admin.map(m=>row(m,iconFor)).join('');
 const extraRows=extra.map(m=>row(m,iconFor)).join('');
 const mobileProfileIcon=iconFor('settings');
 const control=(key,defaults)=>{const x=controls?.[key]&&typeof controls[key]==='object'?controls[key]:{};return{...defaults,...x,label:String(x.label||defaults.label),subtitle:String(x.subtitle||defaults.subtitle),url:String(x.url||'')}};
 const icon=(node,fallback)=>node.url?'<img src="'+esc(node.url)+'" alt="" style="display:block;width:100%;height:100%;object-fit:contain">':fallback;
 const theme=control('theme',{label:'Mode Halloween',subtitle:'Basculer entre favori et Halloween'}),update=control('update',{label:'Mise à jour',subtitle:'Rechercher une nouvelle version'}),logout=control('logout',{label:'Déconnexion',subtitle:'Quitter la session'}),menu=control('user_menu',{label:'Menu utilisateur',subtitle:'Profil, préférences et réglages'});
 const themeDefault='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9c0-.5 0-1-.1-1.5A7 7 0 0 1 12 3Z"/></svg>';
 const updateDefault='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v10"/><path d="m8.5 9.5 3.5 3.5 3.5-3.5"/><path d="M5 17.5V20h14v-2.5"/></svg>';
 const logoutDefault='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"/><path d="M14 8l4 4-4 4M18 12H9"/></svg>';
 const themeCustom=!!String(controls?.theme?.label||'').trim();
 return '<div class="nettoMobileUserMenu" aria-label="'+esc(menu.label)+'">'+
  '<div class="nettoMobileMenuHeader"><h2>'+esc(menu.label||'Menu')+'</h2></div>'+
  ((profileVisible||settingsVisible)?'<section class="nettoMobileMenuCard nettoMobileProfileCard">'+
   (profileVisible?'<button class="nettoMobileProfileMain nettoMobileMenuLink" type="button" data-url="profile.html"><span id="nettoMobileMenuAvatar" class="nettoTopAvatar nettoMobileProfileAvatar">U</span><span class="nettoMobileProfileCopy"><strong>'+esc(name)+'</strong><small>'+esc(role)+'</small></span><span class="nettoMobileMenuChevron" aria-hidden="true">›</span></button>':'')+
   (settingsVisible?'<button class="nettoMobileMenuRow nettoMobileMenuLink" type="button" data-url="'+esc(settingsModule?.url||'settings.html')+'"><span class="nettoMobileMenuIcon" aria-hidden="true">'+mobileProfileIcon+'</span><span class="nettoMobileMenuCopy"><strong>'+esc(settingsModule?.label||'Personnalisation')+'</strong><small>'+esc(settingsModule?.subtitle||'Accueil, raccourcis et apparence')+'</small></span><span class="nettoMobileMenuChevron" aria-hidden="true">›</span></button>':'')+
  '</section>':'')+
  (primaryRows?'<section class="nettoMobileMenuCard">'+primaryRows+'</section>':'')+
  ((notificationSettings||adminRows)?'<section class="nettoMobileMenuCard">'+
    (notificationSettings?row(notificationSettings,iconFor):'')+adminRows+'</section>':'')+
  (extraRows?'<section class="nettoMobileMenuCard">'+extraRows+'</section>':'')+
  '<section class="nettoMobileMenuCard nettoMobileMenuUtilityCard">'+
   (themeVisible?'<button id="nettoMobileThemeBtn" class="nettoMobileMenuRow" type="button"><span class="nettoMobileMenuIcon nettoThemeIconSvg" aria-hidden="true">'+icon(theme,themeDefault)+'</span><span class="nettoMobileMenuCopy"><strong class="nettoThemeLabel" '+(themeCustom?'data-static-theme-label="1"':'')+'>'+esc(theme.label)+'</strong><small>'+esc(theme.subtitle)+'</small></span><span class="nettoMobileMenuChevron" aria-hidden="true">›</span></button>':'')+
   (updateVisible?'<button id="nettoMobileUpdateBtn" class="nettoMobileMenuRow" type="button"><span class="nettoMobileMenuIcon" aria-hidden="true">'+icon(update,updateDefault)+'</span><span class="nettoMobileMenuCopy"><strong>'+esc(update.label)+'</strong><small>'+esc(update.subtitle)+'</small></span><span class="nettoMobileMenuChevron" aria-hidden="true">›</span></button>':'')+
   (problemReport?row(problemReport,iconFor,problemUrl):'')+
   '<button id="nettoMobileLogoutBtn" class="nettoMobileMenuRow nettoMobileMenuDanger" type="button"><span class="nettoMobileMenuIcon" aria-hidden="true">'+icon(logout,logoutDefault)+'</span><span class="nettoMobileMenuCopy"><strong>'+esc(logout.label)+'</strong><small>'+esc(logout.subtitle)+'</small></span><span class="nettoMobileMenuChevron" aria-hidden="true">›</span></button>'+
  '</section>'+
 '</div>'
}
function buildPageLayout(page){
 const id=String(page||'').toLowerCase();
 if(!['home','profile','planning','settings','notification-settings','report-problem','notifications','scanner','articles','accounts','admin-portal','fl-assistant','bakery','rewards','chat'].includes(id))return null;
 if(id==='accounts'&&document.documentElement.classList.contains('embeddedAccounts'))return{platform:'mobile',handlesBack:true,header:'',lead:''};
 const lead=id==='profile'
  ?'<div class="profileMobileTop" data-nethor-page-lead="mobile"><button class="profileMobileBack" type="button" onclick="window.NettoProfileUI?.goBack?window.NettoProfileUI.goBack():window.NethorNavigation?.navigateBack?window.NethorNavigation.navigateBack():location.href=\'user-menu.html\'" aria-label="Retour">‹</button><div class="profileMobileTitle"><h1>Mon profil</h1><p>Identité, apparence et sécurité de ton compte.</p></div></div>'
  :'';
 const ownChrome=id==='report-problem'||id==='scanner'||id==='articles'||id==='accounts'||id==='admin-portal'||id==='fl-assistant'||id==='bakery'||id==='rewards'||id==='chat';
 return {
  platform:'mobile',
  handlesBack:['profile','settings','notification-settings','report-problem','scanner','articles','accounts','admin-portal','fl-assistant','bakery','rewards','chat'].includes(id),
  header:ownChrome?'':'<div class="nethorMobileUtilityHost" data-nethor-page-chrome="mobile" data-nethor-global-tools-host></div>',
  lead
 }
}
window.NethorMobileShell=Object.freeze({buildQuickBar,buildUserMenu,buildPageLayout});
})();
