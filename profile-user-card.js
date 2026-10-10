(function(){
'use strict';
window.NethorProfileFeatures=window.NethorProfileFeatures||{};

let active={user:null,opts:null};

function mobileFallbackApi(){
 const shared=window.NethorMobileServices||window.MobileServices;
 if(!shared)return{};
 return{
  client:shared.client,
  session:shared.session,
  roleLabel(role){return({admin:'Administrateur','role_point-de-vente':'Point de vente',responsable:'Responsable',employe:'Employé',lecture:'Lecture seule'})[role]||role||'Compte'},
  paintAvatar(el,url,name,color,frame){
   if(!el)return;
   el.textContent='';el.style.backgroundColor='var(--nethor-profile-avatar-bg,#ff5a2a)';el.style.color='var(--nethor-profile-avatar-fg,#fff)';el.style.backgroundImage='';
   el.classList.toggle('hasPhoto',!!url);
   if(url){el.style.backgroundImage='url("'+String(url).replace(/"/g,'%22')+'")';el.style.backgroundSize='cover';el.style.backgroundPosition='center'}
   else el.textContent=String(name||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('')||'U';
   if(frame)el.dataset.avatarFrame=frame;else delete el.dataset.avatarFrame
  }
 }
}
function api(){return window.NettoProfileUI||mobileFallbackApi()}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function ensureStyle(){
 if(document.querySelector('link[href*="profile-user-card.css"]'))return;
 const link=document.createElement('link');link.rel='stylesheet';link.href='profile-user-card.css?v=1';document.head?.appendChild(link)
}
function historyLabel(value){
 const times=window.NethorConnectionTimes;
 if(times?.relative)return times.relative(value,'activity');
 if(!value)return'Activité non enregistrée';
 const d=new Date(value);
 if(!Number.isFinite(d.getTime()))return'Activité non enregistrée';
 return'Dernière activité le '+d.toLocaleString('fr-FR',{
  timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',year:'numeric',
  hour:'2-digit',minute:'2-digit'
 })
}
function dateStamp(value){
 const time=window.NethorConnectionTimes;
 if(time?.stamp)return time.stamp(value);
 if(!value)return'Date non disponible';
 const d=new Date(value);
 return Number.isFinite(d.getTime())?
  d.toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):
  'Date non disponible'
}
async function connectionRow(userId,{force=false}={}){
 const a=api(),shared=window.NethorConnectionTimes;
 if(!userId||!a.client)return null;
 try{
  if(shared?.load){
   const rows=await shared.load(a.client,{force});
   return rows.find(x=>x.user_id===userId)||null
  }
 }catch(e){console.warn('Fiche utilisateur : historique de connexion indisponible',e)}
 // Offline/legacy fallback does not invent a login timestamp from last activity.
 try{
  const {data,error}=await a.client.from('chat_presence_history')
   .select('last_seen_at').eq('user_id',userId).maybeSingle();
  if(!error)return data?{...data,__partial:true}:null
 }catch(_){}
 return null
}
async function presenceLabel(userId){
 if(!userId)return'Hors ligne';
 if(api().onlineIds?.has?.(userId))return'En ligne';
 const row=await connectionRow(userId);
 return row?.last_seen_at?historyLabel(row.last_seen_at):'Hors ligne'
}
function close(){
 const bg=document.getElementById('nettoUserCardBackdrop');bg?.classList.add('hidden');
 active={user:null,opts:null}
}
async function refreshPresence(){
 const user=active.user,opts=active.opts;
 if(!user)return;
 const current=api();
 const [row,override]=await Promise.all([
  connectionRow(user.id,{force:true}),
  Promise.resolve(typeof opts?.presenceLabel==='function'?opts.presenceLabel(user):opts?.presenceLabel).catch(()=>null)
 ]);
 if(active.user?.id!==user.id)return;
 const online=current.onlineIds?.has?.(user.id)||override==='En ligne';
 const presence=document.getElementById('nettoUserCardPresenceValue'),
  dot=document.getElementById('nettoUserCardPresenceDot');
 if(presence?.lastChild)presence.lastChild.textContent=online?'En ligne':'Hors ligne';
 if(dot)dot.classList.toggle('online',Boolean(online));
 const login=document.getElementById('nettoUserCardLastLogin'),
  activity=document.getElementById('nettoUserCardLastActivity');
 if(login)login.textContent=row?.last_login_at?dateStamp(row.last_login_at):!row||row.__partial?'Indisponible':'Non enregistrée';
 if(activity)activity.textContent=row?.last_seen_at?dateStamp(row.last_seen_at):!row?'Indisponible':'Non enregistrée'
}
function open(user,opts={}){
 if(!user?.id)return;
 ensureStyle();
 const a=api();
 let bg=document.getElementById('nettoUserCardBackdrop');
 if(!bg){
  bg=document.createElement('div');bg.id='nettoUserCardBackdrop';bg.className='nettoUserCardBackdrop hidden';
  bg.innerHTML='<section class="nettoUserCard" role="dialog" aria-modal="true" aria-labelledby="nettoUserCardName"><button class="nettoUserCardClose" type="button" aria-label="Fermer">×</button><div class="nettoUserCardKicker">Fiche utilisateur</div><div id="nettoUserCardContent"></div></section>';
  document.body.appendChild(bg);
  bg.querySelector('.nettoUserCardClose')?.addEventListener('click',close);
  bg.addEventListener('click',e=>{if(e.target===bg)close()})
 }
 const name=user.display_name||user.name||'Utilisateur',self=user.id===a.session?.user?.id,box=document.getElementById('nettoUserCardContent');
 active={user,opts};
 if(!box)return;
 box.innerHTML='<div class="nettoUserCardHero"><div id="nettoUserCardAvatar" class="nettoUserCardAvatar"></div><div><h3 id="nettoUserCardName">'+esc(name)+'</h3></div></div>'+
 '<div class="nettoUserCardFields"><div class="nettoUserCardField"><small>Rôle</small><strong>'+esc(a.roleLabel?.(user.role)||user.role||'Compte')+'</strong></div><div class="nettoUserCardField"><small>Présence</small><strong id="nettoUserCardPresenceValue"><i id="nettoUserCardPresenceDot" class="nettoUserPresenceDot"></i><span>Chargement…</span></strong></div><div class="nettoUserCardField"><small>Dernière connexion · Paris</small><strong id="nettoUserCardLastLogin">Chargement…</strong></div><div class="nettoUserCardField"><small>Dernière activité · Paris</small><strong id="nettoUserCardLastActivity">Chargement…</strong></div></div>'+
 '<button id="nettoUserCardMessage" class="nettoUserCardMessage" type="button" '+(self?'disabled aria-disabled="true" title="Votre propre profil"':'')+'><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3v3l4-3h9a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"/></svg>Envoyer un message</button>';
 const avatar=document.getElementById('nettoUserCardAvatar');
 a.paintAvatar?.(avatar,user.avatar_url||user.avatarUrl||null,name,user.profile_color,user.avatar_frame);
 const message=document.getElementById('nettoUserCardMessage');
 if(message&&!self)message.onclick=()=>{close();if(typeof opts.onMessage==='function')opts.onMessage(user);else location.href=opts.messageUrl||('chat.html?user='+encodeURIComponent(user.id))};
 bg.classList.remove('hidden');void refreshPresence()
}
window.addEventListener('netto:presence',()=>{if(active.user)void refreshPresence()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active.user)close()});

window.NethorProfileFeatures.userCard=Object.freeze({open,close,presenceLabel});
})();
