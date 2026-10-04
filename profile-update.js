(function(){
'use strict';
window.NethorProfileFeatures=window.NethorProfileFeatures||{};
const api=window.NettoProfileUI||{},sounds=window.NettoSounds||{play(){}};
const APP_RELEASE=361;
const APP_RELEASE_LABEL='v1.46.12';
const APP_ICON='assets/app-icon-v63.svg';
const APP_MOBILE_ICON='assets/app-icon-mobile-v74.svg';
const RELEASE_LABELS=new Map([[APP_RELEASE,APP_RELEASE_LABEL],[360,'v1.46.11'],[359,'v1.46.10'],[358,'v1.46.9'],[357,'v1.46.8']]);
function syncAppIconLinks(){
 const version=Number(localStorage.getItem('nettoAppVersion')||0)||APP_RELEASE;
 document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(x=>x.remove());
 const href=APP_ICON+'?v='+version;
 const icon=document.createElement('link');icon.rel='icon';icon.type='image/svg+xml';icon.href=href;icon.sizes='any';document.head.appendChild(icon);
 const shortcut=document.createElement('link');shortcut.rel='shortcut icon';shortcut.type='image/svg+xml';shortcut.href=href;document.head.appendChild(shortcut);
 const apple=document.createElement('link');apple.rel='apple-touch-icon';apple.href=APP_MOBILE_ICON+'?v='+version;document.head.appendChild(apple);
 let manifest=document.querySelector('link[rel="manifest"]');if(!manifest){manifest=document.createElement('link');manifest.rel='manifest';document.head.appendChild(manifest)}manifest.href='manifest.webmanifest?v='+version
}
let updateRegistration=null;

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function ensureProfileStylesheet(id,href,match){
 if(document.getElementById(id)||(match&&document.querySelector('link[href*="'+match+'"]')))return;
 const link=document.createElement('link');link.id=id;link.rel='stylesheet';link.href=href;document.head?.appendChild(link)
}
function ensureUpdateStyles(){ensureProfileStylesheet('nettoUpdateStylesheet','profile-update.css?v=2','profile-update.css')}
function ensureUpdateCenterStyles(){ensureUpdateStyles()}
function closeDrops(){try{api.closeDrops?.()}catch(_){}}
function mobilePreviewNotice(message){
 const feature=window.NethorProfileFeatures?.mobilePreview;if(feature?.notice)return feature.notice(message);
 let old=document.getElementById('nettoMobilePreviewNotice');old?.remove();
 const notice=document.createElement('div');notice.id='nettoMobilePreviewNotice';notice.className='nettoMobilePreviewNotice';
 const dot=document.createElement('i'),label=document.createElement('span');label.textContent=String(message||'');
 notice.append(dot,label);document.body.appendChild(notice);requestAnimationFrame(()=>notice.classList.add('show'));
 setTimeout(()=>{notice.classList.remove('show');setTimeout(()=>notice.remove(),220)},2200)
}

function askUpdateSearch(){
 ensureUpdateStyles();
 return new Promise(resolve=>{
  document.getElementById('nettoUpdateConfirmBackdrop')?.remove();
  const bg=document.createElement('div');bg.id='nettoUpdateConfirmBackdrop';bg.className='nettoUpdateConfirmBackdrop';
  bg.innerHTML='<div class="nettoUpdateConfirmCard" role="dialog" aria-modal="true" aria-labelledby="nettoUpdateConfirmTitle"><h3 id="nettoUpdateConfirmTitle">Chercher une mise à jour ?</h3><p>Nethor va consulter le journal des mises à jour puis vérifier la version installée sur cet appareil.</p><div class="nettoUpdateConfirmActions"><button type="button" class="nettoUpdateConfirmCancel">Annuler</button><button type="button" class="nettoUpdateConfirmGo">Rechercher</button></div></div>';
  document.body.appendChild(bg);
  const done=v=>{bg.remove();resolve(v)};
  bg.querySelector('.nettoUpdateConfirmCancel').onclick=()=>done(false);
  bg.querySelector('.nettoUpdateConfirmGo').onclick=()=>done(true);
  bg.onclick=e=>{if(e.target===bg)done(false)};
  const onKey=e=>{if(e.key==='Escape'){document.removeEventListener('keydown',onKey);done(false)}};
  document.addEventListener('keydown',onKey,{once:true});
  sounds.play('menuOpen')
 })
}

function normalizeReleaseLabel(label){
 const value=String(label||'').trim();
 if(!value)return'';
 const m=value.match(/^v?(\d+)\.(\d+)\.(\d+)$/i);
 return m?'v'+Number(m[1])+'.'+Number(m[2])+'.'+Number(m[3]):''
}

function rememberReleaseLabel(version,label){
 const n=Math.max(0,Math.trunc(Number(version)||0)),normalized=normalizeReleaseLabel(label);
 if(n&&normalized)RELEASE_LABELS.set(n,normalized);
 return normalized
}

function displayVersion(value,label=''){
 const n=Math.max(0,Math.trunc(Number(value)||0));
 const normalized=rememberReleaseLabel(n,label);
 if(normalized)return normalized;
 if(RELEASE_LABELS.has(n))return RELEASE_LABELS.get(n);
 return n===APP_RELEASE?APP_RELEASE_LABEL:'Build '+n
}

function parseVersionFromLog(row){
 const direct=Number(row?.details?.version||row?.details?.app_version||row?.details?.release_version||0);
 if(Number.isFinite(direct)&&direct>0)return direct;
 const text=[row?.title,row?.description,typeof row?.details==='string'?row.details:JSON.stringify(row?.details||{})].join(' ');
 const m=text.match(/\bv(?:ersion\s*)?(\d{1,5})\b/i)||text.match(/\bversion\s*(\d{1,5})\b/i);
 return m?Number(m[1])||0:0
}

async function latestVersionFromLogs(){
 if(!api.client)return 0;
 const {data,error}=await api.client.from('portal_change_logs').select('release_type,title,description,created_at,details').eq('source','auto').order('created_at',{ascending:false}).limit(100);
 if(error)throw error;
 let latest=0;
 for(const row of data||[])latest=Math.max(latest,parseVersionFromLog(row));
 return latest
}

function waitForUpdateWorker(reg,timeout=2500){
 return new Promise(resolve=>{
  if(reg?.waiting)return resolve(reg.waiting);
  let done=false;
  const finish=()=>{if(done)return;if(reg?.waiting){done=true;clearTimeout(timer);resolve(reg.waiting)}};
  const bind=worker=>{if(worker)worker.addEventListener('statechange',finish)};
  const timer=setTimeout(()=>{if(!done){done=true;resolve(reg?.waiting||null)}},timeout);
  bind(reg?.installing);
  reg?.addEventListener('updatefound',()=>{bind(reg?.installing);finish()},{once:true});
  finish()
 })
}

function updateRequiresCacheReset(info){
 return info?.clear_cache===true||info?.cache_reset===true||info?.major===true||info?.important===true
}

async function purgeNethorCaches(){
 if(!('caches' in window))return;
 try{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>/^netto-tools-v\d+$/.test(String(k))).map(k=>caches.delete(k)))
 }catch(e){console.warn('Purge cache Nethor:',e)}
}

