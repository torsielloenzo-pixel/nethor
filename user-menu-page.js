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
function syncThemeText(){
 const dark=document.documentElement.dataset.theme==='dark';
 document.querySelectorAll('.nettoThemeLabel').forEach(el=>el.textContent=dark?'Mode clair':'Mode sombre')
}
function navigate(raw){
 if(window.NethorNavigation?.navigate)return window.NethorNavigation.navigate(raw);
 location.href=raw
}
async function logout(){
 const api=window.NettoProfileUI,button=document.getElementById('nettoMobileLogoutBtn');
 if(button)button.disabled=true;
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
  const api=window.NettoProfileUI,next=document.documentElement.dataset.theme==='dark'?'light':'dark';
  try{window.NettoSounds?.play?.('switch')}catch(_){}
  if(api?.setThemePreference)await api.setThemePreference(next);
  else{document.documentElement.dataset.theme=next;try{localStorage.setItem('nettoTheme',next)}catch(_){}}
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
 const visible=api.visibleModules?.('user_menu',p,api.siteConfig)||[];
 const mobileModules=visible.filter(m=>!['profile','settings'].includes(m.id));
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
