(function(){
'use strict';

const host=document.getElementById('mobileUserMenuPageHost');

function isMobile(){
 try{
  const kind=String(window.NethorPlatform?.current?.()||document.documentElement.dataset.nethorPlatform||'');
  return kind==='mobile'||kind==='mobile-preview'
 }catch(_){return false}
}
function sourceUrl(raw){
 try{
  const u=new URL(raw||'report-problem.html',location.href);
  u.searchParams.set('from','user-menu.html');
  return (u.pathname.split('/').pop()||'report-problem.html')+u.search
 }catch(_){return'report-problem.html?from=user-menu.html'}
}
function mobileMenuItemSetting(api,profile,id,fallback=true){
 if(profile?.role==='admin')return fallback;
 const items=api?.siteConfig?.mobile_user_menu?.items;
 const value=items&&typeof items==='object'?items[id]:undefined;
 return typeof value==='boolean'?value:fallback
}
function mobileUserMenuModules(api,profile){
 const cfg=api?.siteConfig||{};
 if(profile?.role==='admin')return (api.visibleModules?.('user_menu',profile,cfg)||[]).filter(m=>!['profile','settings'].includes(m.id));
 const items=cfg?.mobile_user_menu?.items&&typeof cfg.mobile_user_menu.items==='object'?cfg.mobile_user_menu.items:{};
 return (api?.modules||[]).filter(m=>{
  if(!m||['profile','settings'].includes(m.id)||m.navigation===false)return false;
  if(m.platform==='desktop'||m.platform==='system')return false;
  if(api?.canAccess&&!api.canAccess(m,profile,cfg))return false;
  const explicit=items[m.id],globalAllowed=typeof explicit==='boolean'?explicit:m.userMenu===true;
  if(!globalAllowed)return false;
  const personal=profile?.ui_preferences?.user_menu?.[m.id];
  if(typeof personal==='boolean')return personal;
  return explicit===true?true:m.defaultUser!==false
 })
}
function halloweenAllowed(profile){
 const role=String(profile?.role||'').trim().toLowerCase();
 const firstName=String(profile?.display_name||'').trim().toLowerCase().split(/\s+/)[0]||'';
 return role==='admin'||firstName==='enzo'
}
function favoriteTheme(profile){
 const value=String(profile?.ui_preferences?.mobile_theme||'').trim().toLowerCase();
 return ['mineral','sage','plum'].includes(value)?value:''
}
function mobileMode(profile){
 const prefs=profile?.ui_preferences||{};
 if(prefs.mobile_theme==='halloween'&&halloweenAllowed(profile))return'halloween';
 return prefs.mobile_mode==='halloween'&&halloweenAllowed(profile)?'halloween':'favorite'
}
function favoriteThemeLabel(profile){
 return({mineral:'Bleu minéral',sage:'Sauge',plum:'Prune nocturne'})[favoriteTheme(profile)]||'Mode clair'
}
function applyMobileMode(profile,mode){
 const favorite=favoriteTheme(profile),custom=mode==='halloween'&&halloweenAllowed(profile)?'halloween':favorite;
 const theme=['plum','halloween'].includes(custom)?'dark':'light',root=document.documentElement;
 if(custom)root.dataset.nethorMobileTheme=custom;else delete root.dataset.nethorMobileTheme;
 root.dataset.theme=theme;root.style.colorScheme=theme;
 try{localStorage.setItem('nethorMobileTheme',custom);localStorage.setItem('nettoTheme',theme)}catch(_){}
}
function syncThemeText(){
 const profile=window.NettoProfileUI?.profile,mode=mobileMode(profile);
 document.querySelectorAll('.nettoThemeLabel').forEach(el=>el.textContent=mode==='halloween'?'Mode favori':'Mode Halloween');
 document.querySelectorAll('#nettoMobileThemeBtn .nettoMobileMenuCopy small').forEach(el=>el.textContent=mode==='halloween'?'Revenir à '+favoriteThemeLabel(profile):'Activer le thème Halloween');
 document.querySelectorAll('#nettoMobileThemeBtn .nettoThemeIconSvg').forEach(el=>{el.textContent=mode==='halloween'?'★':'🎃';el.style.fontSize='18px'})
}
async function setMobileMode(mode){
 const api=window.NettoProfileUI,profile=api?.profile;if(!api||!profile)return'favorite';
 mode=mode==='halloween'&&halloweenAllowed(profile)?'halloween':'favorite';
 const current=profile.ui_preferences&&typeof profile.ui_preferences==='object'?JSON.parse(JSON.stringify(profile.ui_preferences)):{};
 const prefs={...current,mobile_theme:favoriteTheme(profile),mobile_mode:mode};
 profile.ui_preferences=prefs;applyMobileMode(profile,mode);
 try{
  if(api.client&&api.session?.user?.id){
   const {error}=await api.client.from('profiles').update({ui_preferences:prefs}).eq('id',api.session.user.id);
   if(error)throw error
  }
  window.dispatchEvent(new CustomEvent('netto:profile',{detail:{profile}}))
 }catch(error){console.warn('[Nethor UserMenu] mobile mode',error)}
 return mode
}
function navigate(raw){
 if(window.NethorNavigation?.navigate)return window.NethorNavigation.navigate(raw);
 location.href=raw
}
async function logout(){
 const api=window.NettoProfileUI,button=document.getElementById('nettoMobileLogoutBtn');
 if(button)button.disabled=true;
 if(api?.logout){await api.logout();return}
 try{window.NettoSounds?.play?.('logout')}catch(_){}
 try{await api?.client?.auth?.signOut?.({scope:'local'})}catch(_){}
 location.replace('index.html')
}
function bindMenu(){
 host.querySelectorAll('.nettoMobileMenuLink[data-url]').forEach(button=>{
  button.onclick=e=>{
   e.preventDefault();
   e.stopPropagation();
   const target=button.dataset.url;
   if(!target)return;
   try{window.NettoSounds?.play?.('navigate')}catch(_){}
   navigate(target)
  }
 });
 const theme=document.getElementById('nettoMobileThemeBtn');
 if(theme)theme.onclick=async e=>{
  e.preventDefault();e.stopPropagation();
  const profile=window.NettoProfileUI?.profile,current=mobileMode(profile),next=current==='halloween'?'favorite':'halloween';
  try{window.NettoSounds?.play?.('switch')}catch(_){}
  await setMobileMode(next);
  syncThemeText()
 };
 const update=document.getElementById('nettoMobileUpdateBtn');
 if(update)update.onclick=async e=>{
  e.preventDefault();e.stopPropagation();
  update.disabled=true;
  try{await window.NettoProfileUI?.checkForUpdates?.()}finally{update.disabled=false}
 };
 const logoutButton=document.getElementById('nettoMobileLogoutBtn');
 if(logoutButton)logoutButton.onclick=e=>{e.preventDefault();e.stopPropagation();void logout()}
}
function render(){
 if(!isMobile()){location.replace('home.html');return false}
 const api=window.NettoProfileUI,p=api?.profile;
 if(!host||!api||!p)return false;
 const mobileModules=mobileUserMenuModules(api,p);
 const primaryIds=new Set(['home','stock','planning','chat','scanner','articles']);
 const adminIds=new Set(['accounts','portal_admin']);
 const specialIds=new Set(['notification_settings','problem_report']);
 const primary=mobileModules.filter(m=>primaryIds.has(m.id));
 const admin=mobileModules.filter(m=>adminIds.has(m.id));
 const extra=mobileModules.filter(m=>!primaryIds.has(m.id)&&!adminIds.has(m.id)&&!specialIds.has(m.id));
 const notificationSettings=mobileModules.find(m=>m.id==='notification_settings')||null;
 const problemReport=mobileModules.find(m=>m.id==='problem_report')||null;
 const settingsModule=api.modules?.find(m=>m.id==='settings')||{label:'Personnalisation',subtitle:'Accueil, raccourcis et apparence',url:'settings.html'};
 const role=api.roleLabel?.(p.role)||p.role||'Compte';
 const problemUrl=problemReport?sourceUrl(problemReport.url):'';
 const html=window.NethorMobileShell?.buildUserMenu?.({
  name:p.display_name||'Utilisateur',
  role,
  settingsModule,
  primary,
  admin,
  extra,
  notificationSettings,
  problemReport,
  problemUrl,
  profileVisible:mobileMenuItemSetting(api,p,'profile',true)&&(p.role==='admin'||p?.ui_preferences?.user_menu?.profile!==false),
  settingsVisible:mobileMenuItemSetting(api,p,'settings',true),
  themeVisible:mobileMenuItemSetting(api,p,'theme',true)&&halloweenAllowed(p),
  updateVisible:mobileMenuItemSetting(api,p,'update',true),
  iconFor:api.mobileNavIcon
 });
 if(!html)return false;
 host.innerHTML=html;
 api.paintAvatar?.(document.getElementById('nettoMobileMenuAvatar'),api.avatarUrl,p.display_name,p.profile_color,p.avatar_frame);
 bindMenu();
 syncThemeText();
 api.renderMobileQuickBar?.();
 return true
}
function boot(){
 if(render())return;
 window.addEventListener('netto:profile',render);
 let tries=0;
 const timer=setInterval(()=>{tries++;if(render()||tries>40)clearInterval(timer)},100)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
