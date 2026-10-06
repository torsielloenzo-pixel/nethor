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
let coreRequestSeq=0,notificationRequestSeq=0,permissionsRequestSeq=0,refreshAllPromise=null;
function offlineStore(){return window.NethorOfflineStore}
async function persistOfflineShell(){
 if(navigator.onLine===false||!state.session?.user?.id||!state.profile||!state.ready)return;
 const uid=state.session.user.id,profile=state.profile;
 await offlineStore()?.put?.(uid,'shell','profile',{
  profile:{display_name:profile.display_name,role:profile.role,profile_color:profile.profile_color,ui_preferences:{theme:profile.ui_preferences?.theme}},
  subrolePermissions:{...state.subrolePermissions},subroleKeys:[...state.subroleKeys]
 })
}
async function restoreOfflineShell(){
 const uid=state.session?.user?.id;
 if(!uid)return false;
 const cached=await offlineStore()?.get?.(uid,'shell','profile');
 if(!cached?.data?.profile?.role)return false;
 state.profile=cached.data.profile;
 state.subrolePermissions=cached.data.subrolePermissions||{};
 state.subroleKeys=Array.isArray(cached.data.subroleKeys)?cached.data.subroleKeys:[];
 state.siteConfig={};
 state.notifications=[];state.unread=0;
 state.ready=true;state.status='offline';state.error=null;
 state.lastRefresh=0;
 applyProfileTheme();
 emit('ready');
 return true
}
let serviceWorkerRegistrationPromise=null;
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
    return [...state.notificationPreferences]
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
  const uid=state.session.user.id,seq=++permissionsRequestSeq;
  try{
    const result=await readPermissions();
    if(seq!==permissionsRequestSeq||state.session?.user?.id!==uid)return snapshot();
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
  const uid=state.session.user.id,seq=++notificationRequestSeq;
  const sync=window.NethorMobileSync,ticket=sync?.beginCheck?.('notifications');
  try{
    const list=await readNotifications();
    if(seq!==notificationRequestSeq||state.session?.user?.id!==uid)return snapshot();
    state.notifications=list;
    state.unread=state.notifications.reduce((count,item)=>count+(item?.read_at?0:1),0);
    sync?.markVerified?.('notifications',ticket);
    if(emitChange)emit('notifications')
  }catch(error){
    sync?.markFailed?.('notifications',ticket);
    console.warn('[Nethor MobileServices] notifications',error)
  }
  return snapshot()
}
async function refreshCore({emitChange=true}={}){
  if(!client||!state.session)return snapshot();
  const uid=state.session.user.id,seq=++coreRequestSeq;
  const [profileResult,configResult,permissionResult]=await Promise.all([
    client.from('profiles').select('display_name,role,avatar_path,profile_color,avatar_frame,ui_preferences').eq('id',uid).maybeSingle(),
    client.from('app_settings').select('value').eq('key','site_config').maybeSingle(),
    readPermissions()
  ]);
  if(seq!==coreRequestSeq||state.session?.user?.id!==uid)return snapshot();
  if(profileResult.error)throw profileResult.error;
  if(!profileResult.data)throw new Error('Profil utilisateur introuvable');
  state.profile=profileResult.data;
  state.siteConfig=configResult.error?state.siteConfig:(configResult.data?.value&&typeof configResult.data.value==='object'?configResult.data.value:{});
  try{window.NettoSounds?.configure?.(state.siteConfig)}catch(error){console.warn('[Nethor MobileServices] configuration audio',error)}
  state.subrolePermissions=permissionResult.subrolePermissions;
  state.subroleKeys=permissionResult.subroleKeys;
  const signedAvatar=await avatarFor(state.profile);
  if(seq!==coreRequestSeq||state.session?.user?.id!==uid)return snapshot();
  state.avatarUrl=signedAvatar;
  state.lastRefresh=Date.now();
  applyProfileTheme();
  if(emitChange)emit('core');
  return snapshot()
}
async function refresh(){
  if(!state.session)return snapshot();
  if(refreshAllPromise)return refreshAllPromise;
  const uid=state.session.user.id,notificationsSeq=++notificationRequestSeq;
  const sync=window.NethorMobileSync,notificationsTicket=sync?.beginCheck?.('notifications');
  refreshAllPromise=(async()=>{
    state.status='refreshing';
    emit('refreshing');
    try{
      await refreshCore({emitChange:true});
      if(state.session?.user?.id!==uid)return snapshot();
      const [preferences,notifications]=await Promise.all([
        readNotificationPreferences(),
        readNotifications().catch(error=>{console.warn('[Nethor MobileServices] notifications',error);return null})
      ]);
      if(state.session?.user?.id!==uid)return snapshot();
      state.notificationPreferences=preferences;
      if(notificationsSeq===notificationRequestSeq){
        if(notifications!==null){
          state.notifications=notifications;
          state.unread=state.notifications.reduce((count,item)=>count+(item?.read_at?0:1),0);
          sync?.markVerified?.('notifications',notificationsTicket)
        }else sync?.markFailed?.('notifications',notificationsTicket)
      }
      state.status='ready';state.ready=true;state.error=null;emit('ready');
      void persistOfflineShell().catch(()=>{});
      if(!channels.length)startRealtime();
    }catch(error){
      sync?.markFailed?.('notifications',notificationsTicket);
      if(state.session?.user?.id===uid){state.status='error';state.error=error;emit('error',{error})}
      throw error
    }
    return snapshot()
  })();
  try{return await refreshAllPromise}finally{refreshAllPromise=null}
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
  const previousUid=state.session?.user?.id||'';
  if(session&&previousUid&&previousUid!==session.user?.id){
    void offlineStore()?.clearUser?.(previousUid);
    window.NethorMobileSync?.stop?.()
  }
  if(session)state.session=session;
  if(event==='SIGNED_OUT'||!session){
    void offlineStore()?.clearUser?.(previousUid);
    window.NethorMobileSync?.stop?.();
    coreRequestSeq++;notificationRequestSeq++;permissionsRequestSeq++;
    window.NethorClientHealth?.clear?.();
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
function waitForWorkerActivation(reg,timeout=3500){
  return new Promise(resolve=>{
    if(reg?.active)return resolve(reg.active);
    let done=false;
    const finish=worker=>{
      if(done)return;
      if(worker?.state==='activated'||reg?.active){done=true;clearTimeout(timer);resolve(reg?.active||worker||null)}
    };
    const bind=worker=>{
      if(!worker)return;
      worker.addEventListener?.('statechange',()=>finish(worker));
      finish(worker)
    };
    const timer=setTimeout(()=>{if(!done){done=true;resolve(reg?.active||null)}},timeout);
    bind(reg?.installing);bind(reg?.waiting);
    reg?.addEventListener?.('updatefound',()=>bind(reg.installing),{once:true})
  })
}
async function ensureMobileServiceWorker({update=false}={}){
  if(!('serviceWorker' in navigator))return null;
  if(!serviceWorkerRegistrationPromise){
    serviceWorkerRegistrationPromise=(async()=>{
      const reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      if(!reg.active)await waitForWorkerActivation(reg);
      return reg
    })().catch(error=>{
      console.warn('[Nethor MobileServices] Service Worker',error);
      serviceWorkerRegistrationPromise=null;
      return null
    })
  }
  const reg=await serviceWorkerRegistrationPromise;
  if(update&&reg){
    await reg.update().catch(error=>console.warn('[Nethor MobileServices] Service Worker update',error));
  }
  return reg
}
async function start(){
  if(startPromise)return startPromise;
  startPromise=(async()=>{
    if(!isMobile())throw new Error('MobileServices réservé au shell Mobile');
    state.status='starting';
    emit('starting');
    ensureClient();
    void ensureMobileServiceWorker();
    const {data,error}=await client.auth.getSession();
    if(error)throw error;
    state.session=data?.session||null;
    if(state.session)offlineStore()?.bind?.(state.session.user.id);
    if(!state.session){
      state.status='signed-out';
      emit('signed-out');
      redirectToLogin();
      return snapshot()
    }
    const auth=client.auth.onAuthStateChange(onAuthState);
    authSubscription=auth?.data?.subscription||null;
    if(navigator.onLine===false){
      if(!await restoreOfflineShell()){
        state.status='error';
        state.error=new Error('Connecte-toi une première fois en ligne pour activer Nethor Offline');
        emit('error',{error:state.error});
        return snapshot()
      }
      window.NethorMobileSync?.start?.({db:client,uid:state.session.user.id});
      return snapshot()
    }
    await refresh();
    window.NethorClientHealth?.bindClient?.(client,'mobile');
    if(!channels.length)startRealtime();
    window.NethorMobileSync?.start?.({db:client,uid:state.session?.user?.id});
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
function serviceWorkerVersion(worker){
  return new Promise(resolve=>{
    try{
      if(!worker||typeof MessageChannel==='undefined'){resolve(0);return}
      const channel=new MessageChannel();
      let settled=false;
      const finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(Number(value)||0)};
      const timer=setTimeout(()=>finish(0),1200);
      channel.port1.onmessage=event=>finish(event?.data?.version);
      worker.postMessage({type:'GET_VERSION'},[channel.port2])
    }catch(_){resolve(0)}
  })
}
async function activeServiceWorkerVersion(reg=null){
  try{
    const registration=reg||await ensureMobileServiceWorker();
    let worker=navigator.serviceWorker?.controller||registration?.active||null;
    if(!worker&&registration){
      worker=await waitForWorkerActivation(registration,2500);
    }
    return await serviceWorkerVersion(worker)
  }catch(_){return 0}
}
function waitForWaitingWorker(reg,targetVersion=0,timeout=15000){
  return new Promise(resolve=>{
    let settled=false,timer=null;
    const finish=worker=>{
      if(settled)return;
      settled=true;
      if(timer)clearTimeout(timer);
      resolve(worker||null)
    };
    const inspect=async worker=>{
      if(!worker)return false;
      const state=String(worker.state||'');
      if(state==='installed'||state==='activated'){
        const version=await serviceWorkerVersion(worker);
        if(!targetVersion||version>=targetVersion){finish(worker);return true}
      }
      return false
    };
    const bind=worker=>{
      if(!worker)return;
      void inspect(worker);
      worker.addEventListener?.('statechange',()=>{void inspect(worker)})
    };
    void inspect(reg?.waiting);
    bind(reg?.installing);
    const onUpdate=()=>bind(reg?.installing);
    reg?.addEventListener?.('updatefound',onUpdate);
    timer=setTimeout(async()=>{
      reg?.removeEventListener?.('updatefound',onUpdate);
      if(await inspect(reg?.waiting))return;
      finish(null)
    },timeout)
  })
}
function updateNeedsCacheReset(manifest){
  return manifest?.clear_cache===true||manifest?.cache_reset===true||manifest?.major===true||manifest?.important===true
}
function reloadAfterMobileUpdate(version){
  const u=new URL(location.href);
  u.searchParams.set('_nethor_update',String(version||'latest')+'-'+Date.now());
  location.replace(u.href)
}
async function activateMobileUpdate(reg,manifest){
  const target=Number(manifest?.version)||0;
  if(!reg||!target)throw new Error('Mise à jour invalide');
  const activeVersion=await activeServiceWorkerVersion(reg);
  if(activeVersion>=target){reloadAfterMobileUpdate(target);return true}
  let worker=reg.waiting;
  if(!worker||await serviceWorkerVersion(worker)<target){
    await reg.update();
    worker=await waitForWaitingWorker(reg,target,15000)
  }
  if(!worker){
    const latestActive=await activeServiceWorkerVersion(reg);
    if(latestActive>=target){reloadAfterMobileUpdate(target);return true}
    throw new Error('Le nouveau Service Worker n’est pas encore prêt')
  }
  const workerVersion=await serviceWorkerVersion(worker);
  if(workerVersion<target)throw new Error('Version du Service Worker incohérente');
  return new Promise((resolve,reject)=>{
    let finished=false;
    const done=()=>{
      if(finished)return;
      finished=true;
      clearTimeout(timer);
      navigator.serviceWorker?.removeEventListener?.('controllerchange',onControllerChange);
      reloadAfterMobileUpdate(target);
      resolve(true)
    };
    const onControllerChange=()=>done();
    navigator.serviceWorker?.addEventListener?.('controllerchange',onControllerChange);
    const timer=setTimeout(async()=>{
      if(finished)return;
      const current=await activeServiceWorkerVersion(reg);
      if(current>=target){done();return}
      finished=true;
      navigator.serviceWorker?.removeEventListener?.('controllerchange',onControllerChange);
      reject(new Error('Activation de la mise à jour trop longue'))
    },12000);
    worker.postMessage({type:updateNeedsCacheReset(manifest)?'PURGE_CACHES_AND_SKIP_WAITING':'SKIP_WAITING'})
  })
}

const MOBILE_UPDATE_RELEASE_LABELS=new Map([[368,'v1.46.19'],[369,'v1.46.20'],[367,'v1.46.18'],[366,'v1.46.17'],[365,'v1.46.16'],[364,'v1.46.15'],[363,'v1.46.14'],[362,'v1.46.13'],[361,'v1.46.12'],[360,'v1.46.11'],[359,'v1.46.10'],[358,'v1.46.9'],[357,'v1.46.8']]);
let mobileUpdateSnapshot=null;

function mobileUpdateEsc(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))
}
function mobileUpdateVersionLabel(value,manifest={},latest=false){
  const n=Math.max(0,Math.trunc(Number(value)||0));
  const label=String(manifest?.label||'').trim();
  if(n&&latest&&label)return label;
  if(n&&n===Number(manifest?.version||0)&&label)return label;
  return MOBILE_UPDATE_RELEASE_LABELS.get(n)||(n?'Build '+n:'—')
}
function mobileUpdateSvg(kind){
  const common='viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
  if(kind==='check')return '<svg '+common+'><path d="m6.5 12.4 3.3 3.3 7.7-8"/></svg>';
  if(kind==='up')return '<svg '+common+'><path d="M12 18V6m0 0-4.2 4.2M12 6l4.2 4.2"/></svg>';
  if(kind==='alert')return '<svg '+common+'><path d="M12 7.2v6.1"/><path d="M12 17.1h.01"/></svg>';
  if(kind==='refresh')return '<svg '+common+'><path d="M20 11a8 8 0 0 0-14.7-4.4L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14.7 4.4L20 15"/><path d="M20 20v-5h-5"/></svg>';
  if(kind==='download')return '<svg '+common+'><path d="M12 3v11"/><path d="m8 10 4 4 4-4"/><path d="M5 18v2h14v-2"/></svg>';
  if(kind==='document')return '<svg '+common+'><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M10 12h5M10 16h5"/></svg>';
  if(kind==='warning')return '<svg '+common+'><path d="M12 3 2.8 19h18.4z"/><path d="M12 8.5v5"/><path d="M12 16.8h.01"/></svg>';
  return '<svg '+common+'><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></svg>'
}
function mobileUpdateLogo(manifest={}){
  const custom=String(state.siteConfig?.platform_ui?.mobile?.update_logo?.url||'').trim();
  return custom||String(manifest?.icon||'assets/app-icon-v63.svg')
}
function mobileUpdateNotes(manifest={}){
  const direct=Array.isArray(manifest.notes)?manifest.notes:(Array.isArray(manifest.changes)?manifest.changes:[]);
  const notes=direct.map(x=>String(x||'').trim()).filter(Boolean);
  if(!notes.length&&manifest.title)notes.push(String(manifest.title).trim());
  if(notes.length<3&&manifest.message){
    const message=String(manifest.message).trim();
    if(message&&!notes.includes(message))notes.push(message)
  }
  return notes.slice(0,3)
}
function ensureMobileUpdateModalStyles(){
  if(document.getElementById('nethorMobileUpdateStyles'))return;
  const style=document.createElement('style');style.id='nethorMobileUpdateStyles';
  style.textContent=[
    '.nmuBackdrop{position:fixed;inset:0;z-index:2147483400;display:grid;place-items:center;padding:calc(18px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom));background:rgba(11,14,18,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}',
    '.nmuCard{position:relative;width:min(calc(100vw - 32px),350px);max-height:calc(100dvh - 44px);overflow:auto;overscroll-behavior:contain;background:#fff;color:#151a20;border:1px solid rgba(255,255,255,.82);border-radius:24px;box-shadow:0 26px 78px rgba(0,0,0,.34);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
    '.nmuHandle{width:42px;height:4px;border-radius:99px;background:#d7dade;margin:10px auto 3px}',
    '.nmuHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:9px 16px 6px}.nmuHeadTitle{display:flex;align-items:flex-start;gap:10px;min-width:0}.nmuHeadTitle>i{width:4px;height:38px;border-radius:99px;background:linear-gradient(180deg,#ff3e27,#ff8a29);flex:none}.nmuHeadTitle strong{display:block;font-size:16px;line-height:1.2;font-weight:900;letter-spacing:-.35px}.nmuHeadTitle small{display:block;margin-top:4px;font-size:10px;color:#6f7883}.nmuClose{width:34px;height:34px;border:0;border-radius:50%;background:#f0f2f4;color:#232931;font-size:23px;font-weight:300;line-height:1;display:grid;place-items:center;padding:0}',
    '.nmuBody{padding:2px 17px 16px}.nmuMain{text-align:center}.nmuLogoWrap{position:relative;width:74px;height:74px;margin:8px auto 12px}.nmuLogoWrap>img{display:block;width:74px;height:74px;border-radius:18px;object-fit:cover;background:#22272d;box-shadow:0 9px 22px rgba(0,0,0,.14)}.nmuBadge{position:absolute;right:-9px;bottom:-5px;width:38px;height:38px;border:4px solid #fff;border-radius:50%;display:grid;place-items:center;color:#fff;box-shadow:0 4px 10px rgba(0,0,0,.14)}.nmuBadge.success{background:#27ba5d}.nmuBadge.checking{background:#fff}.nmuBadge.checking i{display:block;width:24px;height:24px;border-radius:50%;border:4px solid #d9dde1;border-right-color:#ff6b2d;animation:nmuSpin .72s linear infinite}.nmuBadge.available{background:linear-gradient(135deg,#ff7040,#ff913f)}.nmuBadge.error{background:#ff4d48}.nmuBadge svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}',
    '.nmuMain h2{margin:0;font-size:18px;line-height:1.18;font-weight:930;letter-spacing:-.45px;color:#10161d}.nmuLead{margin:6px auto 0;max-width:290px;color:#69727d;font-size:11px;line-height:1.45}',
    '.nmuVersions{display:grid;grid-template-columns:minmax(0,1fr) 30px minmax(0,1fr);align-items:center;gap:4px;margin-top:15px;padding:12px 10px;border-radius:15px;background:linear-gradient(180deg,#f7f8f9,#f3f5f6);min-height:68px}.nmuVersions>div{min-width:0}.nmuVersions span:not(.nmuArrow){display:block;font-size:9.5px;color:#7a8490}.nmuVersions strong{display:block;margin-top:4px;font-size:16px;line-height:1.1;font-weight:900;color:#111820;letter-spacing:-.3px}.nmuVersions strong.isNew{color:#ff5a22}.nmuArrow{display:grid;place-items:center;color:#717b86}.nmuArrow svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
    '.nmuLast{display:flex;align-items:center;justify-content:center;gap:8px;margin:12px 0 15px;color:#69737e;font-size:10px}.nmuLast i{width:9px;height:9px;border-radius:50%;background:#2cbb5d}',
    '.nmuAction,.nmuLater{min-height:47px;border:0;border-radius:14px;font:850 11.5px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center;gap:8px}.nmuAction{width:100%}.nmuAction svg,.nmuLater svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.nmuAction.outline{background:#fff;border:1px solid #d9dde2;color:#242a31}.nmuAction.primary{background:linear-gradient(105deg,#ff3d26,#ff8a29);color:#fff;box-shadow:0 9px 20px rgba(255,83,31,.18)}.nmuAction.disabled{background:#e4e7ea;color:#8b939c}.nmuAction:disabled,.nmuLater:disabled{opacity:.7}',
    '.nmuChecking{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px;padding:12px 13px;border-radius:14px;background:linear-gradient(180deg,#f7f8f9,#f3f5f6);color:#20262d}.nmuChecking strong{font-size:10.5px;font-weight:850}.nmuSpinner{width:25px;height:25px;border-radius:50%;border:3px solid #d9dde1;border-right-color:#ff5d24;animation:nmuSpin .72s linear infinite;flex:none}@keyframes nmuSpin{to{transform:rotate(360deg)}}.nmuChecking+.nmuVersions{margin-top:10px}.nmuChecking~.nmuAction{margin-top:11px}',
    '.nmuNews{display:grid;grid-template-columns:31px minmax(0,1fr);gap:9px;text-align:left;margin-top:11px;padding:11px 12px;border-radius:14px;background:linear-gradient(180deg,#f7f8f9,#f3f5f6);color:#252b32}.nmuNewsIcon{display:grid;place-items:start center;color:#515b67}.nmuNewsIcon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.nmuNews strong{display:block;font-size:10.5px;font-weight:900}.nmuNews ul{margin:4px 0 0;padding-left:16px;color:#68717d;font-size:9.8px;line-height:1.45}.nmuSplit{display:grid;grid-template-columns:.82fr 1.18fr;gap:9px;margin-top:11px}.nmuLater{background:#eff1f3;color:#30363d}',
    '.nmuWarning{display:grid;grid-template-columns:32px minmax(0,1fr);align-items:center;gap:10px;text-align:left;margin-top:16px;padding:12px 13px;border-radius:14px;background:#fff1ef;color:#5e6873}.nmuWarning>span{width:27px;height:27px;border-radius:50%;background:#ff5c50;color:#fff;display:grid;place-items:center}.nmuWarning svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.nmuWarning p{margin:0;font-size:10px;line-height:1.4}.nmuWarning+.nmuAction{margin-top:16px}',
    '@media(max-width:360px){.nmuCard{width:calc(100vw - 20px)}.nmuBody{padding-left:13px;padding-right:13px}.nmuHead{padding-left:13px;padding-right:13px}.nmuHeadTitle strong{font-size:15px}.nmuMain h2{font-size:17px}}'
  ].join('');
  document.head.appendChild(style)
}
function closeMobileUpdateModal(){
  document.getElementById('nethorMobileUpdateBackdrop')?.remove();
  document.documentElement.classList.remove('nethorMobileUpdateOpen')
}
function openMobileUpdateModal(){
  ensureMobileUpdateModalStyles();
  closeMobileUpdateModal();
  const bg=document.createElement('div');bg.id='nethorMobileUpdateBackdrop';bg.className='nmuBackdrop';
  bg.innerHTML='<section class="nmuCard" role="dialog" aria-modal="true" aria-labelledby="nmuTitle"><div class="nmuHandle" aria-hidden="true"></div><header class="nmuHead"><div class="nmuHeadTitle"><i></i><div><strong id="nmuTitle">Mise à jour Nethor</strong><small>Version et état de l’application</small></div></div><button type="button" class="nmuClose" aria-label="Fermer">×</button></header><div id="nmuBody" class="nmuBody"></div></section>';
  document.body.appendChild(bg);document.documentElement.classList.add('nethorMobileUpdateOpen');
  bg.querySelector('.nmuClose').onclick=closeMobileUpdateModal;
  bg.onclick=e=>{if(e.target===bg)closeMobileUpdateModal()};
  return bg
}
function mobileUpdateVersionStrip(snapshot,checking=false){
  const manifest=snapshot?.manifest||{},current=Number(snapshot?.current)||0,latest=Number(manifest?.version)||Number(snapshot?.latest)||current;
  return '<div class="nmuVersions"><div><span>Version installée</span><strong>'+mobileUpdateEsc(mobileUpdateVersionLabel(current,manifest,false))+'</strong></div><span class="nmuArrow">'+mobileUpdateSvg('arrow')+'</span><div><span>'+(snapshot?.available?'Nouvelle version':'Dernière version')+'</span><strong class="'+(snapshot?.available?'isNew':'')+'">'+(checking?'—':mobileUpdateEsc(mobileUpdateVersionLabel(latest,manifest,true)))+'</strong></div></div>'
}
function mobileUpdateLogoHtml(snapshot,view){
  const manifest=snapshot?.manifest||{},badge=view==='ready'?'<span class="nmuBadge success">'+mobileUpdateSvg('check')+'</span>':view==='checking'?'<span class="nmuBadge checking"><i></i></span>':view==='available'?'<span class="nmuBadge available">'+mobileUpdateSvg('up')+'</span>':view==='error'?'<span class="nmuBadge error">'+mobileUpdateSvg('alert')+'</span>':'';
  return '<div class="nmuLogoWrap"><img src="'+mobileUpdateEsc(mobileUpdateLogo(manifest))+'" alt="Logo Nethor">'+badge+'</div>'
}
function renderMobileUpdateModal(snapshot={},view='ready'){
  const host=document.getElementById('nmuBody');if(!host)return;
  mobileUpdateSnapshot=snapshot;
  if(view==='checking'){
    host.innerHTML='<div class="nmuMain">'+mobileUpdateLogoHtml(snapshot,view)+'<h2>Vérification en cours...</h2><p class="nmuLead">Recherche de la dernière version disponible.</p><div class="nmuChecking"><span class="nmuSpinner"></span><strong>Vérification de la dernière version...</strong></div>'+mobileUpdateVersionStrip(snapshot,true)+'<button type="button" class="nmuAction disabled" disabled>'+mobileUpdateSvg('refresh')+'Vérification en cours...</button></div>';
    return
  }
  if(view==='error'){
    host.innerHTML='<div class="nmuMain">'+mobileUpdateLogoHtml(snapshot,view)+'<h2>Impossible de vérifier<br>les mises à jour</h2><p class="nmuLead">Une erreur est survenue lors de la vérification.<br>Veuillez réessayer dans quelques instants.</p><div class="nmuWarning"><span>'+mobileUpdateSvg('warning')+'</span><p>Vérifiez votre connexion internet<br>ou réessayez plus tard.</p></div><button type="button" class="nmuAction primary" id="nmuRetry">'+mobileUpdateSvg('refresh')+'Réessayer</button></div>';
    document.getElementById('nmuRetry').onclick=()=>runMobileUpdateCheck(snapshot);
    return
  }
  if(view==='available'){
    const notes=mobileUpdateNotes(snapshot.manifest||{});
    host.innerHTML='<div class="nmuMain">'+mobileUpdateLogoHtml(snapshot,view)+'<h2>Une mise à jour est disponible</h2><p class="nmuLead">Une nouvelle version de Nethor est<br>prête à être installée.</p>'+mobileUpdateVersionStrip(snapshot,false)+'<div class="nmuNews"><span class="nmuNewsIcon">'+mobileUpdateSvg('document')+'</span><div><strong>Nouveautés</strong><ul>'+(notes.length?notes.map(x=>'<li>'+mobileUpdateEsc(x)+'</li>').join(''):'<li>Améliorations et optimisations de Nethor</li>')+'</ul></div></div><div class="nmuSplit"><button type="button" class="nmuLater" id="nmuLater">Plus tard</button><button type="button" class="nmuAction primary" id="nmuInstall">'+mobileUpdateSvg('download')+'Mettre à jour</button></div></div>';
    document.getElementById('nmuLater').onclick=closeMobileUpdateModal;
    const install=document.getElementById('nmuInstall');
    install.onclick=async()=>{
      if(install.disabled)return;
      install.disabled=true;install.innerHTML=mobileUpdateSvg('download')+'Mise à jour...';
      try{await activateMobileUpdate(snapshot.registration,snapshot.manifest)}
      catch(error){
        console.warn('[Nethor MobileServices] installation update',error);
        renderMobileUpdateModal(snapshot,'error')
      }
    };
    return
  }
  host.innerHTML='<div class="nmuMain">'+mobileUpdateLogoHtml(snapshot,'ready')+'<h2>Nethor est à jour</h2><p class="nmuLead">Vous utilisez la dernière version<br>disponible.</p>'+mobileUpdateVersionStrip(snapshot,false)+'<div class="nmuLast"><i></i><span>Dernière vérification : à l’instant</span></div><button type="button" class="nmuAction outline" id="nmuCheckAgain">'+mobileUpdateSvg('refresh')+'Vérifier à nouveau</button></div>';
  document.getElementById('nmuCheckAgain').onclick=()=>runMobileUpdateCheck(snapshot)
}
async function mobileUpdateFetchSnapshot(){
  const response=await fetch('app-version.json?mobile_update='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw new Error('HTTP '+response.status);
  const manifest=await response.json();
  const registration=await ensureMobileServiceWorker({update:true});
  const current=await activeServiceWorkerVersion(registration);
  if(!current)throw new Error('Service Worker non actif');
  const latest=Number(manifest?.version)||0;
  return{registration,current,latest,manifest,available:latest>Number(current||0)}
}
async function runMobileUpdateCheck(seed={}){
  renderMobileUpdateModal(seed,'checking');
  try{
    const snapshot=await mobileUpdateFetchSnapshot();
    renderMobileUpdateModal(snapshot,snapshot.available?'available':'ready');
    return snapshot
  }catch(error){
    console.warn('[Nethor MobileServices] check update',error);
    renderMobileUpdateModal(seed,'error');
    return{...seed,available:false,error}
  }
}
async function checkForUpdates({interactive=true}={}){
  if(!interactive){
    try{return await mobileUpdateFetchSnapshot()}
    catch(error){return{available:false,error}}
  }
  openMobileUpdateModal();
  return runMobileUpdateCheck(mobileUpdateSnapshot||{})
}

async function markPlanningDayRead(day,source='mobile_home',revisionAt=''){
  if(!client||!state.session||!revisionAt||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(day||'')))return false;
  const {data,error}=await client.rpc('planning_mark_day_read',{p_day:String(day),p_source:String(source||'mobile_home'),p_revision_at:String(revisionAt)});
  if(error){console.warn('[Nethor MobileServices] planning read',error);return false}
  return data===true
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
  const uid=state.session?.user?.id;
  try{await client.auth.signOut({scope:'local'})}
  finally{
    if(uid)await offlineStore()?.clearUser?.(uid);
    redirectToLogin()
  }
}
function destroy(){
 window.NethorMobileSync?.stop?.();
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
  markPlanningDayRead,
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