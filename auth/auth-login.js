/* Nethor Auth — maintenance, connexion et déconnexion, Phase 4.20 */
async function maintenanceTargetForRole(role,normalTarget){
 if(role==='admin')return normalTarget;
 try{
  const {data,error}=await db.from('app_settings').select('value').eq('key','site_config').maybeSingle();
  if(error)throw error;
  if(data?.value?.maintenance?.enabled===true)return 'maintenance.html'
 }catch(e){console.warn('Vérification maintenance:',e)}
 return normalTarget
}

// Handoff à usage unique vers mobile.html : l'animation de connexion vient
// d'être jouée, ne pas enchaîner avec l'animation d'ouverture.
function markMobileLoginAnimationComplete(){
 try{
  if(typeof authPlatformKind==='function'&&authPlatformKind()==='mobile'){
   sessionStorage.removeItem('nethorMobileLaunchShownV1');
   sessionStorage.setItem('nethorMobileSkipOpeningOnceV1',String(Date.now()))
  }
 }catch(_){}
}

async function login(e){
 e.preventDefault();window.NettoSounds?.unlock?.();$('loginError').textContent='';
 try{sessionStorage.removeItem('nettoForceLogin')}catch(_){}
 const mobileLogin=typeof authPlatformKind==='function'&&authPlatformKind()==='mobile';
 const ident=$('email').value.trim().toLowerCase(),authEmail=ident.includes('@')?ident:ident.replace(/[^a-z0-9._-]/g,'')+'@stock-fl.local';
 const {data:authData,error}=await db.auth.signInWithPassword({email:authEmail,password:$('password').value});
 if(error)return loginDenied('Email ou mot de passe incorrect.');
 const uid=authData?.user?.id;if(!uid){await db.auth.signOut({scope:'local'});return showLogin('Compte non autorisé.')}
 try{localStorage.removeItem('nettoGlobalUI:'+uid)}catch(_){}
 applyCachedProfileTheme(uid);
 // Sur mobile, pas de seconde animation « Préparation de ton espace »
 // entre l'authentification et l'animation de connexion.
 if(!mobileLogin)showProfileLoader('Chargement de ton profil et de tes accès…');
 const {data:p,error:pe}=await loadSessionProfile(uid,'display_name,email,role,ui_preferences,account_enabled');
 if(pe){if(!mobileLogin)await hideProfileLoader(180);return showLogin('Connexion momentanément indisponible. Ta session a bien été créée : recharge la page.')}
 if(!p||p.account_enabled===false){await db.auth.signOut({scope:'local'});if(!mobileLogin)await hideProfileLoader(180);return showLogin(p?.account_enabled===false?'Ce compte a été désactivé par un administrateur.':'Compte non autorisé.')}
 try{const {error:loginLogError}=await db.from('login_history').insert({user_id:uid,user_agent:String(navigator.userAgent||'').slice(0,500),source:'app'});if(loginLogError)console.warn('Historique connexion:',loginLogError)}catch(loginLogError){console.warn('Historique connexion:',loginLogError)}
 profile=p;const loaderTxt=$('profileLoaderText');if(!mobileLogin&&loaderTxt)loaderTxt.textContent='Application de ton thème…';await syncProfileTheme(profile,uid);await loadAuthBrandingConfig(true);playLoginSound();$('login').classList.add('hidden');$('site').classList.add('hidden');
 if(!mobileLogin)await hideProfileLoader(380);
 await showWelcome();
 /* Sur mobile, l'animation de connexion tient lieu de bienvenue pour cette session.
    Le splash de lancement de mobile.html ne doit donc pas être rejoué juste après. */
 markMobileLoginAnimationComplete();
 const returnTo=safeReturnPath(),normalTarget=returnTo&&p.role==='admin'?returnTo:'home.html',target=await maintenanceTargetForRole(p.role,normalTarget);
 const continueNow=await checkLatestVersionAtLogin(target);if(continueNow)location.href=target
}
async function logout(){playLogoutSound();await new Promise(r=>setTimeout(r,420));await db.auth.signOut({scope:'local'});showLogin()}
async function logoutFromBrand(){closeBrandMenu();playLogoutSound();await new Promise(r=>setTimeout(r,420));await db.auth.signOut({scope:'local'});location.href='index.html'}
