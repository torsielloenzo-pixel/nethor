(function(){
'use strict';

const SUPABASE_URL='https://gioxrpaiwogqqtakjpnv.supabase.co';
const SUPABASE_KEY='sb_publishable_nJPMS-Z_20ng1aMJmufbmg_gWFFndrC';
const LEVELS=Object.freeze({none:0,view:1,operate:2,manage:3});

let client=null;
let startPromise=null;
let authSubscription=null;
let channels=[];
let refreshTimer=null;
let notificationTimer=null;
let permissionTimer=null;
let preferenceTimer=null;
const listeners=new Set();

const state={
  status:'idle',
  ready:false,
  session:null,
  profile:null,
  siteConfig:{},
  subrolePermissions:{},
  subroleKeys:[],
  avatarUrl:null,
  notifications:[],
  notificationPreferences:[],
  unread:0,
  lastRefresh:0,
  error:null
};

function platform(){
  try{return String(window.NethorPlatform?.current?.()||document.documentElement.dataset.nethorPlatform||'desktop').toLowerCase()}
  catch(_){return'desktop'}
}
function isMobile(){
  const kind=platform();
  return kind==='mobile'||kind==='mobile-preview'
}
function loginUrl(){
  const u=new URL('index.html',location.href);
  const q=new URLSearchParams(location.search);
  if(platform()==='mobile-preview'||q.get('mobile_preview')==='1')u.searchParams.set('mobile_preview','1');
  if(q.get('nethor_platform')==='mobile')u.searchParams.set('nethor_platform','mobile');
  return (u.pathname.split('/').pop()||'index.html')+u.search+u.hash
}
function redirectToLogin(){
  if(location.pathname.toLowerCase().endsWith('/index.html'))return;
  location.replace(loginUrl())
}
function snapshot(){
  return {
    status:state.status,
    ready:state.ready,
    session:state.session,
    profile:state.profile,
    siteConfig:state.siteConfig,
    subrolePermissions:{...state.subrolePermissions},
    subroleKeys:[...state.subroleKeys],
    avatarUrl:state.avatarUrl,
    notifications:[...state.notifications],
    notificationPreferences:[...state.notificationPreferences],
    unread:state.unread,
    lastRefresh:state.lastRefresh,
    error:state.error
  }
}
function emit(type='change',extra={}){
  const detail={type,...snapshot(),...extra};
  listeners.forEach(fn=>{try{fn(detail)}catch(error){console.error('[Nethor MobileServices] subscriber',error)}});
  try{window.dispatchEvent(new CustomEvent('nethor:mobile-services',{detail}))}catch(_){}
  if(type==='ready'){
    try{window.dispatchEvent(new CustomEvent('nethor:mobile-services-ready',{detail}))}catch(_){}
  }
  if(type==='ready'||type==='core'){
    try{window.dispatchEvent(new CustomEvent('netto:profile',{detail:{profile:state.profile,avatarUrl:state.avatarUrl,siteConfig:state.siteConfig,mobileServices:true}}))}catch(_){}
  }
  if(type==='ready'||type==='notifications'){
    try{window.dispatchEvent(new CustomEvent('netto:notifications',{detail:{notifications:[...state.notifications],unread:state.unread,mobileServices:true}}))}catch(_){}
  }
}
function subscribe(fn,{immediate=true}={}){
  if(typeof fn!=='function')return()=>{};
  listeners.add(fn);
  if(immediate){try{fn({type:'snapshot',...snapshot()})}catch(_){}}
  return()=>listeners.delete(fn)
}
function applyProfileTheme(){
  const prefs=state.profile?.ui_preferences;
  const theme=prefs&&typeof prefs==='object'&&(prefs.theme==='dark'||prefs.theme==='light')?prefs.theme:'';
  if(!theme)return;
  document.documentElement.dataset.theme=theme;
  try{localStorage.setItem('nettoTheme',theme)}catch(_){}
}
async function avatarFor(profile){
  if(!profile?.avatar_path||!client)return null;
  try{
    const {data,error}=await client.storage.from('profile-avatars').createSignedUrl(profile.avatar_path,3600);
    if(error)return null;
    return data?.signedUrl||null
  }catch(_){return null}
}
function normalizePermissions(rows){
  const out={};
  for(const row of rows||[]){
    const module=String(row?.module||'').trim();
    const permission=String(row?.permission||'').trim();
    if(module&&Object.prototype.hasOwnProperty.call(LEVELS,permission))out[module]=permission
  }
  return out
}
async function readNotificationPreferences(){
  if(!client||!state.session)return[];
  try{
    let {data,error}=await client.rpc('my_notification_channel_preferences');
    if(error){
      const legacy=await client.rpc('my_notification_preferences');
      data=legacy.data;error=legacy.error
    }
    if(error)throw error;
    return Array.isArray(data)?data:[]
  }catch(error){
    console.warn('[Nethor MobileServices] notification preferences',error);
    return[]
  }
}
async function readNotifications(){
  if(!client||!state.session)return[];
  const {data,error}=await client
    .from('planning_notifications')
    .select('id,kind,title,message,planning_date,week_start,target_url,read_at,created_at')
    .eq('user_id',state.session.user.id)
    .order('created_at',{ascending:false})
    .limit(80);
  if(error)throw error;
  return Array.isArray(data)?data:[]
}
async function readPermissions(){
  if(!client||!state.session)return{subrolePermissions:{},subroleKeys:[]};
  const [permissionsResult,keysResult]=await Promise.all([
    client.rpc('my_subrole_permissions'),
    Promise.resolve(client.rpc('my_subrole_keys')).catch(()=>({data:[],error:null}))
  ]);
  return{
    subrolePermissions:permissionsResult.error?{}:normalizePermissions(permissionsResult.data),
    subroleKeys:keysResult?.error?[]:(keysResult?.data||[]).map(row=>row?.subrole_key).filter(Boolean)
  }
}
async function refreshPermissions({emitChange=true}={}){
  if(!state.session)return snapshot();
  try{
    const result=await readPermissions();
    state.subrolePermissions=result.subrolePermissions;
    state.subroleKeys=result.subroleKeys;
    if(emitChange)emit('permissions')
  }catch(error){
    console.warn('[Nethor MobileServices] permissions',error)
  }
  return snapshot()
}
async function refreshNotificationPreferences({emitChange=true}={}){
  state.notificationPreferences=await readNotificationPreferences();
  if(emitChange)emit('notification-preferences');
  return snapshot()
}
async function refreshNotifications({emitChange=true}={}){
  if(!state.session)return snapshot();
  try{
    state.notifications=await readNotifications();
    state.unread=state.notifications.reduce((count,item)=>count+(item?.read_at?0:1),0);
    if(emitChange)emit('notifications')
  }catch(error){
    console.warn('[Nethor MobileServices] notifications',error)
  }
  return snapshot()
}
async function refreshCore({emitChange=true}={}){
  if(!client||!state.session)return snapshot();
  const uid=state.session.user.id;
  const [profileResult,configResult,permissionResult]=await Promise.all([
    client.from('profiles').select('display_name,role,avatar_path,profile_color,avatar_frame,ui_preferences').eq('id',uid).maybeSingle(),
    client.from('app_settings').select('value').eq('key','site_config').maybeSingle(),
    readPermissions()
  ]);
  if(profileResult.error)throw profileResult.error;
  if(!profileResult.data)throw new Error('Profil utilisateur introuvable');
  state.profile=profileResult.data;
  state.siteConfig=configResult.error?state.siteConfig:(configResult.data?.value&&typeof configResult.data.value==='object'?configResult.data.value:{});
  state.subrolePermissions=permissionResult.subrolePermissions;
  state.subroleKeys=permissionResult.subroleKeys;
  state.avatarUrl=await avatarFor(state.profile);
  state.lastRefresh=Date.now();
  applyProfileTheme();
  if(emitChange)emit('core');
  return snapshot()
}
async function refresh(){
  if(!state.session)return snapshot();
  state.status='refreshing';
  emit('refreshing');
  try{
    await refreshCore({emitChange:false});
    const [preferences,notifications]=await Promise.all([
      readNotificationPreferences(),
      readNotifications().catch(error=>{console.warn('[Nethor MobileServices] notifications',error);return state.notifications})
    ]);
    state.notificationPreferences=preferences;
    state.notifications=notifications;
    state.unread=state.notifications.reduce((count,item)=>count+(item?.read_at?0:1),0);
    state.status='ready';
    state.ready=true;
    state.error=null;
    emit('ready');
  }catch(error){
    state.status='error';
    state.error=error;
    emit('error',{error});
    throw error
  }
  return snapshot()
}
function clearChannels(){
  if(!client)return;
  channels.forEach(channel=>{try{client.removeChannel(channel)}catch(_){}});
  channels=[]
}
function scheduleCoreRefresh(){
  clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>{refreshCore().catch(error=>console.warn('[Nethor MobileServices] realtime core',error))},100)
}
function scheduleNotificationRefresh(){
  clearTimeout(notificationTimer);
  notificationTimer=setTimeout(()=>{refreshNotifications().catch(()=>{})},80)
}
function schedulePermissionRefresh(){
  clearTimeout(permissionTimer);
  permissionTimer=setTimeout(()=>{refreshPermissions().catch(()=>{})},100)
}
function schedulePreferenceRefresh(){
  clearTimeout(preferenceTimer);
  preferenceTimer=setTimeout(()=>{refreshNotificationPreferences().catch(()=>{})},100)
}
function startRealtime(){
  clearChannels();
  if(!client||!state.session)return;
  const uid=state.session.user.id;
  const profileChannel=client.channel('mobile-services-profile-'+uid)
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles',filter:'id=eq.'+uid},scheduleCoreRefresh)
    .subscribe();
  const configChannel=client.channel('mobile-services-config')
    .on('postgres_changes',{event:'*',schema:'public',table:'app_settings',filter:'key=eq.site_config'},scheduleCoreRefresh)
    .subscribe();
  const notificationChannel=client.channel('mobile-services-notifications-'+uid)
    .on('postgres_changes',{event:'*',schema:'public',table:'planning_notifications',filter:'user_id=eq.'+uid},scheduleNotificationRefresh)
    .subscribe();
  const accessChannel=client.channel('mobile-services-access-'+uid)
    .on('postgres_changes',{event:'*',schema:'public',table:'user_subroles',filter:'user_id=eq.'+uid},schedulePermissionRefresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'subrole_module_permissions'},schedulePermissionRefresh)
    .subscribe();
  const preferenceChannel=client.channel('mobile-services-notification-preferences-'+uid)
    .on('postgres_changes',{event:'*',schema:'public',table:'notification_preferences',filter:'user_id=eq.'+uid},schedulePreferenceRefresh)
    .on('postgres_changes',{event:'*',schema:'public',table:'notification_rules'},schedulePreferenceRefresh)
    .subscribe();
  channels=[profileChannel,configChannel,notificationChannel,accessChannel,preferenceChannel]
}
function onAuthState(event,session){
  if(session)state.session=session;
  if(event==='SIGNED_OUT'||!session){
    state.session=null;
    state.profile=null;
    state.ready=false;
    state.status='signed-out';
    clearChannels();
    emit('signed-out');
    redirectToLogin();
    return
  }
  if(event==='USER_UPDATED'){
    refresh().catch(()=>{})
  }
}
function ensureClient(){
  if(client)return client;
  if(!window.supabase?.createClient)throw new Error('Supabase indisponible');
  client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  return client
}
async function start(){
  if(startPromise)return startPromise;
  startPromise=(async()=>{
    if(!isMobile())throw new Error('MobileServices réservé au shell Mobile');
    state.status='starting';
    emit('starting');
    ensureClient();
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    state.session=data?.session||null;
    if(!state.session){
      state.status='signed-out';
      emit('signed-out');
      redirectToLogin();
      return snapshot()
    }
    const auth=client.auth.onAuthStateChange(onAuthState);
    authSubscription=auth?.data?.subscription||null;
    await refresh();
    startRealtime();
    return snapshot()
  })().catch(error=>{
    clearChannels();
    try{authSubscription?.unsubscribe?.()}catch(_){}
    authSubscription=null;
    state.status='error';
    state.error=error;
    emit('error',{error});
    startPromise=null;
    throw error
  });
  return startPromise
}
function ready(){
  if(state.ready)return Promise.resolve(snapshot());
  return start()
}
function permission(moduleId){
  const id=String(moduleId||'').trim();
  if(!id)return'none';
  if(state.profile?.role==='admin')return'manage';
  return state.subrolePermissions[id]||'none'
}
function hasSubrolePermission(moduleId,minimum='view'){
  const actual=permission(moduleId);
  return (LEVELS[actual]||0)>=(LEVELS[minimum]||1)
}
async function updateProfile(fields={}){
  if(!client||!state.session)return false;
  const allowed={};
  for(const key of ['profile_color','avatar_path','ui_preferences'])if(Object.prototype.hasOwnProperty.call(fields,key))allowed[key]=fields[key];
  if(!Object.keys(allowed).length)return false;
  const {error}=await client.from('profiles').update(allowed).eq('id',state.session.user.id);
  if(error)throw error;
  state.profile={...state.profile,...allowed};
  if(Object.prototype.hasOwnProperty.call(allowed,'avatar_path'))state.avatarUrl=await avatarFor(state.profile);
  if(Object.prototype.hasOwnProperty.call(allowed,'ui_preferences'))applyProfileTheme();
  emit('core');
  return true
}
async function savePreferences(prefs){
  const value=prefs&&typeof prefs==='object'&&!Array.isArray(prefs)?prefs:{};
  await updateProfile({ui_preferences:value});
  return value
}
async function changePassword(currentPassword,newPassword){
  if(!client||!state.session)throw new Error('Session indisponible');
  const email=state.session.user?.email;
  if(!email)throw new Error('Adresse e-mail indisponible');
  const verify=await client.auth.signInWithPassword({email,password:currentPassword});
  if(verify.error)throw new Error('Mot de passe actuel incorrect.');
  const result=await client.auth.updateUser({password:newPassword});
  if(result.error)throw result.error;
  return true
}
async function uploadAvatar(file){
  if(!client||!state.session||!file)throw new Error('Image indisponible');
  const type=String(file.type||'image/jpeg').toLowerCase();
  const ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg';
  const path=state.session.user.id+'/avatar-'+Date.now()+'.'+ext;
  const uploaded=await client.storage.from('profile-avatars').upload(path,file,{upsert:false,contentType:type});
  if(uploaded.error)throw uploaded.error;
  const old=state.profile?.avatar_path||null;
  try{await updateProfile({avatar_path:path})}
  catch(error){await client.storage.from('profile-avatars').remove([path]);throw error}
  if(old){try{await client.storage.from('profile-avatars').remove([old])}catch(_){}}
  return state.avatarUrl
}
async function removeAvatar(){
  if(!client||!state.session)return false;
  const old=state.profile?.avatar_path||null;
  await updateProfile({avatar_path:null});
  if(old){try{await client.storage.from('profile-avatars').remove([old])}catch(_){}}
  return true
}
async function notificationRules(){
  if(!client||!state.session)return[];
  let {data,error}=await client.rpc('my_notification_channel_preferences');
  if(error){
    const legacy=await client.rpc('my_notification_preferences');
    data=legacy.data;error=legacy.error
  }
  if(error)throw error;
  return Array.isArray(data)?data:[]
}
async function setNotificationChannels(ruleKey,{push=false,portal=false}={}){
  if(!client||!state.session||!ruleKey)return false;
  const {data,error}=await client.rpc('set_my_notification_channels',{
    p_rule_key:String(ruleKey),
    p_push_enabled:!!push,
    p_portal_enabled:!!portal
  });
  if(error||data!==true)throw error||new Error('Enregistrement impossible');
  await refreshNotificationPreferences();
  return true
}
async function submitProblem(payload){
  if(!client||!state.session)throw new Error('Session indisponible');
  const body={...payload,reporter_id:state.session.user.id,reporter_name:state.profile?.display_name||'Utilisateur',reporter_role:state.profile?.role||null};
  const {error}=await client.from('reported_problems').insert(body);
  if(error)throw error;
  return true
}
async function setThemePreference(theme){
  theme=theme==='dark'?'dark':'light';
  document.documentElement.dataset.theme=theme;
  try{localStorage.setItem('nettoTheme',theme)}catch(_){}
  if(!state.profile)return theme;
  const current=state.profile.ui_preferences&&typeof state.profile.ui_preferences==='object'&&!Array.isArray(state.profile.ui_preferences)?state.profile.ui_preferences:{};
  const prefs={...current,theme};
  state.profile={...state.profile,ui_preferences:prefs};
  emit('core');
  if(client&&state.session){
    const {error}=await client.from('profiles').update({ui_preferences:prefs}).eq('id',state.session.user.id);
    if(error)console.warn('[Nethor MobileServices] theme preference',error)
  }
  return theme
}
async function deleteNotification(id){
  if(!client||!state.session||!id)return false;
  const {error}=await client.from('planning_notifications')
    .delete()
    .eq('id',id)
    .eq('user_id',state.session.user.id);
  if(error)throw error;
  state.notifications=state.notifications.filter(item=>String(item.id)!==String(id));
  state.unread=state.notifications.reduce((count,item)=>count+(item?.read_at?0:1),0);
  emit('notifications');
  return true
}
async function deleteAllNotifications(){
  if(!client||!state.session||!state.notifications.length)return false;
  const ids=state.notifications.map(item=>item.id).filter(Boolean);
  if(!ids.length)return false;
  const {error}=await client.from('planning_notifications')
    .delete()
    .eq('user_id',state.session.user.id)
    .in('id',ids);
  if(error)throw error;
  state.notifications=[];
  state.unread=0;
  emit('notifications');
  return true
}
function activeServiceWorkerVersion(){
  return new Promise(resolve=>{
    try{
      const controller=navigator.serviceWorker?.controller;
      if(!controller||typeof MessageChannel==='undefined'){resolve(0);return}
      const channel=new MessageChannel();
      const timer=setTimeout(()=>resolve(0),900);
      channel.port1.onmessage=event=>{clearTimeout(timer);resolve(Number(event?.data?.version)||0)};
      controller.postMessage({type:'GET_VERSION'},[channel.port2])
    }catch(_){resolve(0)}
  })
}
async function checkForUpdates({interactive=true}={}){
  let manifest=null;
  try{
    const response=await fetch('app-version.json?ts='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    manifest=await response.json()
  }catch(error){
    if(interactive)alert('Impossible de vérifier les mises à jour pour le moment.');
    return{available:false,error}
  }
  const current=await activeServiceWorkerVersion();
  const available=current>0&&Number(manifest?.version||0)>Number(current||0);
  if(!interactive)return{available,current,manifest};
  if(!current){
    alert('La vérification automatique des mises à jour sera disponible après l’activation du Service Worker.');
    return{available:false,current,manifest}
  }
  if(!available){
    alert('Nethor est à jour'+(manifest?.label?' · '+manifest.label:'')+'.');
    return{available,current,manifest}
  }
  const accepted=confirm('Une mise à jour de Nethor est disponible'+(manifest?.label?' ('+manifest.label+')':'')+'.\n\nL’installer maintenant ?');
  if(!accepted)return{available,current,manifest,accepted:false};
  try{
    const registration=await navigator.serviceWorker?.getRegistration?.();
    await registration?.update?.();
    const worker=registration?.waiting||registration?.installing||registration?.active||navigator.serviceWorker?.controller;
    worker?.postMessage?.({type:'PURGE_CACHES_AND_SKIP_WAITING'});
    let reloaded=false;
    const reload=()=>{if(reloaded)return;reloaded=true;location.reload()};
    navigator.serviceWorker?.addEventListener?.('controllerchange',reload,{once:true});
    setTimeout(reload,1200);
  }catch(_){location.reload()}
  return{available,current,manifest,accepted:true}
}
async function markNotificationRead(id){
  if(!client||!state.session||!id)return false;
  const {error}=await client.from('planning_notifications')
    .update({read_at:new Date().toISOString()})
    .eq('id',id)
    .eq('user_id',state.session.user.id);
  if(error)throw error;
  await refreshNotifications();
  return true
}
async function markAllNotificationsRead(){
  if(!client||!state.session)return false;
  const {error}=await client.from('planning_notifications')
    .update({read_at:new Date().toISOString()})
    .eq('user_id',state.session.user.id)
    .is('read_at',null);
  if(error)throw error;
  await refreshNotifications();
  return true
}
async function signOut(){
  if(!client)return;
  try{await client.auth.signOut({scope:'local'})}
  finally{redirectToLogin()}
}
function destroy(){
  clearTimeout(refreshTimer);
  clearTimeout(notificationTimer);
  clearTimeout(permissionTimer);
  clearTimeout(preferenceTimer);
  clearChannels();
  try{authSubscription?.unsubscribe?.()}catch(_){}
  authSubscription=null;
  listeners.clear()
}

const api={
  start,
  ready,
  refresh,
  refreshCore,
  refreshPermissions,
  refreshNotifications,
  refreshNotificationPreferences,
  subscribe,
  snapshot,
  permission,
  hasSubrolePermission,
  updateProfile,
  savePreferences,
  changePassword,
  uploadAvatar,
  removeAvatar,
  notificationRules,
  setNotificationChannels,
  submitProblem,
  setThemePreference,
  deleteNotification,
  deleteAllNotifications,
  checkForUpdates,
  markNotificationRead,
  markAllNotificationsRead,
  signOut,
  destroy,
  get client(){return client},
  get session(){return state.session},
  get profile(){return state.profile},
  get siteConfig(){return state.siteConfig},
  get subrolePermissions(){return state.subrolePermissions},
  get subroleKeys(){return state.subroleKeys},
  get avatarUrl(){return state.avatarUrl},
  get notifications(){return state.notifications},
  get notificationPreferences(){return state.notificationPreferences},
  get unread(){return state.unread},
  get status(){return state.status},
  get isReady(){return state.ready}
};

window.NethorMobileServices=Object.freeze(api);
window.MobileServices=window.NethorMobileServices;
})();