function forcedUpdateUrl(version,url=location.href){
 const u=new URL(url,location.href);
 u.searchParams.delete('_nethor_update');
 u.searchParams.set('_nethor_update',String(version||'latest')+'-'+Date.now());
 return u.href
}

function updateControlButtons(){
 return [document.getElementById('nettoUpdateCheckBtn'),document.getElementById('nettoMobileUpdateBtn')].filter(Boolean)
}

function setManualUpdateBusy(active){
 updateControlButtons().forEach(btn=>{
  btn.disabled=!!active;
  btn.classList.toggle('checking',!!active);
  if(active)btn.setAttribute('aria-busy','true');else btn.removeAttribute('aria-busy')
 });
 const mobile=document.getElementById('nettoMobileUpdateBtn');
 const small=mobile?.querySelector('.nettoMobileMenuCopy small');
 if(small)small.textContent=active?'Vérification en cours…':'Rechercher une nouvelle version'
}

async function prepareWaitingUpdate(reg,timeout=8000){
 if(!reg)return null;
 if(reg.waiting)return reg.waiting;
 await reg.update().catch(()=>{});
 return reg.waiting||await waitForUpdateWorker(reg,timeout)
}

async function forceUpdateReload(reg,targetVersion,info,url=location.href){
 if(updateRequiresCacheReset(info))await purgeNethorCaches();
 try{await reg?.unregister?.()}catch(_){}
 try{
  sessionStorage.removeItem('nettoUpdateLater');
  sessionStorage.setItem('nettoForceUpdateVersion',String(targetVersion||''))
 }catch(_){}
 location.replace(forcedUpdateUrl(targetVersion,url))
}

async function updateCenterSnapshot(forceNetwork=false){
 if(!('serviceWorker' in navigator)){
  const info=await releaseInfo();
  return{reg:null,info,current:0,latest:Number(info.version)||APP_RELEASE,available:false,supported:false}
 }
 const reg=await navigator.serviceWorker.getRegistration().then(x=>x||navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}));
 updateRegistration=reg;
 if(forceNetwork){
  await reg.update().catch(()=>{});
  if(!reg.waiting)await waitForUpdateWorker(reg,3200)
 }
 const info=await releaseInfo();
 const active=Number(await workerVersion(navigator.serviceWorker.controller||reg.active))||0;
 const stored=Number(localStorage.getItem('nettoAppVersion')||0)||0;
 const waiting=Number(await workerVersion(reg.waiting))||0;
 const current=active||stored||APP_RELEASE;
 const latest=Math.max(Number(info.version)||APP_RELEASE,waiting);
 info.version=latest;
 return{reg,info,current,latest,waiting,available:latest>current,supported:true}
}

