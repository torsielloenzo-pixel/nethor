/* Nethor Auth — session, profil et boot, Phase 4.20 */
let profileLoaderShownAt=0,authSiteConfig={};

function authPlatformKind(){
 try{return (window.NethorPlatform?.current?.()||document.documentElement.dataset.nethorPlatform)==='desktop'?'desktop':'mobile'}catch(_){return'mobile'}
}
function authPlatformUi(){
 const kind=authPlatformKind(),root=authSiteConfig?.platform_ui?.[kind];
 return root&&typeof root==='object'?root:{}
}
function authTheme(){return document.documentElement.dataset.theme==='dark'?'dark':'light'}
function authThemedAssetNode(node){
 if(!node||typeof node!=='object')return{};
 const theme=authTheme(),variant=node?.[theme],light=node?.light;
 if(variant&&typeof variant==='object'&&String(variant.url||'').trim())return variant;
 if(theme==='dark'&&light&&typeof light==='object'&&String(light.url||'').trim())return light;
 if(String(node.url||'').trim())return node;
 return{}
}
function authThemedAsset(node,fallback=''){
 const asset=authThemedAssetNode(node);
 return String(asset?.url||fallback||'').trim()
}
function authSimpleAsset(node,fallback=''){return String(node?.url||fallback||'').trim()}
function authIconMime(url){const x=String(url||'').split('?')[0].toLowerCase();return x.endsWith('.png')?'image/png':x.endsWith('.webp')?'image/webp':x.endsWith('.ico')?'image/x-icon':'image/svg+xml'}
function applyAuthHeadIcons(){
 const mobile=authSiteConfig?.platform_ui?.mobile||{},desktop=authSiteConfig?.platform_ui?.desktop||{},kind=authPlatformKind();
 const favicon=authThemedAsset(desktop.browser_icon,'');
 if(kind==='desktop'&&favicon){
  let link=document.getElementById('nethorAuthFavicon');if(!link){link=document.createElement('link');link.id='nethorAuthFavicon';link.rel='icon';document.head?.appendChild(link)}link.href=favicon;link.type=authIconMime(favicon)
 }
 const apple=authSimpleAsset(mobile.home_screen_icon,'');
 if(apple){let link=document.getElementById('nethorAuthAppleTouch');if(!link){link=document.createElement('link');link.id='nethorAuthAppleTouch';link.rel='apple-touch-icon';document.head?.appendChild(link)}link.href=apple}
 const install=kind==='mobile'?apple:authSimpleAsset(desktop.desktop_shortcut_icon,'');
 const manifest=document.querySelector('link[rel="manifest"]');
 if(manifest){
  if(!manifest.dataset.nethorDefaultHref)manifest.dataset.nethorDefaultHref=manifest.getAttribute('href')||'manifest.webmanifest';
  if(install){
   const icon=new URL(install,location.href).href,base=new URL('./',location.href).href,start=new URL('home.html',location.href).href;
   const data={name:'Nethor',short_name:'Nethor',description:'Nethor — planning, stock et outils pratiques pour l’équipe.',start_url:start,scope:base,display:'standalone',background_color:'#f7f8fa',theme_color:'#ff5a2a',orientation:'any',icons:[{src:icon,sizes:'any',type:authIconMime(icon),purpose:'any'}],id:start};
   manifest.href='data:application/manifest+json;charset=utf-8,'+encodeURIComponent(JSON.stringify(data))
  }else manifest.href=manifest.dataset.nethorDefaultHref
 }
}
function applyAuthBranding(){
 const kind=authPlatformKind(),ui=authPlatformUi(),brand=authSiteConfig?.brand||{};
 const fallback=kind==='mobile'?'assets/app-icon-mobile-v71.svg?v=72':'assets/app-icon-v63.svg';
 const logo=authThemedAsset(ui?.login_logo,fallback);
 document.querySelectorAll('.authMobileLogo,.authDesktopLogo').forEach(img=>{if(img&&img.getAttribute('src')!==logo)img.src=logo});
 const name=String(brand.name||'Nethor').trim()||'Nethor',sub=String(brand.subtitle||'Portail opérationnel interne').trim()||'Portail opérationnel interne';
 document.querySelectorAll('.authMobileBrandCopy strong,.authDesktopName').forEach(el=>el.textContent=name);
 document.querySelectorAll('.authMobileBrandCopy span,.authDesktopSub').forEach(el=>el.textContent=sub);
 applyAuthHeadIcons()
}
async function loadAuthBrandingConfig(force=false){
 if(!force&&authSiteConfig&&Object.keys(authSiteConfig).length){applyAuthBranding();return authSiteConfig}
 try{
  const {data,error}=await db.from('app_settings').select('value').eq('key','site_config').maybeSingle();
  if(error)throw error;authSiteConfig=data?.value&&typeof data.value==='object'?data.value:{}
 }catch(e){console.warn('Identité de connexion Nethor:',e);authSiteConfig=authSiteConfig||{}}
 applyAuthBranding();return authSiteConfig
}
function ensureWelcomeMediaStyle(){
 if(document.getElementById('nethorWelcomeMediaStyle'))return;
 const s=document.createElement('style');s.id='nethorWelcomeMediaStyle';
 s.textContent='.welcomeMark.hasWelcomeMedia{width:min(42vw,150px)!important;height:min(42vw,150px)!important;padding:0!important;background:transparent!important;box-shadow:none!important;border-radius:0!important;overflow:visible!important}.welcomeMark.hasWelcomeMedia img,.welcomeMark.hasWelcomeMedia video,.welcomeMark.hasWelcomeMedia iframe{display:block;width:100%;height:100%;object-fit:contain;border:0;background:transparent}.welcomeMark.hasWelcomeMedia video,.welcomeMark.hasWelcomeMedia iframe{pointer-events:none}';
 document.head?.appendChild(s)
}
function authWelcomeAnimationHost(url,tag,name){
 const q=new URLSearchParams({src:String(url||''),theme:authTheme(),mode:'media',name:String(name||'Utilisateur')});
 if(tag)q.set('tag',String(tag));
 return 'welcome-animation-host.html?'+q.toString()
}
function applyWelcomeBranding(){
 const mark=document.querySelector('#welcomeToast .welcomeMark'),sub=document.querySelector('#welcomeToast .welcomeSub');if(!mark)return;
 const ui=authPlatformUi(),media=ui?.welcome_media||{},variant=authThemedAssetNode(media),url=String(variant?.url||'').trim();
 const brand=authSiteConfig?.brand||{};if(sub)sub.textContent=(String(brand.name||'Nethor').trim()||'Nethor')+' · '+(String(brand.subtitle||'Espace outils').trim()||'Espace outils');
 if(!url){mark.classList.remove('hasWelcomeMedia');mark.innerHTML='N';return}
 ensureWelcomeMediaStyle();mark.classList.add('hasWelcomeMedia');
 if(media.type==='animation'&&/\.js(?:$|\?)/i.test(url)){
  const userName=profile?.display_name||profile?.email?.split('@')[0]||'Utilisateur',host=authWelcomeAnimationHost(url,variant?.tag||'',userName);
  mark.innerHTML='<iframe src="'+String(host).replace(/&/g,'&amp;').replace(/"/g,'&quot;')+'" title="Animation Nethor" sandbox="allow-scripts" tabindex="-1"></iframe>'
 }else if(media.type==='animation'&&/\.(mp4|webm)(?:$|\?)/i.test(url)){
  mark.innerHTML='<video src="'+String(url).replace(/"/g,'&quot;')+'" autoplay muted loop playsinline preload="auto"></video>'
 }else mark.innerHTML='<img src="'+String(url).replace(/"/g,'&quot;')+'" alt="" draggable="false">'
}

let authBrandThemeObserver=null;
function ensureAuthBrandThemeObserver(){
 if(authBrandThemeObserver||typeof MutationObserver==='undefined')return;
 authBrandThemeObserver=new MutationObserver(list=>{if(list.some(x=>x.attributeName==='data-theme'))applyAuthBranding()});
 authBrandThemeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']})
}

function showProfileLoader(message='Application de tes préférences…'){const el=$('profileLoader'),txt=$('profileLoaderText');if(!el)return;if(txt)txt.textContent=message;profileLoaderShownAt=performance.now();el.classList.add('show')}
async function hideProfileLoader(minMs=320){const el=$('profileLoader');if(!el)return;const elapsed=performance.now()-profileLoaderShownAt;if(elapsed<minMs)await new Promise(r=>setTimeout(r,minMs-elapsed));el.classList.remove('show');await new Promise(r=>setTimeout(r,245))}
function profilePrefs(p){return p?.ui_preferences&&typeof p.ui_preferences==='object'&&!Array.isArray(p.ui_preferences)?p.ui_preferences:{}}
function profileThemeKey(uid){return uid?'nettoProfileTheme:'+uid:null}
function cachedProfileTheme(uid){try{const k=profileThemeKey(uid),v=k?localStorage.getItem(k):null;return v==='dark'||v==='light'?v:null}catch(_){return null}}
function rememberProfileTheme(uid,theme){if(theme!=='dark'&&theme!=='light')return;try{const k=profileThemeKey(uid);if(k)localStorage.setItem(k,theme)}catch(_){}}
function applyCachedProfileTheme(uid){const t=cachedProfileTheme(uid);if(t)applyTheme(t);return t}
async function syncProfileTheme(p,uid){
 const prefs=profilePrefs(p),stored=prefs.theme==='dark'||prefs.theme==='light'?prefs.theme:null,theme=stored||cachedProfileTheme(uid)||currentTheme();
 applyTheme(theme);rememberProfileTheme(uid,theme);p.ui_preferences={...prefs,theme};applyAuthBranding();
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
 await loadAuthBrandingConfig();ensureAuthBrandThemeObserver();
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
function showWelcome(){return new Promise(resolve=>{const t=$('welcomeToast'),name=profile?.display_name||profile?.email?.split('@')[0]||'utilisateur';applyWelcomeBranding();$('welcomeText').textContent='Bienvenue '+name+' 👋';requestAnimationFrame(()=>t.classList.add('show'));setTimeout(()=>{t.classList.remove('show');setTimeout(resolve,450)},1900)})}

function loginDenied(msg='Email ou mot de passe incorrect.'){const card=document.querySelector('.loginCard'),err=$('loginError');err.textContent=msg;err.classList.remove('loginErrorPulse');card?.classList.remove('loginDenied');void card?.offsetWidth;void err.offsetWidth;card?.classList.add('loginDenied');err.classList.add('loginErrorPulse');window.NettoSounds?.play?.('error');setTimeout(()=>card?.classList.remove('loginDenied'),520)}
function safeReturnPath(){const raw=new URLSearchParams(location.search).get('return')||'';if(!raw||raw.includes('://')||raw.startsWith('//'))return'';return /^accounts\.html(?:\?|$)/.test(raw)?raw:''}
function showLogin(msg=''){applyAuthBranding();$('profileLoader')?.classList.remove('show');$('site').classList.add('hidden');$('login').classList.remove('hidden');$('loginError').textContent='';if(msg)setTimeout(()=>loginDenied(msg),30)}
function togglePassword(){const p=$('password');p.type=p.type==='password'?'text':'password';window.NettoSounds?.play?.('switch')}
