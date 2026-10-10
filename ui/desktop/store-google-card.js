(function(){
'use strict';
if(window.NethorStoreGoogleCard)return;

const MAPS_URL='https://www.google.com/maps/search/?api=1&query=Netto%20Le%20Thor&query_place_id=ChIJSY7JsE71tRIRRSih3toBniY';
const VERIFIED_ADDRESS='150 chemin Saint-Michel, 84250 Le Thor';
const VERIFIED_PHONE='04 90 01 34 23';
const MUNICIPAL_URL='https://www.ville-lethor.fr/contacts/netto/';
const FRESH_MS=60000;
// Paris local time; Sunday=0 ... Saturday=6. No Google status is inferred as live.
const WEEKLY_HOURS=Object.freeze([
 Object.freeze({open:'09:00',close:'12:30'}),  // dimanche
 ...Array.from({length:6},()=>Object.freeze({open:'08:00',close:'20:00'})) // lundi - samedi
]);
let popup=null,trigger=null,lastData=null,lastFetch=0,pending=null,revision=0,autoRefresh=null,fallbackClock=null;

function safeMapsUrl(value){
 try{
  const url=new URL(String(value||''));
  if(url.protocol==='https:'&&/(^|\.)google\.(com|fr)$/.test(url.hostname))return url.href;
 }catch(_){}
 return MAPS_URL;
}
function parisTime(iso){
 if(!iso)return'';
 const date=new Date(iso);
 if(!Number.isFinite(date.getTime()))return'';
 return new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);
}
function parisOpeningState(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{
  timeZone:'Europe/Paris',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
 }).formatToParts(now);
 const part=key=>parts.find(item=>item.type===key)?.value||'';
 const dayIndex={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6}[part('weekday')];
 const hour=Number(part('hour')),minute=Number(part('minute'));
 if(dayIndex===undefined||!Number.isFinite(hour)||!Number.isFinite(minute))return null;
 const today=WEEKLY_HOURS[dayIndex],tomorrow=WEEKLY_HOURS[(dayIndex+1)%7];
 const toMinutes=value=>{const [h,m]=value.split(':').map(Number);return h*60+m};
 const current=hour*60+minute,start=toMinutes(today.open),end=toMinutes(today.close);
 const open=current>=start&&current<end;
 return {
  open,
  today:today.open+' – '+today.close,
  message:open?'Ferme à '+today.close:(current<start?'Ouvre aujourd’hui à '+today.open:'Ouvre demain à '+tomorrow.open)
 };
}
function todayHours(){
 return parisOpeningState()?.today||'Horaires indisponibles';
}
function googleTodayHours(weekdayDescriptions){
 if(!Array.isArray(weekdayDescriptions))return'';
 const today=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',weekday:'long'}).format(new Date()).toLowerCase();
 const normalize=x=>String(x||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const key=normalize(today);
 const match=weekdayDescriptions.find(line=>{
  const normalized=normalize(line);
  return normalized.startsWith(key+':')||normalized.startsWith(key+' ');
 });
 if(!match)return'';
 const value=String(match).replace(/^[^:]+:\s*/, '').trim();
 return value&&value.length<100?value:'';
}
function text(selector,value){
 const el=popup?.querySelector(selector);
 if(el)el.textContent=String(value??'');
}
function position(){
 if(!popup||!trigger)return;
 const r=trigger.getBoundingClientRect(),vw=document.documentElement.clientWidth||window.innerWidth,vh=window.innerHeight;
 const w=Math.min(414,vw-24),left=Math.max(12,Math.min(r.left,vw-w-12));
 const bottomSpace=vh-r.bottom-16,above=bottomSpace<300&&r.top>340;
 popup.style.width=w+'px';
 popup.style.left=left+'px';
 popup.style.top=(above?Math.max(10,r.top-Math.min(490,vh-24)-8):Math.min(vh-90,r.bottom+10))+'px';
 popup.style.maxHeight=(above?Math.max(180,r.top-20):Math.max(170,vh-r.bottom-22))+'px';
}
function fallback(){
 if(!popup)return;
 text('[data-store-address]',VERIFIED_ADDRESS);
 text('[data-store-phone]',VERIFIED_PHONE);
 const phone=popup.querySelector('[data-store-phone-link]');
 if(phone)phone.href='tel:+33490013423';
 const state=parisOpeningState();
 const indicator=popup.querySelector('[data-store-status-pill]');
 if(indicator)indicator.dataset.status=state?(state.open?'open':'closed'):'unknown';
 text('[data-store-status]',state?(state.open?'Ouvert · horaires habituels':'Fermé · horaires habituels'):'Statut Google indisponible');
 text('[data-store-status-info]',state?state.message+' · non vérifié en direct':'Ouverture en direct non vérifiée');
 text('[data-store-hours]','Horaires habituels aujourd’hui : '+todayHours());
 text('[data-store-source]','Statut estimé selon les horaires habituels · Google indisponible');
 text('[data-store-updated]','');
 const src=popup.querySelector('[data-store-source-link]');
 if(src){src.href=MUNICIPAL_URL;src.textContent='Source officielle'}
}
function render(data){
 if(!popup)return;
 if(!data||data.source!=='google_places'||data.verified!==true){fallback();return}
 const address=String(data.address||VERIFIED_ADDRESS),phone=String(data.phone||VERIFIED_PHONE);
 text('[data-store-address]',address);
 text('[data-store-phone]',phone);
 const phoneLink=popup.querySelector('[data-store-phone-link]');
 if(phoneLink)phoneLink.href='tel:'+phone.replace(/[^+\d]/g,'');
 const pill=popup.querySelector('[data-store-status-pill]');
 let status='unknown',statusText='Statut indisponible',detail='Google ne fournit pas le statut actuel';
 if(data.business_status==='CLOSED_PERMANENTLY'){
  status='closed';statusText='Fermé définitivement';detail='Selon Google Maps';
 }else if(data.business_status==='CLOSED_TEMPORARILY'){
  status='closed';statusText='Fermé temporairement';detail='Selon Google Maps';
 }else if(data.open_now===true){
  status='open';statusText='Ouvert';
  detail=data.next_close_time?'Ferme à '+parisTime(data.next_close_time):'Fermeture non renseignée';
 }else if(data.open_now===false){
  status='closed';statusText='Fermé';
  detail=data.next_open_time?'Prochaine ouverture à '+parisTime(data.next_open_time):'Prochaine ouverture non renseignée';
 }else{
  // Google responded but did not provide an opening state: use the same
  // indicative timetable as when the Google API itself is unavailable.
  const indicative=parisOpeningState();
  if(indicative){
   status=indicative.open?'open':'closed';
   statusText=indicative.open?'Ouvert · horaires habituels':'Fermé · horaires habituels';
   detail=indicative.message+' · non vérifié en direct';
  }
 }
 if(pill)pill.dataset.status=status;
 text('[data-store-status]',statusText);
 text('[data-store-status-info]',detail);
 const todayGoogle=googleTodayHours(data.weekday_descriptions);
 const googleStatusKnown=data.open_now===true||data.open_now===false||data.business_status==='CLOSED_PERMANENTLY'||data.business_status==='CLOSED_TEMPORARILY';
 text('[data-store-hours]',googleStatusKnown&&todayGoogle?'Horaires Google aujourd’hui : '+todayGoogle:'Horaires habituels aujourd’hui : '+todayHours());
 text('[data-store-source]',googleStatusKnown?(data.address&&data.phone?'Adresse, téléphone et statut : Google Maps':'Statut Google Maps · coordonnées complétées depuis la ville du Thor'):'Statut estimé selon les horaires habituels · Google sans indication d’ouverture');
 const src=popup.querySelector('[data-store-source-link]');
 if(src){src.href=safeMapsUrl(data.maps_url);src.textContent='Données Google Maps'}
 const map=safeMapsUrl(data.maps_url);
 popup.querySelectorAll('[data-store-maps]').forEach(link=>{link.href=map});
 let fetched='';
 if(data.fetched_at){const d=new Date(data.fetched_at);if(Number.isFinite(d.getTime()))fetched='Données consultées à '+parisTime(data.fetched_at)}
 text('[data-store-updated]',fetched);
}
function setLoading(value){
 if(popup)popup.classList.toggle('is-loading',Boolean(value));
 const btn=popup?.querySelector('[data-store-refresh]');
 if(btn){btn.disabled=!!value;btn.setAttribute('aria-busy',String(!!value))}
}
function showError(){
 if(!popup)return;
 // Drop any previously fetched opening status after a failed revalidation.
 lastData=null;lastFetch=0;
 fallback();
 text('[data-store-updated]',navigator.onLine===false?'Hors connexion : statut Google indisponible':'Mise à jour Google indisponible pour le moment');
}
async function refresh(force){
 if(!popup||!trigger)return;
 if(navigator.onLine===false){showError();return}
 if(!force&&lastData&&Date.now()-lastFetch<FRESH_MS){render(lastData);return}
 if(pending)return pending;
 const api=window.NettoProfileUI,client=api?.client;
 if(!client?.functions?.invoke){showError();return}
 setLoading(true);
 const current=++revision;
 pending=(async()=>{
  try{
   const {data,error}=await client.functions.invoke('store-google-details',{body:{}});
   if(error||data?.source!=='google_places'||data?.verified!==true)throw error||new Error(data?.error||'Google unavailable');
   if(current!==revision||!popup)return;
   lastData=data;lastFetch=Date.now();render(data);
  }catch(e){
   if(current!==revision||!popup)return;
   console.info('[Nethor] Fiche Google du point de vente indisponible:',e?.message||e);
   showError();
  }finally{
   pending=null;
   if(current===revision)setLoading(false);
  }
 })();
 return pending;
}
function ensurePopup(){
 if(popup?.isConnected)return popup;
 const panel=document.createElement('section');
 panel.id='nethorDesktopStorePopover';
 panel.className='nethorDesktopStorePopover';
 panel.setAttribute('role','dialog');
 panel.setAttribute('aria-modal','false');
 panel.setAttribute('aria-label','Fiche du point de vente Netto Le Thor');
 panel.innerHTML='<div class="storePopupHead">'+
  '<span class="storePopupSymbol" aria-hidden="true">N</span>'+
  '<div class="storePopupTitle"><strong>Netto Le Thor</strong><small>Informations du point de vente</small></div>'+
  '<button type="button" class="storePopupIconBtn" data-store-refresh title="Actualiser depuis Google" aria-label="Actualiser depuis Google">↻</button>'+
  '<button type="button" class="storePopupIconBtn" data-store-close title="Fermer" aria-label="Fermer">×</button>'+
 '</div>'+
 '<div class="storePopupBody">'+
  '<div class="storePopupStatus" data-store-status-pill data-status="unknown"><i aria-hidden="true"></i><div><strong data-store-status>Statut Google indisponible</strong><small data-store-status-info>Ouverture en direct non vérifiée</small></div></div>'+
  '<div class="storePopupLine"><span class="storePopupLineIcon">⌖</span><div><small>Adresse</small><strong data-store-address></strong></div></div>'+
  '<div class="storePopupLine"><span class="storePopupLineIcon">☎</span><div><small>Téléphone</small><a data-store-phone-link><strong data-store-phone></strong></a></div></div>'+
  '<div class="storePopupHours" data-store-hours></div>'+
  '<div class="storePopupBusy"><div><strong>Horaires d’affluence</strong><p>Google ne les partage pas via son API. Consulte la fréquentation directement sur Maps, si elle est disponible.</p></div><a data-store-maps target="_blank" rel="noopener noreferrer">Voir l’affluence ↗</a></div>'+
 '</div>'+
 '<div class="storePopupFoot"><div><small data-store-source></small><small data-store-updated role="status" aria-live="polite"></small></div><div class="storePopupLinks"><a data-store-source-link target="_blank" rel="noopener noreferrer">Source officielle</a><a data-store-maps target="_blank" rel="noopener noreferrer">Ouvrir Maps ↗</a></div></div>';
 document.body.appendChild(panel);
 panel.querySelector('[data-store-close]').addEventListener('click',close);
 panel.querySelector('[data-store-refresh]').addEventListener('click',()=>refresh(true));
 panel.querySelectorAll('[data-store-maps]').forEach(el=>el.href=MAPS_URL);
 popup=panel;fallback();position();
 return popup;
}
function close(){
 if(trigger){trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-controls')}
 trigger=null;revision++;
 if(autoRefresh){clearInterval(autoRefresh);autoRefresh=null}
 if(fallbackClock){clearInterval(fallbackClock);fallbackClock=null}
 popup?.remove();popup=null;pending=null;
}
function toggle(button){
 if(!(button instanceof HTMLElement))return;
 if(trigger===button&&popup?.isConnected){close();return}
 if(popup)close();
 trigger=button;trigger.setAttribute('aria-expanded','true');trigger.setAttribute('aria-controls','nethorDesktopStorePopover');
 ensurePopup();
 if(lastData)render(lastData);
 position();void refresh(false);
 autoRefresh=setInterval(()=>{if(document.visibilityState==='visible')void refresh(false)},120000);
 // Refresh the locally estimated open/closed state at minute boundaries, even offline.
 fallbackClock=setInterval(()=>{
  if(!popup||document.visibilityState!=='visible')return;
  if(!lastData)fallback();
  else if(lastData.open_now!==true&&lastData.open_now!==false
   &&lastData.business_status!=='CLOSED_PERMANENTLY'
   &&lastData.business_status!=='CLOSED_TEMPORARILY')render(lastData);
 },30000);
}
document.addEventListener('pointerdown',event=>{
 if(!popup||!trigger)return;
 if(popup.contains(event.target)||trigger.contains(event.target))return;
 close();
},true);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&popup){const original=trigger;close();original?.focus?.()}});
window.addEventListener('resize',position,{passive:true});
window.addEventListener('scroll',()=>{if(popup)position()},{capture:true,passive:true});
window.addEventListener('netto:profile',()=>{if(popup&&!lastData)void refresh(false)});
window.NethorStoreGoogleCard=Object.freeze({toggle,close,refresh:()=>refresh(true)});
})();