function closeUpdateCenter(){
 document.getElementById('nettoUpdateCenterBackdrop')?.remove();
 document.documentElement.classList.remove('nettoUpdateCenterOpen');
 document.body?.style.removeProperty('overflow')
}

function renderClassicUpdateCenter(snapshot,status=''){
 const host=document.getElementById('nettoUpdateCenterBody');if(!host)return;
 const current=snapshot.current||APP_RELEASE,latest=snapshot.latest||Number(snapshot.info?.version)||APP_RELEASE;
 const available=!!snapshot.available,major=available&&updateRequiresCacheReset(snapshot.info);
 host.innerHTML=
  '<div class="nettoUpdateHero"><img src="'+esc(snapshot.info?.icon||APP_ICON)+'" alt=""><div class="nettoUpdateHeroCopy"><strong>Nethor</strong><span>'+esc(available?'Une nouvelle version est disponible sur cet appareil.':'Cette application utilise la dernière version publiée détectée.')+'</span><span class="nettoUpdateStateBadge '+(available?'available':'ready')+'">'+(available?'Mise à jour disponible':'À jour')+'</span></div></div>'+
  '<div class="nettoUpdateVersions"><div class="nettoUpdateVersionCard"><span>Version actuelle</span><strong>'+esc(displayVersion(current))+'</strong></div><div class="nettoUpdateVersionCard"><span>Dernière version</span><strong>'+esc(displayVersion(latest,snapshot.info?.label))+'</strong></div></div>'+
  (major?'<div class="nettoUpdateMajorNotice"><strong>Mise à jour majeure</strong><br>L’ancien cache Nethor sera vidé pendant l’installation afin d’éviter qu’un ancien composant entre en conflit avec la nouvelle version.</div>':'')+
  '<div id="nettoUpdateCenterStatus" class="nettoUpdateCenterStatus">'+esc(status||(!snapshot.supported?'Les mises à jour automatiques ne sont pas prises en charge sur cet appareil.':available?'Tu peux installer cette version maintenant.':'Tu peux rechercher à nouveau une version plus récente.'))+'</div>'+
  '<div class="nettoUpdateCenterActions"><button type="button" class="nettoUpdateCenterSecondary" id="nettoUpdateCenterCloseBtn">Fermer</button><button type="button" class="nettoUpdateCenterPrimary" id="nettoUpdateCenterAction">'+(available?'Mettre à jour':'Rechercher une mise à jour')+'</button></div>';
 document.getElementById('nettoUpdateCenterCloseBtn').onclick=closeUpdateCenter;
 const action=document.getElementById('nettoUpdateCenterAction');
 if(!snapshot.supported){action.disabled=true;return}
 action.onclick=async()=>{
  if(action.disabled)return;
  action.disabled=true;
  const statusEl=document.getElementById('nettoUpdateCenterStatus');
  try{
   if(snapshot.available){
    action.textContent='Mise à jour…';
    if(statusEl)statusEl.textContent='Préparation et installation de la nouvelle version…';
    await activateWaitingUpdate(snapshot.info)
   }else{
    action.textContent='Recherche…';
    if(statusEl)statusEl.textContent='Vérification de la version publiée…';
    const fresh=await updateCenterSnapshot(true);
    renderUpdateCenter(fresh,fresh.available?'Nouvelle version détectée.':'Aucune mise à jour plus récente n’a été trouvée.')
   }
  }catch(e){
   console.warn('Centre de mise à jour:',e);
   action.disabled=false;action.textContent=snapshot.available?'Réessayer':'Rechercher une mise à jour';
   if(statusEl)statusEl.textContent='Impossible de terminer la vérification. Réessaie dans quelques instants.'
  }
 }
}

async function openClassicUpdateCenter(){
 closeDrops();ensureUpdateStyles();ensureUpdateCenterStyles();
 document.getElementById('nettoUpdateCenterBackdrop')?.remove();
 const bg=document.createElement('div');bg.id='nettoUpdateCenterBackdrop';bg.className='nettoUpdateCenterBackdrop';
 bg.innerHTML='<section class="nettoUpdateCenter" role="dialog" aria-modal="true" aria-labelledby="nettoUpdateCenterTitle"><header class="nettoUpdateCenterHead"><div><strong id="nettoUpdateCenterTitle">Mise à jour</strong><small>Version et état de Nethor sur cet appareil</small></div><button type="button" class="nettoUpdateCenterClose" aria-label="Fermer">×</button></header><div id="nettoUpdateCenterBody" class="nettoUpdateCenterBody"><div class="nettoUpdateCenterStatus">Lecture de la version installée…</div></div></section>';
 document.body.appendChild(bg);document.documentElement.classList.add('nettoUpdateCenterOpen');document.body.style.overflow='hidden';
 bg.querySelector('.nettoUpdateCenterClose').onclick=closeUpdateCenter;
 bg.onclick=e=>{if(e.target===bg&&!updateCenterIsMobile())closeUpdateCenter()};
 try{renderUpdateCenter(await updateCenterSnapshot(false))}catch(e){
  console.warn('Ouverture centre de mise à jour:',e);
  const body=document.getElementById('nettoUpdateCenterBody');if(body)body.innerHTML='<div class="nettoUpdateCenterStatus">Impossible de lire l’état des mises à jour.</div><div class="nettoUpdateCenterActions"><button type="button" class="nettoUpdateCenterSecondary" onclick="this.closest(\'.nettoUpdateCenterBackdrop\').remove()">Fermer</button><button type="button" class="nettoUpdateCenterPrimary" onclick="location.reload()">Réessayer</button></div>'
 }
}


