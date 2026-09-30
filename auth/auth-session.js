/* Nethor Auth — session, profil et boot, Phase 4.20 */
let profileLoaderShownAt=0;
function showProfileLoader(message='Application de tes préférences…'){const el=$('profileLoader'),txt=$('profileLoaderText');if(!el)return;if(txt)txt.textContent=message;profileLoaderShownAt=performance.now();el.classList.add('show')}
async function hideProfileLoader(minMs=320){const el=$('profileLoader');if(!el)return;const elapsed=performance.now()-profileLoaderShownAt;if(elapsed<minMs)await new Promise(r=>setTimeout(r,minMs-elapsed));el.classList.remove('show');await new Promise(r=>setTimeout(r,245))}
function profilePrefs(p){return p?.ui_preferences&&typeof p.ui_preferences==='object'&&!Array.isArray(p.ui_preferences)?p.ui_preferences:{}}
function profileThemeKey(uid){return uid?'nettoProfileTheme:'+uid:null}
function cachedProfileTheme(uid){try{const k=profileThemeKey(uid),v=k?localStorage.getItem(k):null;return v==='dark'||v==='light'?v:null}catch(_){return null}}
function rememberProfileTheme(uid,theme){if(theme!=='dark'&&theme!=='light')return;try{const k=profileThemeKey(uid);if(k)localStorage.setItem(k,theme)}catch(_){}}
function applyCachedProfileTheme(uid){const t=cachedProfileTheme(uid);if(t)applyTheme(t);return t}
async function syncProfileTheme(p,uid){
 const prefs=profilePrefs(p),stored=prefs.theme==='dark'||prefs.theme==='light'?prefs.theme:null,theme=stored||cachedProfileTheme(uid)||currentTheme();
 applyTheme(theme);rememberProfileTheme(uid,theme);p.ui_preferences={...prefs,theme};
 if(!stored&&uid){const {error}=await db.from('profiles').update({ui_preferences:p.ui_preferences}).eq('id',uid);if(error)console.warn('Initialisation thème profil:',error)}
 return theme
}
async function loadSessionProfile(uid,fields='display_name,role,ui_preferences'){
 let lastError=null;
 for(let attempt=0;attempt<3;attempt++){
  const {data,error}=await db.from('profiles').select(fields).eq('id',uid).maybeSingle();
  if(!error)return{data,error:null};
  lastError=error;
  if(attempt<2)await new Promise(r=>setTimeout(r,220*(attempt+1)));
 }
 return{data:null,error:lastError}
}
async function boot(){
 const forceLogin=new URLSearchParams(location.search).get('logout')==='1'||sessionStorage.getItem('nettoForceLogin')==='1';
 if(forceLogin){
  try{sessionStorage.removeItem('nettoForceLogin')}catch(_){}
  try{await db.auth.signOut({scope:'local'})}catch(e){console.warn('Déconnexion forcée:',e)}
  try{history.replaceState(null,'','index.html')}catch(_){}
  profile=null;window.currentRole='';return showLogin()
 }
 const {data:{session},error:sessionError}=await db.auth.getSession();if(sessionError){console.warn('Session:',sessionError);return showLogin('Impossible de vérifier la session. Réessaie dans un instant.')}if(!session)return showLogin();
 applyCachedProfileTheme(session.user.id);
 const {data,error}=await loadSessionProfile(session.user.id);
 if(error){console.warn('Profil:',error);return showLogin('Connexion momentanément indisponible. Recharge la page : ta session est conservée.')}
 if(!data){await db.auth.signOut({scope:'local'});return showLogin('Compte non autorisé.')}
 profile=data;await syncProfileTheme(profile,session.user.id);window.currentRole=profile.role;const bootMaintenanceTarget=await maintenanceTargetForRole(profile.role,'');if(bootMaintenanceTarget==='maintenance.html'){location.replace('maintenance.html');return}await window.NettoProfileUI?.refresh?.();const stockPermission=window.NettoProfileUI?.permissionLevel?.('stock',profile)||'none';if(stockPermission==='none'){location.replace('home.html');return}canOperateFL=stockPermission==='operate'||stockPermission==='manage';canManageFL=stockPermission==='manage';window.canOperateFL=canOperateFL;window.canManageFL=canManageFL;const returnTo=safeReturnPath();if(returnTo&&profile.role==='admin'){location.replace(returnTo);return}$('login').classList.add('hidden');$('site').classList.remove('hidden');$('who').textContent=(profile.display_name||'Utilisateur')+' • '+(window.NettoProfileUI?.roleLabel?.(profile.role)||profile.role);
 const manager=canManageFL,isAdmin=profile.role==='admin';document.querySelectorAll('.adminOnlyMenu').forEach(x=>x.classList.toggle('hidden',!isAdmin));document.querySelectorAll('.stockModeBtn[data-mode="order"]').forEach(x=>x.classList.toggle('hidden',!canOperateFL));document.querySelectorAll('.stockModeBtn[data-mode="manage"]').forEach(x=>x.classList.toggle('hidden',!canManageFL));$('suggestBtn')?.classList.toggle('hidden',!canOperateFL);$('cartBtn')?.classList.toggle('hidden',!canOperateFL);$('manageBtn')?.classList.toggle('hidden',!canManageFL);
 const qs=new URLSearchParams(location.search),requested=qs.get('mode')||localStorage.getItem('nettoStockMode')||'stock';stockMode=(['stock','consult'].includes(requested)||(requested==='order'&&canOperateFL)||(requested==='manage'&&canManageFL))?requested:'stock';
 updateCartBadge();const hadStockCache=hydrateStockCache();if(hadStockCache){render();applyStockModeUI()}await loadSharedSiteConfig();if(hadStockCache)await Promise.all([loadOptions(),loadProducts()]);else{await loadOptions();await loadProducts()}applyStockModeUI();
 const ean=qs.get('ean');if(ean)setTimeout(()=>openInfoByEan(ean),120);if(manager&&qs.get('admin')==='accounts'){location.replace('admin-portal.html?tab=accounts');return}
}
function playLoginSound(){window.NettoSounds?.play?.('loginSuccess')}
function playLogoutSound(){window.NettoSounds?.play?.('logout')}
function showWelcome(){return new Promise(resolve=>{const t=$('welcomeToast'),name=profile?.display_name||profile?.email?.split('@')[0]||'utilisateur';$('welcomeText').textContent='Bienvenue '+name+' 👋';requestAnimationFrame(()=>t.classList.add('show'));setTimeout(()=>{t.classList.remove('show');setTimeout(resolve,450)},1900)})}

function loginDenied(msg='Email ou mot de passe incorrect.'){const card=document.querySelector('.loginCard'),err=$('loginError');err.textContent=msg;err.classList.remove('loginErrorPulse');card?.classList.remove('loginDenied');void card?.offsetWidth;void err.offsetWidth;card?.classList.add('loginDenied');err.classList.add('loginErrorPulse');window.NettoSounds?.play?.('error');setTimeout(()=>card?.classList.remove('loginDenied'),520)}
function safeReturnPath(){const raw=new URLSearchParams(location.search).get('return')||'';if(!raw||raw.includes('://')||raw.startsWith('//'))return'';return /^accounts\.html(?:\?|$)/.test(raw)?raw:''}
function showLogin(msg=''){$('profileLoader')?.classList.remove('show');$('site').classList.add('hidden');$('login').classList.remove('hidden');$('loginError').textContent='';if(msg)setTimeout(()=>loginDenied(msg),30)}
function togglePassword(){const p=$('password');p.type=p.type==='password'?'text':'password';window.NettoSounds?.play?.('switch')}
