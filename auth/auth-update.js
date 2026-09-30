/* Nethor Auth — contrôle et activation des mises à jour, Phase 4.20 */
function displayVersion(value,label=''){
 const normalized=String(label||'').trim();
 if(/^v?\d+\.\d+\.\d+$/i.test(normalized))return normalized.startsWith('v')?normalized:'v'+normalized;
 const n=Math.max(0,Math.trunc(Number(value)||0)),major=Math.floor(n/100),minor=String(n%100).padStart(2,'0');
 return 'v'+major+'.'+minor
}
function readWorkerVersion(worker){
 return new Promise(resolve=>{
  if(!worker){resolve(0);return}
  const ch=new MessageChannel(),timer=setTimeout(()=>resolve(0),900);
  ch.port1.onmessage=e=>{clearTimeout(timer);resolve(Number(e.data?.version)||0)};
  try{worker.postMessage({type:'GET_VERSION'},[ch.port2])}catch(_){clearTimeout(timer);resolve(0)}
 })
}
async function installedAppVersion(){
 try{
  if('serviceWorker' in navigator){
   const reg=await navigator.serviceWorker.getRegistration().catch(()=>null);
   const active=navigator.serviceWorker.controller||reg?.active;
   const activeVersion=await readWorkerVersion(active);
   if(activeVersion>0)return activeVersion
  }
  const stored=Number(localStorage.getItem('nettoAppVersion')||0)||0;
  if(stored>0)return stored;
  let found=0;
  if('caches' in window){const keys=await caches.keys();for(const key of keys){const m=String(key).match(/^netto-tools-v(\d+)$/);if(m)found=Math.max(found,Number(m[1])||0)}}
  return found
 }catch(_){return 0}
}
function waitForWaitingWorker(reg,timeout=3500){
 return new Promise(resolve=>{
  if(reg?.waiting)return resolve(reg.waiting);
  let done=false,timer=setTimeout(()=>{if(!done){done=true;resolve(reg?.waiting||null)}},timeout);
  const finish=()=>{if(done)return;if(reg?.waiting){done=true;clearTimeout(timer);resolve(reg.waiting)}};
  const bind=worker=>{if(!worker)return;worker.addEventListener('statechange',finish)};
  bind(reg?.installing);
  const onUpdate=()=>{bind(reg?.installing);finish()};
  reg?.addEventListener('updatefound',onUpdate,{once:true});
  finish()
 })
}
function loginUpdateRequiresCacheReset(info){
 return info?.clear_cache===true||info?.cache_reset===true||info?.major===true||info?.important===true
}
async function purgeLoginNethorCaches(){
 if(!('caches' in window))return;
 try{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>/^netto-tools-v\d+$/.test(String(k))).map(k=>caches.delete(k)))
 }catch(e){console.warn('Purge cache Nethor:',e)}
}
function loginForcedTarget(target,version){
 const u=new URL(target,location.href);
 u.searchParams.delete('_nethor_update');
 u.searchParams.set('_nethor_update',String(version||'latest')+'-'+Date.now());
 return u.href
}
function loginUpdatePrompt(info){
 return new Promise(resolve=>{
  document.getElementById('loginUpdatePrompt')?.remove();
  const overlay=document.createElement('div');overlay.id='loginUpdatePrompt';overlay.style.cssText='position:fixed;inset:0;z-index:2147483600;background:rgba(12,13,15,.72);backdrop-filter:blur(12px);display:grid;place-items:center;padding:18px';
  const card=document.createElement('div');card.style.cssText='width:min(92vw,460px);background:var(--card,#fff);color:var(--text,#171717);border:1px solid var(--line,#e4e4e7);border-radius:24px;padding:22px;box-shadow:0 28px 90px rgba(0,0,0,.34)';
  card.innerHTML='<div style="display:flex;gap:13px;align-items:flex-start"><img src="'+esc(info.icon||'assets/app-icon-v63.svg')+'" alt="" style="width:54px;height:54px;border-radius:15px;background:#222;object-fit:cover;flex:none"><div style="min-width:0"><div style="font-size:10px;font-weight:900;letter-spacing:.8px;color:#f1532e;text-transform:uppercase">Mise à jour disponible</div><strong style="display:block;margin-top:4px;font-size:20px;line-height:1.15">'+esc('Nouvelle version de Nethor')+'</strong><span style="display:block;margin-top:7px;font-size:12px;line-height:1.5;color:var(--muted,#747474)">'+esc(loginUpdateRequiresCacheReset(info)?'Mise à jour majeure : le cache Nethor sera renouvelé pour éviter les conflits avec l’ancienne version.':'Cette mise à jour apporte plusieurs améliorations, correctifs et optimisations générales.')+'</span><b style="display:inline-block;margin-top:10px;padding:5px 9px;border-radius:999px;background:#ff5a2a14;color:#e64a27;font-size:10px">'+esc(displayVersion(info.version,info.label))+'</b></div></div><div style="display:grid;grid-template-columns:1fr 1.35fr;gap:9px;margin-top:20px"><button id="loginUpdateLater" type="button" style="min-height:44px;border-radius:13px;background:#eceef1;color:#333;font-weight:850">Plus tard</button><button id="loginUpdateNow" type="button" style="min-height:44px;border-radius:13px;background:linear-gradient(135deg,#ff4129,#ff8426);color:#fff;font-weight:900;box-shadow:0 8px 22px rgba(255,80,34,.25)">Mettre à jour</button></div>';
  overlay.appendChild(card);document.body.appendChild(overlay);window.NettoSounds?.play?.('notification');
  document.getElementById('loginUpdateLater').onclick=()=>{overlay.remove();resolve('later')};
  document.getElementById('loginUpdateNow').onclick=()=>resolve('update')
 })
}
async function checkLatestVersionAtLogin(target){
 if(!('serviceWorker' in navigator))return true;
 let info;
 try{const r=await fetch('app-version.json?login='+Date.now(),{cache:'no-store'});if(!r.ok)return true;info=await r.json()}catch(_){return true}
 const latest=Number(info?.version)||0;if(!latest)return true;
 const installed=await installedAppVersion();
 if(installed>=latest){try{localStorage.setItem('nettoAppVersion',String(installed))}catch(_){};return true}

 const mode=String(info?.mode||'manual').toLowerCase()==='auto'?'auto':'manual';
 const choice=mode==='auto'?'update':await loginUpdatePrompt(info);
 if(choice!=='update')return true;

 const btn=document.getElementById('loginUpdateNow');if(btn){btn.disabled=true;btn.textContent='Mise à jour…'}

 let reg=null,worker=null;
 try{
  reg=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
  await reg.update().catch(()=>{});
  worker=reg.waiting||await waitForWaitingWorker(reg,8000)
 }catch(e){console.warn('Préparation mise à jour connexion:',e)}

 const waitingVersion=await readWorkerVersion(worker),targetVersion=Math.max(latest,waitingVersion||0);
 info.version=targetVersion;

 let moved=false;
 const go=async()=>{
  if(moved)return;moved=true;
  if(loginUpdateRequiresCacheReset(info))await purgeLoginNethorCaches();
  try{
   localStorage.setItem('nettoAppVersion',String(targetVersion));
   localStorage.setItem('nettoAppUpdatedAt',new Date().toISOString())
  }catch(_){}
  location.replace(loginForcedTarget(target,targetVersion))
 };

 if(!worker){
  if(loginUpdateRequiresCacheReset(info))await purgeLoginNethorCaches();
  try{await reg?.unregister?.()}catch(_){}
  await go();
  return false
 }

 navigator.serviceWorker.addEventListener('controllerchange',()=>{void go()},{once:true});
 worker.postMessage({type:loginUpdateRequiresCacheReset(info)?'PURGE_CACHES_AND_SKIP_WAITING':'SKIP_WAITING'});
 setTimeout(()=>{void go()},9000);
 return false
}