function updateCenterIsMobile(){
 try{
  const platform=String(window.NethorPlatform?.current?.()||document.documentElement.dataset.nethorPlatform||'').toLowerCase();
  if(platform)return platform!=='desktop';
 }catch(_){}
 return window.matchMedia?.('(max-width: 650px)')?.matches===true
}

function desktopUpdateLogo(info={}){
 const custom=String(api?.siteConfig?.platform_ui?.desktop?.update_logo?.url||'').trim();
 return custom||String(info?.icon||APP_ICON)
}

function desktopUpdateSvg(kind){
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

function desktopReleaseNotes(info={}){
 const direct=Array.isArray(info.notes)?info.notes:(Array.isArray(info.changes)?info.changes:[]);
 const notes=direct.map(x=>String(x||'').trim()).filter(Boolean);
 if(!notes.length&&info.title)notes.push(String(info.title).trim());
 if(notes.length<3&&info.message){
  const message=String(info.message).trim();
  if(message&&!notes.includes(message))notes.push(message)
 }
 return notes.slice(0,3)
}

function desktopVersionLabel(value,info={},isLatest=false){
 const same=Number(value)>0&&Number(value)===Number(info.version);
 return displayVersion(value,(isLatest||same)?info.label:'')
}

function desktopVersionStrip(current,latest,info={},checking=false,available=false){
 return '<div class="nettoDesktopUpdateVersions">'+
  '<div><span>Version installée</span><strong>'+esc(desktopVersionLabel(current,info,false))+'</strong></div>'+
  '<span class="nettoDesktopUpdateArrow">'+desktopUpdateSvg('arrow')+'</span>'+
  '<div><span>'+(available?'Nouvelle version':'Dernière version')+'</span><strong class="'+(available?'isNew':'')+'">'+(checking?'—':esc(desktopVersionLabel(latest,info,true)))+'</strong></div>'+
 '</div>'
}

function renderDesktopUpdateCenter(snapshot,state='ready'){
 const host=document.getElementById('nettoUpdateCenterBody');if(!host)return;
 snapshot=snapshot||{};
 const info=snapshot.info||{};
 const current=Number(snapshot.current)||Number(localStorage.getItem('nettoAppVersion')||0)||APP_RELEASE;
 const latest=Number(snapshot.latest)||Number(info.version)||current;
 const logo=desktopUpdateLogo(info);
 const badge=state==='ready'
  ?'<span class="nettoDesktopUpdateBadge success">'+desktopUpdateSvg('check')+'</span>'
  :state==='available'
   ?'<span class="nettoDesktopUpdateBadge available">'+desktopUpdateSvg('up')+'</span>'
   :state==='error'
    ?'<span class="nettoDesktopUpdateBadge error">'+desktopUpdateSvg('alert')+'</span>'
    :'';
 const logoHtml='<div class="nettoDesktopUpdateLogoWrap"><img src="'+esc(logo)+'" alt="Logo Nethor">'+badge+'</div>';

 if(state==='checking'){
  host.innerHTML='<div class="nettoDesktopUpdateMain">'+logoHtml+
   '<h2>Vérification en cours...</h2><p class="nettoDesktopUpdateLead">Recherche de la dernière version disponible.</p>'+
   '<div class="nettoDesktopUpdateChecking"><span class="nettoDesktopUpdateSpinner"></span><strong>Vérification de la dernière version...</strong></div>'+
   desktopVersionStrip(current,latest,info,true,false)+
   '<button type="button" class="nettoDesktopUpdateAction disabled" disabled><span class="nettoDesktopUpdateMutedRefresh">'+desktopUpdateSvg('refresh')+'</span>Vérification en cours...</button></div>';
  return
 }

 if(state==='error'){
  host.innerHTML='<div class="nettoDesktopUpdateMain">'+logoHtml+
   '<h2>Impossible de vérifier les mises à jour</h2><p class="nettoDesktopUpdateLead">Une erreur est survenue lors de la vérification.<br>Veuillez réessayer dans quelques instants.</p>'+
   '<div class="nettoDesktopUpdateWarning"><span>'+desktopUpdateSvg('warning')+'</span><p>Vérifiez votre connexion internet<br>ou réessayez plus tard.</p></div>'+
   '<button type="button" class="nettoDesktopUpdateAction primary" id="nettoDesktopUpdateRetry">'+desktopUpdateSvg('refresh')+'Réessayer</button></div>';
  document.getElementById('nettoDesktopUpdateRetry').onclick=()=>desktopRunUpdateCheck(snapshot);
  return
 }

 if(state==='available'){
  const notes=desktopReleaseNotes(info);
  host.innerHTML='<div class="nettoDesktopUpdateMain">'+logoHtml+
   '<h2>Une mise à jour est disponible</h2><p class="nettoDesktopUpdateLead">Une nouvelle version de Nethor est prête à être installée.</p>'+
   desktopVersionStrip(current,latest,info,false,true)+
   '<div class="nettoDesktopUpdateNews"><span class="nettoDesktopUpdateNewsIcon">'+desktopUpdateSvg('document')+'</span><div><strong>Nouveautés</strong><ul>'+(notes.length?notes.map(x=>'<li>'+esc(x)+'</li>').join(''):'<li>Améliorations et optimisations de Nethor</li>')+'</ul></div></div>'+
   '<div class="nettoDesktopUpdateSplitActions"><button type="button" class="nettoDesktopUpdateLater" id="nettoDesktopUpdateLater">Plus tard</button><button type="button" class="nettoDesktopUpdateAction primary" id="nettoDesktopUpdateInstall">'+desktopUpdateSvg('download')+'Mettre à jour Nethor</button></div></div>';
  document.getElementById('nettoDesktopUpdateLater').onclick=()=>{try{sessionStorage.setItem('nettoUpdateLater',String(latest))}catch(_){};closeUpdateCenter()};
  const install=document.getElementById('nettoDesktopUpdateInstall');
  install.onclick=async()=>{
   if(install.disabled)return;
   install.disabled=true;install.innerHTML=desktopUpdateSvg('download')+'Mise à jour...';
   try{await activateWaitingUpdate(info)}
   catch(e){console.warn('Installation mise à jour Desktop:',e);renderDesktopUpdateCenter(snapshot,'error')}
  };
  return
 }

 host.innerHTML='<div class="nettoDesktopUpdateMain">'+logoHtml+
  '<h2>Nethor est à jour</h2><p class="nettoDesktopUpdateLead">Vous utilisez la dernière version disponible.</p>'+
  desktopVersionStrip(current,latest,info,false,false)+
  '<div class="nettoDesktopUpdateLastCheck"><i></i><span>Dernière vérification : à l’instant</span></div>'+
  '<button type="button" class="nettoDesktopUpdateAction outline" id="nettoDesktopUpdateCheck">'+desktopUpdateSvg('refresh')+'Vérifier à nouveau</button></div>';
 document.getElementById('nettoDesktopUpdateCheck').onclick=()=>desktopRunUpdateCheck(snapshot)
}

function renderUpdateCenter(snapshot,status=''){
 if(updateCenterIsMobile())return renderClassicUpdateCenter(snapshot,status);
 const state=status==='checking'?'checking':status==='error'?'error':snapshot?.available?'available':'ready';
 renderDesktopUpdateCenter(snapshot,state)
}

async function desktopNetworkSnapshot(){
 const response=await fetch('app-version.json?desktop_update='+Date.now(),{cache:'no-store'});
 if(!response.ok)throw new Error('HTTP '+response.status);
 const networkInfo=await response.json();
 rememberReleaseLabel(networkInfo.version,networkInfo.label);
 const fresh=await updateCenterSnapshot(true);
 const manifestVersion=Number(networkInfo.version)||Number(fresh.latest)||APP_RELEASE;
 fresh.info={...(fresh.info||{}),...networkInfo,label:displayVersion(manifestVersion,networkInfo.label)};
 fresh.latest=Math.max(manifestVersion,Number(fresh.waiting)||0);
 fresh.info.version=fresh.latest;
 fresh.available=fresh.latest>Number(fresh.current||0);
 return fresh
}

async function desktopRunUpdateCheck(snapshot={}){
 renderDesktopUpdateCenter(snapshot,'checking');
 try{
  const fresh=await desktopNetworkSnapshot();
  if(fresh.supported===false)throw new Error('Mises à jour non prises en charge');
  renderDesktopUpdateCenter(fresh,fresh.available?'available':'ready')
 }catch(e){
  console.warn('Vérification mise à jour Desktop:',e);
  renderDesktopUpdateCenter(snapshot,'error');
  sounds.play('error')
 }
}

async function openUpdateCenter(){
 if(updateCenterIsMobile())return openClassicUpdateCenter();
 closeDrops();ensureUpdateStyles();ensureUpdateCenterStyles();
 document.getElementById('nettoUpdateCenterBackdrop')?.remove();
 const bg=document.createElement('div');bg.id='nettoUpdateCenterBackdrop';bg.className='nettoUpdateCenterBackdrop nettoDesktopUpdateBackdrop';
 bg.innerHTML='<section class="nettoUpdateCenter nettoDesktopUpdateCenter" role="dialog" aria-modal="true" aria-labelledby="nettoUpdateCenterTitle"><header class="nettoDesktopUpdateHead"><div class="nettoDesktopUpdateHeadTitle"><i></i><div><strong id="nettoUpdateCenterTitle">Mise à jour Nethor</strong><small>Version et état de l’application</small></div></div><button type="button" class="nettoUpdateCenterClose" aria-label="Fermer">×</button></header><div id="nettoUpdateCenterBody" class="nettoUpdateCenterBody"></div></section>';
 document.body.appendChild(bg);document.documentElement.classList.add('nettoUpdateCenterOpen');document.body.style.overflow='hidden';
 bg.querySelector('.nettoUpdateCenterClose').onclick=closeUpdateCenter;
 bg.onclick=e=>{if(e.target===bg)closeUpdateCenter()};
 const current=Number(localStorage.getItem('nettoAppVersion')||0)||APP_RELEASE;
 await desktopRunUpdateCheck({info:{},current,latest:0,available:false,supported:true})
}

async function manualCheckForUpdates(){
 if(updateControlButtons().some(btn=>btn.classList.contains('checking')))return;
 const confirmed=await askUpdateSearch();
 if(!confirmed)return;
 setManualUpdateBusy(true);sounds.play('tap');
 try{
  if(!('serviceWorker' in navigator)){mobilePreviewNotice('Mises à jour non prises en charge');return}
  mobilePreviewNotice('Vérification de la version publiée…');

  const regPromise=navigator.serviceWorker.getRegistration().then(reg=>reg||navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}));
  const [info,reg]=await Promise.all([releaseInfo(),regPromise]);
  updateRegistration=reg;

  const manifestVersion=Number(info.version)||APP_RELEASE;
  const stored=Number(localStorage.getItem('nettoAppVersion')||0)||0;

  // Toujours interroger le réseau avant d'annoncer que l'application est à jour.
  // C'est important sur iOS/PWA où une registration peut rester active longtemps.
  await reg.update().catch(()=>{});
  if(!reg.waiting)await waitForUpdateWorker(reg,3200);

  const active=Number(await workerVersion(navigator.serviceWorker.controller||reg.active))||0;
  const current=active||stored||0;
  const waitingVersion=Number(await workerVersion(reg.waiting))||0;
  const latest=Math.max(manifestVersion,waitingVersion);

  if(reg.waiting&&latest>current){
   sessionStorage.removeItem('nettoUpdateLater');
   await showUpdateAvailable(reg,latest,true);
   mobilePreviewNotice('Mise à jour disponible : '+displayVersion(latest,info.label));
   return
  }

  // Le manifeste peut être plus récent avant que le navigateur ait fini
  // d'installer le nouveau worker. On affiche quand même la mise à jour :
  // l'acceptation forcera sa préparation puis son activation.
  if(manifestVersion>current){
   sessionStorage.removeItem('nettoUpdateLater');
   await showUpdateAvailable(reg,manifestVersion,true);
   mobilePreviewNotice('Mise à jour disponible : '+displayVersion(manifestVersion,info.label));
   return
  }

  const installed=Math.max(current,waitingVersion);
  if(installed>0)try{localStorage.setItem('nettoAppVersion',String(installed))}catch(_){}
  mobilePreviewNotice('Nethor est à jour - '+displayVersion(installed||manifestVersion,installed===manifestVersion?info.label:''));
  sounds.play('update')
 }catch(e){
  console.warn('Recherche de mise à jour:',e);
  mobilePreviewNotice('Impossible de vérifier les mises à jour');
  sounds.play('error')
 }finally{
  setManualUpdateBusy(false)
 }
}

