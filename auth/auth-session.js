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
function authSimpleAsset(node,fallback=''){
 const value=String(node?.url||fallback||'').trim();
 return /(?:^|\/)app-icon-mobile-v73\.svg(?:\?|$)/i.test(value)?'assets/app-icon-mobile-v74.svg?v=74':value
}
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
   const icon=new URL(install,location.href).href,base=new URL('./',location.href).href,start=new URL(kind==='mobile'?'mobile.html?view=home':'home.html',location.href).href,appId=new URL('home.html',location.href).href;
   const data={name:'Nethor',short_name:'Nethor',description:'Nethor — planning, stock et outils pratiques pour l’équipe.',start_url:start,scope:base,display:'standalone',background_color:'#f7f8fa',theme_color:'#ff5a2a',orientation:'any',icons:[{src:icon,sizes:'any',type:authIconMime(icon),purpose:'any'}],id:appId};
   manifest.href='data:application/manifest+json;charset=utf-8,'+encodeURIComponent(JSON.stringify(data))
  }else manifest.href=manifest.dataset.nethorDefaultHref
 }
}
function authLoginSettings(ui,brand){
 const defaults={
  brand_text:String(brand?.name||'Nethor').trim()||'Nethor',
  email_placeholder:'Identifiant',
  password_placeholder:'Mot de passe',
  submit_text:'Se connecter',
  forgot_text:'Mot de passe oublié ?',
  footer_text:'Accès réservé aux utilisateurs autorisés',
  feature_management:'Gestion',
  feature_planning:'Planning',
  feature_stock:'Stock',
  feature_team:'Équipe',
  background_opacity:100,
  primary_logo_visible:true,
  secondary_logo_visible:true,
  secondary_display:authThemedAsset(ui?.login_wordmark,'')?'logo':'text'
 };
 const root=ui?.login_settings&&typeof ui.login_settings==='object'?ui.login_settings:{};
 const light=root.light&&typeof root.light==='object'?root.light:{};
 const raw=authTheme()==='dark'&&root.dark&&typeof root.dark==='object'?root.dark:light;
 const pick=(key)=>raw[key]!==undefined?raw[key]:(light[key]!==undefined?light[key]:defaults[key]);
 const bool=(key)=>pick(key)!==false;
 const displayRaw=String(pick('secondary_display')||'').toLowerCase();
 const n=Number(pick('background_opacity'));
 return{
  brand_text:String(pick('brand_text')??defaults.brand_text),
  email_placeholder:String(pick('email_placeholder')??defaults.email_placeholder),
  password_placeholder:String(pick('password_placeholder')??defaults.password_placeholder),
  submit_text:String(pick('submit_text')??defaults.submit_text),
  forgot_text:String(pick('forgot_text')??defaults.forgot_text),
  footer_text:String(pick('footer_text')??defaults.footer_text),
  feature_management:String(pick('feature_management')??defaults.feature_management),
  feature_planning:String(pick('feature_planning')??defaults.feature_planning),
  feature_stock:String(pick('feature_stock')??defaults.feature_stock),
  feature_team:String(pick('feature_team')??defaults.feature_team),
  background_opacity:Number.isFinite(n)?Math.max(0,Math.min(100,n)):100,
  primary_logo_visible:bool('primary_logo_visible'),
  secondary_logo_visible:bool('secondary_logo_visible'),
  secondary_display:displayRaw==='logo'?'logo':'text'
 }
}
function authApplyLoginIcon(el,url){
 if(!el)return;
 if(url){
  el.classList.add('hasCustomLoginIcon');
  el.style.setProperty('--auth-custom-login-icon','url('+JSON.stringify(url)+')')
 }else{
  el.classList.remove('hasCustomLoginIcon');
  el.style.removeProperty('--auth-custom-login-icon')
 }
}
function authSetLoginSubmitText(button,text){
 if(!button)return;
 const node=[...button.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
 if(node)node.nodeValue=String(text||'')+' ';
 else button.insertBefore(document.createTextNode(String(text||'')+' '),button.firstChild)
}
function applyAuthBranding(){
 const kind=authPlatformKind(),ui=authPlatformUi(),brand=authSiteConfig?.brand||{},theme=authTheme();
 const fallback=kind==='mobile'?'assets/app-icon-mobile-v71.svg?v=72':'assets/app-icon-v63.svg';
 const logo=authThemedAsset(ui?.login_logo,fallback);
 document.querySelectorAll('.authMobileLogo,.authDesktopLogo').forEach(img=>{if(img&&img.getAttribute('src')!==logo)img.src=logo});

 const name=String(brand.name||'Nethor').trim()||'Nethor',sub=String(brand.subtitle||'Portail opérationnel interne').trim()||'Portail opérationnel interne';
 const settings=authLoginSettings(ui,brand),root=document.querySelector(kind==='desktop'?'.authDesktopRoot':'.authMobileRoot');
 document.querySelectorAll('.authMobileBrandCopy strong,.authDesktopName').forEach(el=>el.textContent=name);
 document.querySelectorAll('.authMobileBrandCopy span,.authDesktopSub').forEach(el=>el.textContent=sub);

 if(root){
  const bg=authThemedAsset(ui?.login_background,'assets/fl-background.svg');
  root.style.setProperty('--auth-login-background','url('+JSON.stringify(bg)+')');
  root.style.setProperty('--auth-login-background-opacity',String(settings.background_opacity/100));

  const textEl=root.querySelector('.authMobileBrandCopy strong,.authDesktopName');
  const wordmarkUrl=authThemedAsset(ui?.login_wordmark,'');
  let wordmark=root.querySelector('.authLoginWordmark');
  if(!wordmark){
   wordmark=document.createElement('img');wordmark.className='authLoginWordmark';wordmark.alt='';
   textEl?.parentNode?.insertBefore(wordmark,textEl||null)
  }
  let secondaryRendered=false;
  if(settings.secondary_display==='logo'){
   if(wordmarkUrl&&settings.secondary_logo_visible){
    if(wordmark.getAttribute('src')!==wordmarkUrl)wordmark.src=wordmarkUrl;
    wordmark.hidden=false;wordmark.classList.remove('authLoginInvisible');secondaryRendered=true
   }else{
    wordmark.hidden=true;wordmark.classList.remove('authLoginInvisible')
   }
   if(textEl){textEl.hidden=true;textEl.classList.remove('authLoginInvisible')}
  }else{
   wordmark.hidden=true;wordmark.classList.remove('authLoginInvisible');
   if(textEl){
    textEl.hidden=false;textEl.textContent=settings.brand_text;
    textEl.classList.toggle('authLoginInvisible',!settings.secondary_logo_visible);
    secondaryRendered=settings.secondary_logo_visible&&!!String(settings.brand_text||'').trim()
   }
  }
  const primaryRendered=!!settings.primary_logo_visible;
  const brandSection=root.querySelector('.authMobileBrand,.authDesktopBrand');
  brandSection?.classList.toggle('authBrandEmpty',!primaryRendered&&!secondaryRendered);

  const email=root.querySelector('#email'),password=root.querySelector('#password');
  if(email)email.placeholder=settings.email_placeholder;
  if(password)password.placeholder=settings.password_placeholder;
  authSetLoginSubmitText(root.querySelector('.loginSubmit'),settings.submit_text);
  const forgot=root.querySelector('.forgotBtn');if(forgot)forgot.textContent=settings.forgot_text;
  const foot=root.querySelector('.loginFoot');if(foot)foot.textContent=settings.footer_text;

  const labels=[settings.feature_management,settings.feature_planning,settings.feature_stock,settings.feature_team];
  root.querySelectorAll('.authFeature small').forEach((el,i)=>{if(labels[i]!==undefined)el.textContent=labels[i]});

  const fields=root.querySelectorAll('.authFieldIcon');
  authApplyLoginIcon(fields[0],authThemedAsset(ui?.login_icon_user,''));
  authApplyLoginIcon(fields[1],authThemedAsset(ui?.login_icon_password,''));
  const featureIcons=root.querySelectorAll('.authFeature>span');
  ['management','planning','stock','team'].forEach((key,i)=>authApplyLoginIcon(featureIcons[i],authThemedAsset(ui?.['login_icon_'+key],'')))
 }
 applyAuthHeadIcons()
}
async function loadAuthBrandingConfig(force=false){
 if(!force&&authSiteConfig&&Object.keys(authSiteConfig).length){applyAuthBranding();window.NettoSounds?.configure?.(authSiteConfig);return authSiteConfig}
 try{
  if(force){
   const {data,error}=await db.from('app_settings').select('value').eq('key','site_config').maybeSingle();
   if(error)throw error;
   authSiteConfig=data?.value&&typeof data.value==='object'?data.value:{}
  }else{
   const {data,error}=await db.rpc('get_public_login_config');
   if(error)throw error;
   authSiteConfig=data&&typeof data==='object'?data:{}
  }
 }catch(e){
  console.warn('Identité de connexion Nethor:',e);
  if(force){
   try{
    const {data,error}=await db.rpc('get_public_login_config');
    if(error)throw error;
    authSiteConfig=data&&typeof data==='object'?data:{}
   }catch(e2){console.warn('Identité publique de connexion Nethor:',e2);authSiteConfig=authSiteConfig||{}}
  }else authSiteConfig=authSiteConfig||{}
 }
 applyAuthBranding();window.NettoSounds?.configure?.(authSiteConfig);return authSiteConfig
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
 return 'welcome-animation-host.html?v=5&'+q.toString()
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
function authIsRevokedSessionError(error){
 const code=String(error?.code||'').toUpperCase(),message=String(error?.message||'');
 return code==='NETHOR_SESSION_REVOKED'||/session inactive ou révoquée/i.test(message)||(/401/.test(String(error?.status||''))&&/session/i.test(message))
}
async function loadSessionProfile(uid,fields='display_name,role,ui_preferences,account_enabled'){
 let lastError=null;
 for(let attempt=0;attempt<3;attempt++){
  const {data,error}=await db.from('profiles').select(fields).eq('id',uid).maybeSingle();
  if(!error)return{data,error:null};
  lastError=error;
  if(authIsRevokedSessionError(error))break;
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
 if(error){
  console.warn('Profil:',error);
  if(authIsRevokedSessionError(error)){
   try{await db.auth.signOut({scope:'local'})}catch(_){}
   profile=null;window.currentRole='';
   return showLogin('Ta session a expiré ou a été révoquée. Reconnecte-toi pour continuer.')
  }
  return showLogin('Connexion momentanément indisponible. Recharge la page : ta session est conservée.')
 }
 if(!data||data.account_enabled===false){await db.auth.signOut({scope:'local'});return showLogin(data?.account_enabled===false?'Ce compte a été désactivé par un administrateur.':'Compte non autorisé.')}
 profile=data;await syncProfileTheme(profile,session.user.id);window.currentRole=profile.role;const bootMaintenanceTarget=await maintenanceTargetForRole(profile.role,'');if(bootMaintenanceTarget==='maintenance.html'){location.replace('maintenance.html');return}await window.NettoProfileUI?.refresh?.();const stockPermission=window.NettoProfileUI?.permissionLevel?.('stock',profile)||'none';if(stockPermission==='none'){location.replace('home.html');return}canOperateFL=stockPermission==='operate'||stockPermission==='manage';canManageFL=stockPermission==='manage';window.canOperateFL=canOperateFL;window.canManageFL=canManageFL;const returnTo=safeReturnPath();if(returnTo&&profile.role==='admin'){location.replace(returnTo);return}$('login').classList.add('hidden');$('site').classList.remove('hidden');$('who').textContent=(profile.display_name||'Utilisateur')+' • '+(window.NettoProfileUI?.roleLabel?.(profile.role)||profile.role);
 const manager=canManageFL,isAdmin=profile.role==='admin';document.querySelectorAll('.adminOnlyMenu').forEach(x=>x.classList.toggle('hidden',!isAdmin));document.querySelectorAll('.stockModeBtn[data-mode="order"]').forEach(x=>x.classList.toggle('hidden',!canOperateFL));document.querySelectorAll('.stockModeBtn[data-mode="manage"]').forEach(x=>x.classList.toggle('hidden',!canManageFL));$('suggestBtn')?.classList.toggle('hidden',!canOperateFL);$('cartBtn')?.classList.toggle('hidden',!canOperateFL);$('manageBtn')?.classList.toggle('hidden',!canManageFL);
 const qs=new URLSearchParams(location.search),requested=qs.get('mode')||localStorage.getItem('nettoStockMode')||'stock';stockMode=(['stock','consult'].includes(requested)||(requested==='order'&&canOperateFL)||(requested==='manage'&&canManageFL))?requested:'stock';
 updateCartBadge();const hadStockCache=hydrateStockCache();if(hadStockCache){render();applyStockModeUI()}await loadSharedSiteConfig();if(hadStockCache)await Promise.all([loadOptions(),loadProducts()]);else{await loadOptions();await loadProducts()}applyStockModeUI();
 const ean=qs.get('ean');if(ean)setTimeout(()=>openInfoByEan(ean),120);if(manager&&qs.get('admin')==='accounts'){location.replace('admin-portal.html?tab=accounts');return}
}
function playLoginSound(){window.NettoSounds?.play?.('loginSuccess')}
function playLogoutSound(){window.NettoSounds?.play?.('logout')}
function showWelcome(){return new Promise(resolve=>{const t=$('welcomeToast'),name=profile?.display_name||profile?.email?.split('@')[0]||'utilisateur';applyWelcomeBranding();window.NettoSounds?.play?.('welcome');$('welcomeText').textContent='Bienvenue '+name+' 👋';requestAnimationFrame(()=>t.classList.add('show'));setTimeout(()=>{t.classList.remove('show');setTimeout(resolve,450)},1900)})}

function loginDenied(msg='Email ou mot de passe incorrect.'){const card=document.querySelector('.loginCard'),err=$('loginError');err.textContent=msg;err.classList.remove('loginErrorPulse');card?.classList.remove('loginDenied');void card?.offsetWidth;void err.offsetWidth;card?.classList.add('loginDenied');err.classList.add('loginErrorPulse');window.NettoSounds?.play?.('error');setTimeout(()=>card?.classList.remove('loginDenied'),520)}
function safeReturnPath(){const raw=new URLSearchParams(location.search).get('return')||'';if(!raw||raw.includes('://')||raw.startsWith('//'))return'';return /^accounts\.html(?:\?|$)/.test(raw)?raw:''}
function showLogin(msg=''){applyAuthBranding();$('profileLoader')?.classList.remove('show');$('site').classList.add('hidden');$('login').classList.remove('hidden');$('loginError').textContent='';if(msg)setTimeout(()=>loginDenied(msg),30)}
function togglePassword(){const p=$('password');p.type=p.type==='password'?'text':'password';window.NettoSounds?.play?.('switch')}
