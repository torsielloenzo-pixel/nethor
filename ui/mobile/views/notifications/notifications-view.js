(function(){
'use strict';

const state={host:null,mounted:false,unsubscribe:null,items:[],search:'',unreadOnly:false,ready:false};

function services(){return window.NethorMobileServices||window.MobileServices||null}
function router(){return window.NethorMobileRouter||window.MobileRouter||null}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function icon(kind){return({
 chat_message:'💬',chat_direct:'💬',chat_group:'💬',chat_general:'💬',admin_message:'📣',app_update:'⬆️',maintenance:'🛠️',
 manual_edit:'🗓️',import_new:'📥',import_replace:'🔄',reset_day:'↩️',reset_week:'↩️',password_reset_request:'🔑',
 absence_request:'🏖️',absence_decision:'✅'
})[kind]||'🔔'}
function notificationVisual(kind){
 const raw=services()?.siteConfig?.platform_ui?.mobile?.notification_visuals?.[kind];
 const node=raw&&typeof raw==='object'?raw:{};
 return{url:String(node.url||'').trim()}
}
function notificationVisualHtml(kind){
 const visual=notificationVisual(kind),body=visual.url
  ?'<img class="npCustomIcon" src="'+esc(visual.url)+'" alt="" draggable="false">'
  :esc(icon(kind));
 return '<div class="npIcon" aria-hidden="true"><span>'+body+'</span></div>'
}
function category(kind){return({
 chat_message:'Message équipe',chat_direct:'Message',chat_group:'Message groupe',chat_general:'Message groupe',admin_message:'Information',
 app_update:'Mise à jour',maintenance:'Maintenance',manual_edit:'Planning modifié',import_new:'Nouveau planning',import_replace:'Planning remplacé',
 reset_day:'Planning',reset_week:'Planning',password_reset_request:'Sécurité',absence_request:'Congés / indisponibilité',absence_decision:'Décision congés'
})[kind]||'Notification'}
function age(value){
 const d=new Date(value),diff=Math.max(0,Date.now()-d.getTime()),min=Math.floor(diff/60000);
 if(min<1)return'À l’instant';if(min<60)return min+' min';
 const h=Math.floor(min/60);if(h<24)return h+' h';
 const days=Math.floor(h/24);if(days<7)return days+' j';
 const weeks=Math.floor(days/7);if(weeks<5)return weeks+' sem.';
 return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})
}
function dayGroup(value){
 const d=new Date(value),now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),day=new Date(d.getFullYear(),d.getMonth(),d.getDate()),diff=Math.round((today-day)/86400000);
 if(diff===0)return"Aujourd’hui";if(diff===1)return"Hier";if(diff<7)return"Cette semaine";return"Plus anciennes"
}
function routeIdForFile(file){
 const table=window.NethorNavigation?.mobileViewTable?.()||{};
 const target=String(file||'').toLowerCase();
 return Object.keys(table).find(id=>String(table[id]||'').split('?')[0].toLowerCase()===target)||''
}
function paramsObject(params){
 const out={};params.forEach((value,key)=>{if(!['view','mobile_preview','nethor_platform'].includes(key))out[key]=value});return out
}
function navigate(raw){
 if(!raw)return;
 try{
  const u=new URL(raw,location.href);
  if(u.origin!==location.origin)return;
  if(u.pathname.includes('/stock-fl/'))u.pathname=u.pathname.replace('/stock-fl/','/nethor/');
  const file=(u.pathname.split('/').pop()||'home.html').toLowerCase(),view=routeIdForFile(file);
  if(view&&router()?.open){router().open(view,{params:paramsObject(u.searchParams),source:'notifications'});return}
  location.assign(u.href)
 }catch(_){}
}
function filtered(){
 const q=state.search.trim().toLowerCase();
 return state.items.filter(n=>(!state.unreadOnly||!n.read_at)&&(!q||String(n.title||'').toLowerCase().includes(q)||String(n.message||'').toLowerCase().includes(q)||category(n.kind).toLowerCase().includes(q)))
  .sort((a,b)=>{const au=!a.read_at?1:0,bu=!b.read_at?1:0;if(au!==bu)return bu-au;return new Date(b.created_at)-new Date(a.created_at)})
}
function shellHtml(){
 return '<div class="nethorNotificationsView">'+
  '<div class="npMobileHead"><div class="npMobileTitle"><h1>Notifications</h1><p>Centre d’activité Nethor</p></div>'+
  '<div class="npFilterTools"><button data-np-action="search-toggle" class="npCircleBtn" type="button" aria-label="Rechercher dans les notifications" title="Rechercher"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.4 15.4 4.3 4.3"/></svg></button>'+
  '<button data-np-action="menu-toggle" class="npCircleBtn more" type="button" aria-label="Options des notifications" aria-expanded="false" title="Options">⋯</button>'+
  '<div class="npTopMenu hidden" data-np-top-menu><button data-np-action="unread-toggle" type="button" data-np-unread-label>Afficher uniquement les non lues</button><button data-np-action="mark-all" type="button">✓ Tout marquer comme lu</button><button data-np-action="delete-all" class="danger" type="button">Supprimer toutes les notifications</button></div></div></div>'+
  '<div class="npFilterLine"><strong data-np-section-title>Nouveau</strong><button data-np-action="unread-toggle" class="npFilterState" type="button" data-np-filter-state>Toutes</button></div>'+
  '<div class="npSearchWrap" data-np-search-wrap><input class="npSearch" data-np-search type="search" placeholder="Rechercher une notification…" autocomplete="off"></div>'+
  '<section class="npList" data-np-list aria-live="polite"></section></div>'
}
function closeMenus(){
 if(!state.host)return;
 state.host.querySelectorAll('.npRowMenu').forEach(x=>x.classList.add('hidden'));
 state.host.querySelector('[data-np-top-menu]')?.classList.add('hidden');
 state.host.querySelector('[data-np-action="menu-toggle"]')?.setAttribute('aria-expanded','false')
}
function render(){
 if(!state.mounted||!state.host)return;
 const list=state.host.querySelector('[data-np-list]');if(!list)return;
 const rows=filtered(),unread=state.items.filter(n=>!n.read_at).length;
 state.host.querySelectorAll('[data-np-filter-state]').forEach(el=>{
  el.textContent=state.unreadOnly?'Non lues ('+unread+')':'Toutes ('+state.items.length+')';
  el.classList.toggle('active',state.unreadOnly)
 });
 state.host.querySelectorAll('[data-np-unread-label]').forEach(el=>el.textContent=state.unreadOnly?'Afficher toutes les notifications':'Afficher uniquement les non lues');
 const title=state.host.querySelector('[data-np-section-title]');if(title)title.textContent=state.unreadOnly?'Non lues':(unread?'Nouveau':'Notifications');
 if(!state.ready){
  list.innerHTML='<div class="npEmpty"><div><div class="npEmptyIcon">🔔</div><strong>Chargement…</strong><span>Récupération de tes notifications.</span></div></div>';return
 }
 if(!rows.length){
  const unverified=!state.search&&window.NethorMobileSync?.active&&window.NethorMobileSync?.statusOf?.('notifications')!=='fresh';
  list.innerHTML='<div class="npEmpty"><div><div class="npEmptyIcon">'+(unverified?'!':state.search?'⌕':'✓')+'</div><strong>'+(unverified?'Notifications non vérifiées':state.search?'Aucun résultat':'Aucune notification')+'</strong><span>'+(unverified?'La dernière liste disponible ne permet pas de confirmer qu’il n’y a aucun message.':state.search?'Essaie avec un autre terme.':'Tu as tout consulté pour le moment.')+'</span></div></div>';return
 }
 let previous='',html='';
 for(const n of rows){
  const group=!n.read_at?'Nouveau':dayGroup(n.created_at);
  if(group!==previous){html+='<div class="npGroup">'+esc(group)+'</div>';previous=group}
  html+='<article class="npRow '+(!n.read_at?'unread':'')+'" data-np-id="'+esc(n.id)+'" data-np-url="'+esc(n.target_url||'')+'" tabindex="0" role="button">'+
   notificationVisualHtml(n.kind)+
   '<div class="npRowText"><div class="npSentence"><b>'+esc(n.title||'Notification')+'</b> '+esc(n.message||'')+'</div>'+
   '<div class="npMeta">'+(!n.read_at?'<i class="npUnreadDot" aria-hidden="true"></i>':'')+'<span class="npCategory">'+esc(category(n.kind))+'</span><span class="npAge">'+esc(age(n.created_at))+'</span></div></div>'+
   '<button class="npRowMore" data-np-action="row-menu" type="button" aria-label="Options de cette notification" aria-expanded="false">⋯</button>'+
   '<div class="npRowMenu hidden">'+(!n.read_at?'<button data-np-action="read" type="button">Marquer comme lu</button>':'')+'<button data-np-action="open" type="button">Ouvrir</button><button data-np-action="delete" class="danger" type="button">Supprimer</button></div></article>'
 }
 list.innerHTML=html
}
async function markRead(id){
 if(!id||navigator.onLine===false)return;
 await services()?.markNotificationRead?.(id)
}
async function openRow(row){
 if(navigator.onLine===false)return;
 const id=row?.dataset?.npId;if(id)await markRead(id);
 const raw=row?.dataset?.npUrl||'';if(raw)navigate(raw)
}
async function deleteOne(id){
 if(!id||navigator.onLine===false)return;
 try{await services()?.deleteNotification?.(id)}catch(error){console.error('[Nethor NotificationsView] delete',error)}
}
async function markAll(){
 if(navigator.onLine===false)return;
 try{await services()?.markAllNotificationsRead?.()}catch(error){console.error('[Nethor NotificationsView] mark all',error)}
}
async function deleteAll(){
 if(navigator.onLine===false||!state.items.length)return;
 if(!confirm('Supprimer toutes tes notifications ?'))return;
 try{await services()?.deleteAllNotifications?.()}catch(error){console.error('[Nethor NotificationsView] delete all',error)}
}
function onClick(event){
 const actionButton=event.target?.closest?.('[data-np-action]');
 if(!actionButton){
  const row=event.target?.closest?.('.npRow');
  if(row){void openRow(row)}
  else if(!event.target?.closest?.('.npTopMenu,.npRowMenu,.npRowMore'))closeMenus();
  return
 }
 const action=actionButton.dataset.npAction;
 if(action==='search-toggle'){
  const wrap=state.host.querySelector('[data-np-search-wrap]');wrap?.classList.toggle('open');
  if(wrap?.classList.contains('open'))setTimeout(()=>state.host?.querySelector('[data-np-search]')?.focus(),30);
  return
 }
 if(action==='menu-toggle'){
  event.stopPropagation();const menu=state.host.querySelector('[data-np-top-menu]'),open=menu?.classList.contains('hidden');
  closeMenus();menu?.classList.toggle('hidden',!open);actionButton.setAttribute('aria-expanded',String(open));return
 }
 if(action==='unread-toggle'){state.unreadOnly=!state.unreadOnly;closeMenus();render();return}
 if(action==='mark-all'){closeMenus();void markAll();return}
 if(action==='delete-all'){closeMenus();void deleteAll();return}
 const row=actionButton.closest('.npRow');if(!row)return;
 if(action==='row-menu'){
  event.preventDefault();event.stopPropagation();const menu=row.querySelector('.npRowMenu'),open=menu?.classList.contains('hidden');
  closeMenus();menu?.classList.toggle('hidden',!open);actionButton.setAttribute('aria-expanded',String(open));return
 }
 event.preventDefault();event.stopPropagation();closeMenus();
 if(action==='read')void markRead(row.dataset.npId);
 else if(action==='open')void openRow(row);
 else if(action==='delete')void deleteOne(row.dataset.npId)
}
function onKeyDown(event){
 const row=event.target?.closest?.('.npRow');if(!row||event.target?.closest?.('.npRowMore,.npRowMenu'))return;
 if(event.key==='Enter'||event.key===' '){event.preventDefault();void openRow(row)}
}
function onInput(event){
 if(event.target?.matches?.('[data-np-search]')){state.search=event.target.value||'';render()}
}
function onServices(detail){
 if(!state.mounted)return;
 if(detail?.type==='notifications'||detail?.type==='core'||detail?.type==='ready'||detail?.type==='snapshot'){
  state.items=[...(detail.notifications||services()?.notifications||[])];
  state.ready=true;render()
 }
}
async function mount(host){
 state.host=host;state.mounted=true;state.search='';state.unreadOnly=false;state.ready=false;state.items=[];
 host.innerHTML=shellHtml();
 host.addEventListener('click',onClick);
 host.addEventListener('keydown',onKeyDown);
 host.addEventListener('input',onInput);
 render();
 const shared=services();await shared?.ready?.();
 if(!state.mounted)return false;
 state.items=[...(shared?.notifications||[])];state.ready=true;
 state.unsubscribe=shared?.subscribe?.(onServices,{immediate:false})||null;
 render();
 return true
}
async function unmount(){
 state.mounted=false;
 if(typeof state.unsubscribe==='function')state.unsubscribe();
 state.unsubscribe=null;
 if(state.host){
  state.host.removeEventListener('click',onClick);
  state.host.removeEventListener('keydown',onKeyDown);
  state.host.removeEventListener('input',onInput);
  state.host.innerHTML=''
 }
 state.host=null;state.items=[];state.search='';state.unreadOnly=false;state.ready=false;
 return true
}

const api=Object.freeze({mount,unmount,render,navigate});
window.NethorMobileNotificationsView=api;
router()?.register?.('notifications',api);
})();