function workerVersion(worker){
 return new Promise(resolve=>{
  if(!worker){resolve(null);return}
  const ch=new MessageChannel(),timer=setTimeout(()=>resolve(null),1200);
  ch.port1.onmessage=e=>{clearTimeout(timer);resolve(Number(e.data&&e.data.version)||null)};
  try{worker.postMessage({type:'GET_VERSION'},[ch.port2])}catch(_){clearTimeout(timer);resolve(null)}
 })
}

function publicUpdateCopy(){
 return {
  title:'Nouvelle version de Nethor',
  message:'Cette mise à jour apporte plusieurs améliorations, correctifs et optimisations générales.'
 }
}

function updateInstallMode(info){return String(info?.mode||'manual').toLowerCase()==='auto'?'auto':'manual'}

async function releaseInfo(){
 try{
  const r=await fetch('app-version.json?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));
  const info=await r.json();rememberReleaseLabel(info.version,info.label);
  return{...info,label:displayVersion(info.version,info.label),mode:updateInstallMode(info)}
 }catch(_){
  const copy=publicUpdateCopy();return{version:APP_RELEASE,label:APP_RELEASE_LABEL,important:true,mode:'manual',title:copy.title,message:copy.message,icon:APP_ICON}
 }
}

async function notifyUpdateSystem(){
 /* Les mises à jour Nethor ne doivent jamais déclencher de notification système/push. */
 return
}

function hideUpdateToast(){
 const el=document.getElementById('nettoUpdateToast');if(!el)return;el.classList.remove('show');setTimeout(()=>el.remove(),220)
}

function setUpdateProgress(value,label){
 const wrap=document.getElementById('nettoUpdateProgressWrap'),fill=document.getElementById('nettoUpdateProgressFill'),text=document.getElementById('nettoUpdateProgressLabel'),val=document.getElementById('nettoUpdateProgressValue');
 if(wrap)wrap.classList.remove('hidden');
 const safe=Math.max(0,Math.min(100,Math.round(Number(value)||0)));
 if(fill)fill.style.width=safe+'%';
 if(val)val.textContent=safe+'%';
 if(text&&label)text.textContent=label
}

function showUpdateSuccess(message='Nethor a bien été mis à jour'){
 const toast=document.getElementById('nettoUpdateToast'),done=document.getElementById('nettoUpdateProgressDone');
 setUpdateProgress(100,'Mise à jour terminée');
 toast?.classList.remove('updating');toast?.classList.add('updated');
 if(done){done.textContent=message;done.classList.remove('hidden')}
 sounds.play('update')
}

function startUpdateProgress(){
 let i=0,stopped=false;
 const steps=[5,9,14,20,27,34,42,50,58,65,71,76,81,85,88,90];
 setUpdateProgress(0,'Préparation de la mise à jour…');
 const timer=setInterval(()=>{
  if(stopped||i>=steps.length)return;
  const value=steps[i++];
  setUpdateProgress(value,value<70?'Téléchargement de la mise à jour…':'Installation en cours…')
 },260);
 return{
  stop(){stopped=true;clearInterval(timer)},
  finalize(){stopped=true;clearInterval(timer);setUpdateProgress(94,'Finalisation de la mise à jour…')}
 }
}

async function activateWaitingUpdate(info){
 const reg=updateRegistration||await navigator.serviceWorker.getRegistration();
 if(!reg){mobilePreviewNotice('Service de mise à jour indisponible');return false}

 const toast=document.getElementById('nettoUpdateToast'),btn=document.getElementById('nettoUpdateNow'),later=document.getElementById('nettoUpdateLater'),centerBtn=document.getElementById('nettoUpdateCenterAction'),centerStatus=document.getElementById('nettoUpdateCenterStatus');
 toast?.classList.add('updating');
 if(btn){btn.disabled=true;btn.textContent='Mise à jour…'}
 if(centerBtn){centerBtn.disabled=true;centerBtn.textContent='Mise à jour…'}
 if(centerStatus)centerStatus.textContent='Préparation et installation de la nouvelle version…';
 if(later)later.disabled=true;

 const progress=startUpdateProgress();
 let worker=reg.waiting;
 const advertised=Number(info?.version)||APP_RELEASE;
 if(!worker){
  setUpdateProgress(8,'Préparation de la nouvelle version…');
  worker=await prepareWaitingUpdate(reg,8000)
 }

 const workerV=Number(await workerVersion(worker))||0;
 const targetVersion=Math.max(advertised,workerV,APP_RELEASE);
 let finished=false;

 const complete=async()=>{
  if(finished)return;finished=true;progress.stop();
  if(updateRequiresCacheReset(info)){
   setUpdateProgress(97,'Nettoyage de l’ancienne version…');
   await purgeNethorCaches()
  }
  try{
   localStorage.setItem('nettoAppVersion',String(targetVersion));
   localStorage.setItem('nettoAppUpdatedAt',new Date().toISOString())
  }catch(_){}
  syncAppIconLinks();showUpdateSuccess(updateRequiresCacheReset(info)?'Mise à jour majeure installée · cache renouvelé':'Nethor a bien été mis à jour');
  const centerStatus=document.getElementById('nettoUpdateCenterStatus');if(centerStatus)centerStatus.textContent=updateRequiresCacheReset(info)?'Mise à jour installée. Ancien cache supprimé. Redémarrage…':'Mise à jour installée. Redémarrage…';
  setTimeout(()=>location.replace(forcedUpdateUrl(targetVersion)),700)
 };

 if(!worker){
  const current=Number(await workerVersion(navigator.serviceWorker.controller||reg.active))||0;
  if(current>=targetVersion){await complete();return true}
  setUpdateProgress(94,'Redémarrage forcé de Nethor…');
  setTimeout(()=>forceUpdateReload(reg,targetVersion,info),180);
  return true
 }

 navigator.serviceWorker.addEventListener('controllerchange',()=>{void complete()},{once:true});
 setTimeout(()=>{if(!finished)progress.finalize()},3600);
 setTimeout(async()=>{
  if(finished)return;
  const current=Number(await workerVersion(navigator.serviceWorker.controller))||0;
  if(current>=targetVersion){await complete();return}
  setUpdateProgress(96,'Activation forcée de la nouvelle version…');
  await forceUpdateReload(reg,targetVersion,info)
 },9500);

 worker.postMessage({type:updateRequiresCacheReset(info)?'PURGE_CACHES_AND_SKIP_WAITING':'SKIP_WAITING'});
 return true
}

async function showUpdateAvailable(reg,forcedVersion=0,force=false){
 updateRegistration=reg||updateRegistration;
 const info=await releaseInfo(),waitingVersion=await workerVersion(updateRegistration?.waiting);
 const version=Math.max(Number(info.version)||APP_RELEASE,Number(forcedVersion)||0,waitingVersion||0);
 info.version=version;
 if(updateInstallMode(info)==='auto'){await activateWaitingUpdate(info);return}
 if(!force&&sessionStorage.getItem('nettoUpdateLater')===String(version))return;
 if(!updateCenterIsMobile()){
  ensureUpdateStyles();closeDrops();
  document.getElementById('nettoUpdateCenterBackdrop')?.remove();
  const bg=document.createElement('div');bg.id='nettoUpdateCenterBackdrop';bg.className='nettoUpdateCenterBackdrop nettoDesktopUpdateBackdrop';
  bg.innerHTML='<section class="nettoUpdateCenter nettoDesktopUpdateCenter" role="dialog" aria-modal="true" aria-labelledby="nettoUpdateCenterTitle"><header class="nettoDesktopUpdateHead"><div class="nettoDesktopUpdateHeadTitle"><i></i><div><strong id="nettoUpdateCenterTitle">Mise à jour Nethor</strong><small>Version et état de l’application</small></div></div><button type="button" class="nettoUpdateCenterClose" aria-label="Fermer">×</button></header><div id="nettoUpdateCenterBody" class="nettoUpdateCenterBody"></div></section>';
  document.body.appendChild(bg);document.documentElement.classList.add('nettoUpdateCenterOpen');document.body.style.overflow='hidden';
  bg.querySelector('.nettoUpdateCenterClose').onclick=closeUpdateCenter;bg.onclick=e=>{if(e.target===bg)closeUpdateCenter()};
  const active=Number(await workerVersion(navigator.serviceWorker.controller||updateRegistration?.active))||0;
  const stored=Number(localStorage.getItem('nettoAppVersion')||0)||0;
  const current=active||stored||APP_RELEASE;
  renderDesktopUpdateCenter({reg:updateRegistration,info,current,latest:version,waiting:waitingVersion,available:version>current,supported:true},version>current?'available':'ready');
  sounds.play('notification');return
 }
 const existing=document.getElementById('nettoUpdateToast');
 if(existing){if(!force)return;existing.remove()}
 ensureUpdateStyles();
 const el=document.createElement('aside');el.id='nettoUpdateToast';el.className='nettoUpdateToast';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
 const copy=publicUpdateCopy(),major=updateRequiresCacheReset(info);
 const message=major?'Mise à jour majeure : l’ancien cache Nethor sera vidé avant le redémarrage pour éviter les collisions.':copy.message;
 el.innerHTML='<div class="nettoUpdateTop"><img class="nettoUpdateIcon" src="'+esc(info.icon||APP_ICON)+'" alt=""><div class="nettoUpdateCopy"><strong>'+esc(copy.title)+'</strong><span>'+esc(message)+'</span><span class="nettoUpdateVersion">'+esc(displayVersion(version,info.label))+(major?' • majeure':' • dernière version')+'</span></div></div><div id="nettoUpdateProgressWrap" class="nettoUpdateProgressWrap hidden"><div class="nettoUpdateProgressHead"><span id="nettoUpdateProgressLabel" class="nettoUpdateProgressLabel">Préparation de la mise à jour…</span><strong id="nettoUpdateProgressValue" class="nettoUpdateProgressValue">0%</strong></div><div class="nettoUpdateProgressBar" aria-hidden="true"><div id="nettoUpdateProgressFill" class="nettoUpdateProgressFill"></div></div><div id="nettoUpdateProgressDone" class="nettoUpdateProgressDone hidden">Nethor a bien été mis à jour</div></div><div class="nettoUpdateActions"><button type="button" class="nettoUpdateLater" id="nettoUpdateLater">Plus tard</button><button type="button" class="nettoUpdateNow" id="nettoUpdateNow">Mettre à jour</button></div>';
 document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));sounds.play('notification');
 document.getElementById('nettoUpdateLater').onclick=()=>{sessionStorage.setItem('nettoUpdateLater',String(version));hideUpdateToast()};
 document.getElementById('nettoUpdateNow').onclick=()=>{void activateWaitingUpdate(info)};
 notifyUpdateSystem(reg,info)
}

window.NethorProfileFeatures.update=Object.freeze({
 manualCheck:manualCheckForUpdates,
 openCenter:openUpdateCenter,
 closeCenter:closeUpdateCenter,
 showAvailable:showUpdateAvailable,
 activate:activateWaitingUpdate,
 workerVersion
});
})();
